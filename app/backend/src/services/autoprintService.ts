import { randomUUID } from 'crypto';
import { CONFIG } from '../config/environment';
import { PrintJobRequest, PrintJobResponse, PrintJobRow, CanonicalPrintSettings, AppError } from '../types';
import { jobRepository } from '../database/repositories/jobRepository';
import { verificationRepository } from '../database/repositories/verificationRepository';
import { VerificationService } from './verificationService';
import { StorageService } from './storageService';
import { PdfOverlayService } from './pdfOverlayService';
import { PrinterService } from './printerService';
import { auditLogger } from '../utils/auditLogger';
import { logTrace, generateTraceId } from '../utils/traceLogger';

export class AutoPrintService {
  /**
   * Resolves canonical print settings from incoming request, supporting both
   * structured printSettings and legacy specs fields with safe defaults.
   */
  public static resolveCanonicalPrintSettings(request: PrintJobRequest): CanonicalPrintSettings {
    const raw = request.printSettings || {};
    const specs = request.specs || ({} as any);

    // 1. Paper Format
    let paperFormat: any = raw.paperFormat;
    if (!paperFormat) {
      const pSize = (specs.paperSize || 'a4').toLowerCase().trim();
      if (pSize === 'a3') paperFormat = 'A3';
      else if (pSize === 'letter') paperFormat = 'Letter';
      else if (pSize === 'legal') paperFormat = 'Legal';
      else if (pSize === 'receipt_80mm' || pSize === '80mm') paperFormat = '80mm';
      else paperFormat = 'A4';
    }
    const validFormats = ['A4', 'A3', 'Letter', 'Legal', '80mm'];
    if (!validFormats.includes(paperFormat)) {
      paperFormat = 'A4';
    }

    // 2. Orientation
    let orientation: any = raw.orientation;
    if (orientation !== 'portrait' && orientation !== 'landscape') {
      orientation = 'portrait';
    }

    // 3. Color Mode
    let colorMode: any = raw.colorMode;
    if (colorMode === 'bw') colorMode = 'black_and_white';
    if (colorMode !== 'black_and_white' && colorMode !== 'color') {
      const legacyColor = (specs.colorMode || 'bw').toLowerCase().trim();
      colorMode = legacyColor === 'color' ? 'color' : 'black_and_white';
    }

    // 4. Copies
    let copies = raw.copies ? Number(raw.copies) : Number(specs.copies || 1);
    if (!Number.isFinite(copies) || copies <= 0) copies = 1;
    copies = Math.floor(copies);

    // 5. Duplex
    let duplex = false;
    if (typeof raw.duplex === 'boolean') {
      duplex = raw.duplex;
    } else {
      duplex = specs.duplex === 'double' || (specs.duplex as any) === 'true';
    }

    // 6. Page Range
    const pageRange = String(raw.pageRange || specs.pageRange || 'all').trim();

    return {
      paperFormat,
      orientation,
      colorMode,
      copies,
      duplex,
      pageRange,
    };
  }

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
    fileBuffer?: Buffer,
    traceId?: string
  ): Promise<PrintJobResponse> {
    const activeTraceId = traceId || request.traceId || generateTraceId();
    if (!request.fileName || !request.amountMinorUnits || request.amountMinorUnits <= 0) {
      throw new AppError('Invalid print job submission payload. File name and valid positive amount are required.', 400);
    }

    const id = `AP-${randomUUID().slice(0, 8).toUpperCase()}`;
    const jobNo = jobRepository.getNextJobNumber();
    const canonicalSettings = this.resolveCanonicalPrintSettings(request);
    const copies = canonicalSettings.copies;
    const colorMode = canonicalSettings.colorMode === 'color' ? 'color' : 'bw';
    const title = `${request.fileName} (${copies} copies, ${canonicalSettings.paperFormat}, ${colorMode})`;
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
      page_range: canonicalSettings.pageRange,
      paper_size: canonicalSettings.paperFormat.toLowerCase(),
      duplex: canonicalSettings.duplex ? 'double' : 'single',
      finishing: request.specs?.finishing || 'none',
      print_settings_json: JSON.stringify(canonicalSettings),
      amount_minor_units: request.amountMinorUnits,
      currency: currency,
      payment_method: request.paymentMethod,
      status: 'QUEUED',
    });

    logTrace(activeTraceId, 'JOB_SAVED', `Job ${id} inserted into SQLite database`, {
      databasePath: CONFIG.PATHS.DB_FILE,
      jobId: id,
      jobNo,
      status: 'QUEUED',
    });

    // 3. Create verification record (includes unique 8-digit code + HMAC)
    const verification = VerificationService.createVerificationRecord(id, jobNo, request);

    logTrace(activeTraceId, 'JOB_DATABASE_ID_CREATED', `Verification code generated for job ${id}`, {
      jobId: id,
      jobNo,
      verificationCode: verification.verificationCode,
    });

    this.recordStatusTransition(id, null, 'QUEUED', 'CUSTOMER_TERMINAL', 'Initial job submission');

    console.log(`[JOB CREATED] Job ID: ${id} | Customer: ${jobRow.customer_name} | Code: ${verification.verificationCode} | Status: QUEUED | Backend Port: ${CONFIG.PORT} | DB: ${CONFIG.PATHS.DB_FILE} | Time: ${new Date().toISOString()}`);

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
        backendPort: CONFIG.PORT,
        databasePath: CONFIG.PATHS.DB_FILE,
        traceId: activeTraceId,
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

  public static recordStatusTransition(
    jobId: string,
    previousStatus: string | null,
    newStatus: string,
    actor: string = 'SYSTEM_AUTOPRINT',
    reason?: string,
    paymentId?: string,
    ticketId?: string
  ): void {
    const db = require('../database/db').getDb();
    const id = `HIST-${randomUUID()}`;
    db.prepare(`
      INSERT INTO print_job_status_history (id, job_id, previous_status, new_status, actor, reason, payment_id, ticket_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(id, jobId, previousStatus, newStatus, actor, reason || null, paymentId || null, ticketId || null);
  }

  public static getStatusHistory(jobId: string): any[] {
    const db = require('../database/db').getDb();
    return db.prepare('SELECT * FROM print_job_status_history WHERE job_id = ? ORDER BY created_at ASC').all(jobId);
  }

  public static updateJobStatus(
    id: string,
    status: any,
    actor: string = 'MERCHANT',
    reason?: string,
    traceId?: string
  ): PrintJobResponse | null {
    const existing = jobRepository.getById(id);
    if (!existing) return null;

    jobRepository.updateStatus(id, status);
    this.recordStatusTransition(id, existing.status, status, actor, reason);

    const activeTraceId = traceId || generateTraceId();
    logTrace(activeTraceId, 'JOB_PAYMENT_STATUS_UPDATED', `Job ${id} status updated to ${status}`, {
      jobId: id,
      previousStatus: existing.status,
      newStatus: status,
      actor,
      reason,
    });

    return this.getJobById(id);
  }

  /**
   * Payment Reconciliation: Flag a job as PAYMENT_REVIEW_REQUIRED
   */
  public static flagPaymentReviewRequired(
    jobId: string,
    paymentId: string,
    reason: string,
    actor: 'PAYMENT_GATEWAY' | 'SYSTEM_AUTOPRINT' | 'STAFF_TERMINAL' | 'CUSTOMER_TERMINAL' | 'MERCHANT' | 'CUSTOMER' = 'PAYMENT_GATEWAY'
  ): PrintJobResponse | null {
    const job = jobRepository.getById(jobId);
    if (!job) return null;

    jobRepository.updateStatus(jobId, 'PAYMENT_REVIEW_REQUIRED');
    this.recordStatusTransition(jobId, job.status, 'PAYMENT_REVIEW_REQUIRED', actor, reason, paymentId);

    auditLogger.logEvent({
      verificationCode: 'RECONCILIATION',
      jobId,
      jobNo: job.job_no,
      action: 'PAYMENT_REVIEW_REQUIRED',
      actor,
      details: {
        paymentId,
        reason,
      },
    });

    return this.getJobById(jobId);
  }

  public static deleteJob(id: string): void {
    jobRepository.delete(id);
  }

  public static normalizePrintSettings(row: PrintJobRow): CanonicalPrintSettings {
    if (row.print_settings_json) {
      try {
        const parsed = JSON.parse(row.print_settings_json);
        if (parsed && typeof parsed === 'object') {
          let paperFormat: any = parsed.paperFormat;
          if (!paperFormat) {
            const legacySize = (row.paper_size || '').toLowerCase().trim();
            if (legacySize === 'a3') paperFormat = 'A3';
            else if (legacySize === 'letter') paperFormat = 'Letter';
            else if (legacySize === 'legal') paperFormat = 'Legal';
            else if (legacySize === 'receipt_80mm' || legacySize === '80mm') paperFormat = '80mm';
            else paperFormat = 'A4';
          }
          const validFormats = ['A4', 'A3', 'Letter', 'Legal', '80mm'];
          if (!validFormats.includes(paperFormat)) {
            paperFormat = 'A4';
          }

          let colorMode: any = parsed.colorMode;
          if (colorMode === 'bw') colorMode = 'black_and_white';
          if (colorMode !== 'black_and_white' && colorMode !== 'color') {
            colorMode = (row.color_mode || '').toLowerCase().trim() === 'color' ? 'color' : 'black_and_white';
          }

          let orientation: any = parsed.orientation;
          if (orientation !== 'portrait' && orientation !== 'landscape') {
            orientation = 'portrait';
          }

          const copies = Number(parsed.copies) > 0 ? Math.floor(Number(parsed.copies)) : (Number(row.copies) > 0 ? Number(row.copies) : 1);
          const duplex = Boolean(parsed.duplex);
          const pageRange = String(parsed.pageRange || row.page_range || 'all');

          return {
            paperFormat,
            orientation,
            colorMode,
            copies,
            duplex,
            pageRange,
          };
        }
      } catch (err) {
        console.warn(`[PRINT_SETTINGS] Failed to parse print_settings_json for job ${row.id}:`, err);
      }
    }

    // Fallback: build from existing row columns
    const legacySize = (row.paper_size || 'a4').toLowerCase().trim();
    let format: any = 'A4';
    if (legacySize === 'a3') format = 'A3';
    else if (legacySize === 'letter') format = 'Letter';
    else if (legacySize === 'legal') format = 'Legal';
    else if (legacySize === 'receipt_80mm' || legacySize === '80mm') format = '80mm';

    const colorMode = (row.color_mode || 'bw').toLowerCase().trim() === 'color' ? 'color' : 'black_and_white';
    const duplex = row.duplex === 'double' || row.duplex === 'true';
    const copies = Number(row.copies) > 0 ? Number(row.copies) : 1;
    const pageRange = row.page_range || 'all';

    return {
      paperFormat: format,
      orientation: 'portrait',
      colorMode,
      copies,
      duplex,
      pageRange,
    };
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
      printSettings: this.normalizePrintSettings(row),
      verification,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}