import fs from 'fs';
import crypto, { randomUUID } from 'crypto';
import { CONFIG } from '../config/environment';
import { PrintJobRequest, PrintJobResponse, PrintJobRow, CanonicalPrintSettings, AppError, PrintJobStatus } from '../types';
import { jobRepository } from '../database/repositories/jobRepository';
import { verificationRepository } from '../database/repositories/verificationRepository';
import { LocalPrintJobRepository } from '../database/repositories/localPrintJobRepository';
import { VerificationService } from './verificationService';
import { StorageService } from './storageService';
import { PdfOverlayService } from './pdfOverlayService';
import { PrinterService } from './printerService';
import { auditLogger } from '../utils/auditLogger';
import { logTrace, generateTraceId } from '../utils/traceLogger';
import { generateSecureVerificationCode } from '../utils/crypto';
import { MerchantRepository } from '../database/repositories/merchantRepository';
import { TransportManager } from './transport/transportManager';
import { SupabaseAdminClient } from './supabase/supabaseAdminClient';
import { InstallationIdentityRepository } from '../database/repositories/installationIdentityRepository';

async function updateScopedCloudJobStatus(jobId: string, status: string, fields: Record<string, unknown> = {}): Promise<void> {
  const client = SupabaseAdminClient.getClient();
  const identity = InstallationIdentityRepository.get();
  if (!client || !identity) return;

  const { error } = await client.from('print_jobs').update({ status, ...fields })
    .eq('job_id', jobId)
    .eq('merchant_id', identity.merchant_id)
    .or(`device_id.is.null,device_id.eq.${identity.device_id}`);
  if (error) throw error;
}

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
    const customerAccessToken = crypto.randomBytes(32).toString('hex');
    const customerAccessTokenHash = crypto.createHash('sha256').update(customerAccessToken).digest('hex');
    const jobNo = jobRepository.getNextJobNumber();
    const canonicalSettings = this.resolveCanonicalPrintSettings(request);
    const copies = canonicalSettings.copies;
    const colorMode = canonicalSettings.colorMode === 'color' ? 'color' : 'bw';
    const title = `${request.fileName} (${copies} copies, ${canonicalSettings.paperFormat}, ${colorMode})`;
    const currency = request.currency || CONFIG.CURRENCY;

    const isCash = request.paymentMethod === 'CASH';
    const initialStatus: PrintJobStatus = isCash ? 'AWAITING_CASH_CONFIRMATION' : 'PAYMENT_PENDING';
    const initialPaymentStatus = isCash ? 'AWAITING_CASH_CONFIRMATION' : 'PAYMENT_PENDING';
    const initialPrintStatus = 'AWAITING_PAYMENT';

    // 1. Generate unique 8-digit verification code with DB collision retry
    let codeData = generateSecureVerificationCode();
    let retries = 0;
    while (verificationRepository.codeExists(codeData.raw) && retries < 10) {
      codeData = generateSecureVerificationCode();
      retries++;
    }

    // 2. Save uploaded file if buffer is provided or storagePath is given
    let uploadedFilePath = '';
    if (fileBuffer && fileBuffer.length > 0) {
      const saved = StorageService.saveUploadedFile(id, fileBuffer, request.fileName);
      uploadedFilePath = saved.absolutePath;

      auditLogger.logEvent({
        verificationCode: codeData.raw,
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
    } else if (request.storagePath) {
      uploadedFilePath = request.storagePath;
      auditLogger.logEvent({
        verificationCode: codeData.raw,
        jobId: id,
        jobNo,
        action: 'FILE_UPLOADED',
        actor: 'CUSTOMER_TERMINAL',
        details: {
          fileName: request.fileName,
          storagePath: request.storagePath,
        },
      });
    }

    // 3. Create Job in Database FIRST (so verification foreign key is satisfied)
    const jobRow = jobRepository.create({
      id,
      job_no: jobNo,
      title,
      file_name: request.fileName,
      file_path: uploadedFilePath,
      file_hash: request.fileHash || null,
      customer_access_token_hash: customerAccessTokenHash,
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
      payment_status: initialPaymentStatus,
      print_status: initialPrintStatus,
      pickup_code: codeData.raw,
      status: initialStatus,
    });

    logTrace(activeTraceId, 'JOB_SAVED', `Job ${id} inserted into SQLite database`, {
      databasePath: CONFIG.PATHS.DB_FILE,
      jobId: id,
      jobNo,
      status: initialStatus,
      paymentStatus: initialPaymentStatus,
    });

    // 4. Create verification record (includes unique 8-digit code + HMAC)
    const verification = VerificationService.createVerificationRecord(id, jobNo, request, codeData);

    logTrace(activeTraceId, 'JOB_DATABASE_ID_CREATED', `Verification code generated for job ${id}`, {
      jobId: id,
      jobNo,
      verificationCode: verification.verificationCode,
    });

    this.recordStatusTransition(id, null, initialStatus, 'CUSTOMER_TERMINAL', 'Initial job submission');

    console.log(`[JOB CREATED] Job ID: ${id} | Customer: ${jobRow.customer_name} | Code: ${verification.verificationCode} | Status: ${initialStatus} | Backend Port: ${CONFIG.PORT} | DB: ${CONFIG.PATHS.DB_FILE} | Time: ${new Date().toISOString()}`);

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

    // 5. Process PDF watermarking on final page (so print document is ready immediately when paid)
    let processedFilePath: string | null = null;
    try {
      let bufferToProcess = fileBuffer;
      if ((!bufferToProcess || bufferToProcess.length === 0) && uploadedFilePath && fs.existsSync(uploadedFilePath)) {
        bufferToProcess = fs.readFileSync(uploadedFilePath);
      }

      const watermarkResult = await PdfOverlayService.embedVerificationStamp(
        id,
        bufferToProcess || null,
        verification.verificationCode,
        verification.formattedCode,
        verification.securityChecksum,
        {
          originalFileName: request.fileName,
          mimeType: request.mimeType,
          orientation: canonicalSettings.orientation,
          paperFormat: canonicalSettings.paperFormat,
          addVerificationPage: !MerchantRepository.parseStructuredRates(MerchantRepository.getPrimaryMerchant()!).skipVerificationPage,
        }
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

    // NOTE: Print is NOT dispatched here.
    // Printing is strictly decoupled from job creation and will only be triggered after payment confirmation.

    return { ...this.mapRowToResponse(jobRow, verification), customerAccessToken };
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

  /**
   * Confirms cash payment received by merchant at the counter.
   * Transitions job to PAID/QUEUED and triggers print execution idempotently.
   */
  public static async confirmCashPayment(
    jobId: string,
    staffId = 'STAFF-01',
    staffName = 'Duty Station Cashier',
    tenderedMinorUnits?: number
  ): Promise<PrintJobResponse> {
    const job = jobRepository.getById(jobId);
    if (!job) {
      throw new AppError(`Print job not found: ${jobId}`, 404);
    }

    if (job.payment_status === 'PAID') {
      return this.getJobById(jobId)!;
    }

    const previousStatus = job.status;
    const txnId = `CASH-${Date.now()}`;
    jobRepository.markPaid(jobId, txnId);

    this.recordStatusTransition(
      jobId,
      previousStatus,
      'QUEUED',
      staffName,
      `Cash payment confirmed by staff ${staffName} (${staffId})`,
      txnId
    );

    auditLogger.logEvent({
      verificationCode: job.pickup_code || 'CASH',
      jobId: job.id,
      jobNo: job.job_no,
      action: 'CASH_COLLECTION_COMPLETED',
      actor: 'STAFF_TERMINAL',
      staffId,
      staffName,
      details: {
        jobNo: job.job_no,
        amountMinorUnits: job.amount_minor_units,
        tenderedMinorUnits: tenderedMinorUnits || job.amount_minor_units,
      },
    });

    const ver = verificationRepository.getByJobId(jobId);
    if (ver && ver.paymentStatus !== 'CASH_COLLECTED') {
      const tendered = tenderedMinorUnits || job.amount_minor_units;
      verificationRepository.updateCashCollected({
        code: ver.verificationCode,
        tenderedMinorUnits: tendered,
        changeMinorUnits: Math.max(0, tendered - job.amount_minor_units),
        staffId,
        staffName,
      });
    }

    // Execute print job idempotently
    await this.executePrintJob(jobId);

    return this.getJobById(jobId)!;
  }

  /**
   * Confirms digital payment (UPI / Gateway) verification.
   * Transitions job to PAID/QUEUED and triggers print execution idempotently.
   */
  public static async confirmDigitalPayment(
    jobId: string,
    transactionId: string,
    payerVpa?: string
  ): Promise<PrintJobResponse> {
    const job = jobRepository.getById(jobId);
    if (!job) {
      throw new AppError(`Print job not found: ${jobId}`, 404);
    }

    if (job.payment_status === 'PAID') {
      return this.getJobById(jobId)!;
    }

    const previousStatus = job.status;
    jobRepository.markPaid(jobId, transactionId);

    this.recordStatusTransition(
      jobId,
      previousStatus,
      'QUEUED',
      'PAYMENT_GATEWAY',
      `UPI digital payment confirmed (Txn: ${transactionId})`,
      transactionId
    );

    auditLogger.logEvent({
      verificationCode: job.pickup_code || 'UPI',
      jobId: job.id,
      jobNo: job.job_no,
      action: 'UPI_PAYMENT_CONFIRMED',
      actor: 'PAYMENT_GATEWAY',
      details: {
        jobNo: job.job_no,
        amountMinorUnits: job.amount_minor_units,
        gatewayRef: transactionId,
        vpa: payerVpa,
      },
    });

    const ver = verificationRepository.getByJobId(jobId);
    if (ver && ver.paymentStatus !== 'UPI_SUCCESS') {
      verificationRepository.updatePaymentSuccess({
        code: ver.verificationCode,
        upiTransactionId: transactionId,
        upiPayerVpa: payerVpa,
      });
    }

    // Execute print job idempotently
    await this.executePrintJob(jobId);

    return this.getJobById(jobId)!;
  }

  /**
   * Executes print job dispatching idempotently.
   * Ensures only jobs with payment_status = 'PAID' can be claimed and printed.
   */
  public static async executePrintJob(jobId: string): Promise<PrintJobResponse | null> {
    const claimed = jobRepository.claimForPrinting(jobId);
    if (!claimed) {
      return this.getJobById(jobId);
    }

    const job = jobRepository.getById(jobId);
    if (!job) return null;

    this.recordStatusTransition(jobId, 'QUEUED', 'PRINTING', 'SYSTEM_AUTOPRINT', 'Print execution claimed by spooler');

    const verification = verificationRepository.getByJobId(jobId);
    const code = verification?.verificationCode || job.pickup_code || 'PENDING';
    const printSettings = this.normalizePrintSettings(job);

    let localSourcePath = job.file_path;
    if (job.file_path && (!fs.existsSync(job.file_path) || job.file_path.startsWith('print-documents/') || job.file_path.startsWith('printJobs/'))) {
      try {
        this.recordStatusTransition(jobId, job.status, 'DOWNLOADING', 'SYSTEM_AUTOPRINT', 'Downloading document from cloud storage');
        jobRepository.updateStatus(jobId, 'DOWNLOADING' as any);
        LocalPrintJobRepository.updateStatus(jobId, 'DOWNLOADING');

        if (SupabaseAdminClient.isConfigured()) {
          try {
            await updateScopedCloudJobStatus(jobId, 'DOWNLOADING');
          } catch {}
        }

        const transport = TransportManager.getTransport();
        const downloadedBuffer = await transport.downloadDocument(job.file_path);

        // SHA-256 File Hash Integrity Verification
        if (job.file_hash) {
          const actualHash = crypto.createHash('sha256').update(downloadedBuffer).digest('hex').toLowerCase();
          const expectedHash = job.file_hash.trim().toLowerCase();
          if (actualHash !== expectedHash) {
            console.error(`[EXECUTE_PRINT] SHA-256 hash mismatch for job ${jobId}! Expected: ${expectedHash}, Actual: ${actualHash}`);
            this.recordStatusTransition(jobId, 'DOWNLOADING', 'FILE_VERIFICATION_FAILED', 'SYSTEM_AUTOPRINT', `SHA-256 integrity mismatch. Expected ${expectedHash}, got ${actualHash}`);
            jobRepository.updateStatus(jobId, 'FILE_VERIFICATION_FAILED' as any);
            LocalPrintJobRepository.updateStatus(jobId, 'FILE_VERIFICATION_FAILED', `SHA-256 mismatch (expected ${expectedHash}, got ${actualHash})`);
            if (SupabaseAdminClient.isConfigured()) {
              try {
                await updateScopedCloudJobStatus(jobId, 'FILE_VERIFICATION_FAILED', { error_message: 'File integrity verification failed (SHA-256 mismatch).' });
              } catch {}
            }
            return this.getJobById(jobId);
          }
          console.log(`[EXECUTE_PRINT] SHA-256 hash verified for job ${jobId}: ${actualHash} (MATCH)`);
        }

        this.recordStatusTransition(jobId, 'DOWNLOADING', 'FILE_READY', 'SYSTEM_AUTOPRINT', 'Document downloaded and verified');
        jobRepository.updateStatus(jobId, 'FILE_READY' as any);
        LocalPrintJobRepository.updateStatus(jobId, 'FILE_READY');

        const tempLocal = StorageService.saveUploadedFile(job.id, downloadedBuffer, job.file_name);
        localSourcePath = tempLocal.absolutePath;
        jobRepository.updateProcessedFilePath(job.id, localSourcePath);
      } catch (dlErr: any) {
        console.error(`[EXECUTE_PRINT] Failed downloading remote file for job ${jobId}:`, dlErr);
        this.recordStatusTransition(jobId, 'DOWNLOADING', 'DOWNLOAD_FAILED', 'SYSTEM_AUTOPRINT', dlErr.message);
        jobRepository.updateStatus(jobId, 'DOWNLOAD_FAILED' as any);
        LocalPrintJobRepository.updateStatus(jobId, 'DOWNLOAD_FAILED', dlErr.message);
        if (SupabaseAdminClient.isConfigured()) {
          try {
            await updateScopedCloudJobStatus(jobId, 'DOWNLOAD_FAILED', { error_message: dlErr.message });
          } catch {}
        }
        return this.getJobById(jobId);
      }
    }

    let filePath = job.processed_file_path;
    const isProcessedMissingOrEmpty =
      !filePath ||
      !fs.existsSync(filePath) ||
      (fs.statSync(filePath).size < 1500 &&
        localSourcePath &&
        fs.existsSync(localSourcePath) &&
        fs.statSync(localSourcePath).size > 10000);

    if (isProcessedMissingOrEmpty && localSourcePath && fs.existsSync(localSourcePath)) {
      try {
        const rawBuffer = fs.readFileSync(localSourcePath);
        const watermarkResult = await PdfOverlayService.embedVerificationStamp(
          job.id,
          rawBuffer,
          code,
          verification?.formattedCode || code,
          verification?.securityChecksum || 'SEC-VALID',
          {
            originalFileName: job.file_name,
            orientation: printSettings.orientation,
            paperFormat: printSettings.paperFormat,
          }
        );
        filePath = watermarkResult.processedFilePath;
        jobRepository.updateProcessedFilePath(job.id, filePath);
      } catch (err) {
        console.warn(`[EXECUTE_PRINT] Re-processing file for job ${jobId} failed:`, err);
        filePath = localSourcePath;
      }
    } else if (!filePath) {
      filePath = localSourcePath;
    }

    try {
      const result = await PrinterService.dispatchPrintJob(
        job.id,
        job.job_no,
        code,
        filePath,
        job.printer_name,
        printSettings
      );

      if (result.success) {
        jobRepository.markPrinted(jobId);
        verificationRepository.updateTrayReady(jobId);
        this.recordStatusTransition(jobId, 'PRINTING', 'READY_FOR_PICKUP', 'SYSTEM_AUTOPRINT', 'Print completed, ready for pickup in tray');
      } else {
        jobRepository.updateStatus(jobId, 'PRINT_FAILED');
        jobRepository.updatePrintStatus(jobId, 'PRINT_FAILED');
        this.recordStatusTransition(jobId, 'PRINTING', 'PRINT_FAILED', 'SYSTEM_AUTOPRINT', result.message);
      }
    } catch (err: any) {
      console.error(`[EXECUTE_PRINT] Printing error for job ${jobId}:`, err);
      jobRepository.updateStatus(jobId, 'PRINT_FAILED');
      jobRepository.updatePrintStatus(jobId, 'PRINT_FAILED');
      this.recordStatusTransition(jobId, 'PRINTING', 'PRINT_FAILED', 'SYSTEM_AUTOPRINT', err.message || 'Printer error');
    }

    return this.getJobById(jobId);
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
      paymentMethod: row.payment_method,
      paymentStatus: row.payment_status || (row.status === 'PAID' ? 'PAID' : (row.status === 'AWAITING_CASH_CONFIRMATION' ? 'AWAITING_CASH_CONFIRMATION' : 'PAYMENT_PENDING')),
      paymentTransactionId: row.payment_transaction_id ?? undefined,
      printStatus: row.print_status || 'PENDING',
      paidAt: row.paid_at ?? undefined,
      queuedAt: row.queued_at ?? undefined,
      printingStartedAt: row.printing_started_at ?? undefined,
      printedAt: row.printed_at ?? undefined,
      readyForPickupAt: row.ready_for_pickup_at ?? undefined,
      collectedAt: row.collected_at ?? undefined,
      pickupCode: row.pickup_code || (verification ? verification.verificationCode : undefined),
      amountTotal: +(row.amount_minor_units / 100).toFixed(2),
      currency: row.currency,
      printSettings: this.normalizePrintSettings(row),
      verification,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
