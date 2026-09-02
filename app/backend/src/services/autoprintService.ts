import { randomUUID } from 'crypto';
import { CONFIG } from '../config/environment';
import { PrintJobRequest, PrintJobResponse, PrintJobRow, AppError } from '../types';
import { jobRepository } from '../database/repositories/jobRepository';
import { verificationRepository } from '../database/repositories/verificationRepository';
import { VerificationService } from './verificationService';
import { StorageService } from './storageService';
import { PdfOverlayService } from './pdfOverlayService';
import { PrinterService } from './printerService';
import { auditLogger } from '../utils/auditLogger';

export class AutoPrintService {
  /**
   * Submits a print job into the system:
   * 1. Generates unique collision-safe Job ID
   * 2. Persists uploaded file
   * 3. Creates job record in SQLite database (so FK constraints are satisfied)
   * 4. Creates 8-digit verification record with HMAC checksum
   * 5. Overlays physical verification stamp on final page of PDF
   * 6. Dispatches to printer subsystem
   */
  public static async submitJob(
    request: PrintJobRequest,
    fileBuffer?: Buffer
  ): Promise<PrintJobResponse> {
    if (!request.fileName || !request.amountMinorUnits || request.amountMinorUnits <= 0) {
      throw new AppError('Invalid print job submission payload. File name and valid positive amount are required.', 400);
    }

    const id = `AP-${randomUUID().slice(0, 8).toUpperCase()}`;
    const jobNo = jobRepository.getNextJobNumber();
    const copies = request.specs?.copies || 1;
    const colorMode = request.specs?.colorMode || 'bw';
    const title = `${request.fileName} (${copies} copies, ${colorMode})`;
    const currency = request.currency || CONFIG.CURRENCY;

    // 1. Save uploaded file if buffer is provided
    let uploadedFilePath = '';
    if (fileBuffer && fileBuffer.length > 0) {
      const saved = StorageService.saveUploadedFile(id, fileBuffer, request.fileName);
      uploadedFilePath = saved.absolutePath;

      auditLogger.logEvent({
        verificationCode: 'PENDING',
        jobId: id,
        jobNo,
        action: 'FILE_UPLOADED',
        actor: 'CUSTOMER_TERMINAL',
        details: {
          fileName: request.fileName,
          sizeBytes: saved.sizeBytes,
          storageName: saved.fileName,
        },
      });
    }

    // 2. Create Job in Database FIRST (so verification foreign key is satisfied)
    const jobRow = jobRepository.create({
      id,
      job_no: jobNo,
      title,
      file_name: request.fileName,
      file_path: uploadedFilePath,
      processed_file_path: null,
      customer_name: request.customerName || 'Walk-In Customer',
      customer_phone: request.customerPhone || null,
      printer_id: request.printerId || null,
      printer_name: request.printerName || 'AutoPrint Spooler',
      color_mode: colorMode,
      copies: copies,
      page_range: request.specs?.pageRange || 'all',
      paper_size: request.specs?.paperSize || 'a4',
      duplex: request.specs?.duplex || 'single',
      finishing: request.specs?.finishing || 'none',
      amount_minor_units: request.amountMinorUnits,
      currency: currency,
      payment_method: request.paymentMethod,
      status: 'QUEUED',
    });

    // 3. Create verification record (includes unique 8-digit code + HMAC)
    const verification = VerificationService.createVerificationRecord(id, jobNo, request);

    auditLogger.logEvent({
      verificationCode: verification.verificationCode,
      jobId: id,
      jobNo,
      action: 'JOB_CREATED',
      actor: 'CUSTOMER_TERMINAL',
      details: {
        jobNo,
        title,
        amountMinorUnits: request.amountMinorUnits,
        currency,
        printerName: jobRow.printer_name,
      },
    });

    // 4. Process PDF watermarking on final page
    let processedFilePath: string | null = null;
    try {
      const watermarkResult = await PdfOverlayService.embedVerificationStamp(
        id,
        fileBuffer || null,
        verification.verificationCode,
        verification.formattedCode,
        verification.securityChecksum
      );
      processedFilePath = watermarkResult.processedFilePath;
      jobRepository.updateProcessedFilePath(id, processedFilePath);

      auditLogger.logEvent({
        verificationCode: verification.verificationCode,
        jobId: id,
        jobNo,
        action: 'DOCUMENT_EMBEDDED',
        actor: 'SYSTEM_AUTOPRINT',
        details: {
          processedFile: watermarkResult.processedFileName,
          pageCount: watermarkResult.pageCount,
          stampFormat: 'OCR_WATERMARK_FINAL_PAGE',
        },
      });
    } catch (err: any) {
      console.error(`[AUTOPRINT] Watermarking error for job ${id}:`, err);
    }

    // 5. Dispatch print job to spooler subsystem
    if (processedFilePath) {
      PrinterService.dispatchPrintJob(
        id,
        jobNo,
        verification.verificationCode,
        processedFilePath,
        jobRow.printer_name
      ).catch((err) => console.warn(`[PRINTER] Background dispatch error:`, err));
    }

    return this.mapRowToResponse(jobRow, verification);
  }

  /**
   * Retrieves all print jobs sorted newest first.
   */
  public static getAllJobs(): PrintJobResponse[] {
    const rows = jobRepository.getAll();
    return rows.map((row) => {
      const verification = verificationRepository.getByJobId(row.id) ?? undefined;
      return this.mapRowToResponse(row, verification);
    });
  }

  /**
   * Retrieves a specific print job by ID.
   */
  public static getJobById(id: string): PrintJobResponse | null {
    const row = jobRepository.getById(id);
    if (!row) return null;
    const verification = verificationRepository.getByJobId(row.id) ?? undefined;
    return this.mapRowToResponse(row, verification);
  }

  private static mapRowToResponse(
    row: PrintJobRow,
    verification?: any
  ): PrintJobResponse {
    return {
      id: row.id,
      jobNo: row.job_no,
      title: row.title,
      fileName: row.file_name,
      customerName: row.customer_name,
      printerName: row.printer_name,
      status: row.status,
      amountTotal: +(row.amount_minor_units / 100).toFixed(2),
      currency: row.currency,
      verification,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}