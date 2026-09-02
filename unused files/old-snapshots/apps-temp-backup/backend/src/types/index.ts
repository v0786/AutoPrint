/**
 * AutoPrint Domain Types — Canonical source of truth for backend
 * All domain types, enums, and interfaces for the AutoPrint system.
 */

// ─── Payment ──────────────────────────────────────────────────────────────────

export type PaymentMethod = 'UPI' | 'CASH';

export type PaymentGatewayStatus =
  | 'PENDING'
  | 'UPI_INITIATED'
  | 'UPI_SUCCESS'
  | 'UPI_FAILED'
  | 'CASH_REQUIRED'
  | 'CASH_LOCKED'
  | 'CASH_COLLECTED';

export type PaymentAttemptStatus = 'SUCCESS' | 'FAILED' | 'TIMED_OUT';

// ─── Print Job ────────────────────────────────────────────────────────────────

export type PrintJobStatus =
  | 'CREATED'
  | 'QUEUED'
  | 'PRINTING'
  | 'PRINTED'
  | 'READY_FOR_HANDOVER'
  | 'COMPLETED'
  | 'FAILED';

// ─── Handover ─────────────────────────────────────────────────────────────────

export type HandoverStatus = 'PENDING_PRINT' | 'READY_IN_TRAY' | 'COLLECTED';

// ─── Audit ────────────────────────────────────────────────────────────────────

export type AuditAction =
  | 'JOB_CREATED'
  | 'JOB_QUEUED'
  | 'JOB_PRINT_STARTED'
  | 'JOB_PRINT_COMPLETED'
  | 'JOB_PRINT_FAILED'
  | 'CODE_GENERATED'
  | 'DOCUMENT_EMBEDDED'
  | 'FILE_UPLOADED'
  | 'STAFF_LOOKUP_INITIATED'
  | 'UPI_PAYMENT_INITIATED'
  | 'UPI_PAYMENT_CONFIRMED'
  | 'DIGITAL_PAYMENT_FAILED'
  | 'THREE_STRIKE_LOCKOUT_TRIGGERED'
  | 'CASH_COLLECTION_COMPLETED'
  | 'PRINTS_HANDED_OVER';

export type AuditActor =
  | 'SYSTEM_AUTOPRINT'
  | 'CUSTOMER_TERMINAL'
  | 'STAFF_TERMINAL'
  | 'PAYMENT_GATEWAY';

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface PrintSpecs {
  colorMode: 'bw' | 'color';
  copies: number;
  pageRange: string;
  paperSize?: 'a4' | 'letter' | 'a3' | 'receipt_80mm';
  duplex?: 'single' | 'double';
  finishing?: 'none' | 'staple' | 'laminate';
}

export interface PrintJobRequest {
  fileName: string;
  mimeType: string;
  customerName: string;
  customerPhone?: string;
  printerId?: string;
  printerName?: string;
  specs: PrintSpecs;
  paymentMethod: PaymentMethod;
  /** Amount in minor units (paise for INR, cents for USD) */
  amountMinorUnits: number;
  /** Currency code e.g. INR */
  currency?: string;
}

export interface PrintJobRow {
  id: string;
  job_no: string;
  title: string;
  file_name: string;
  file_path: string;
  processed_file_path: string | null;
  customer_name: string;
  customer_phone: string | null;
  printer_id: string | null;
  printer_name: string;
  color_mode: string;
  copies: number;
  page_range: string;
  paper_size: string | null;
  duplex: string | null;
  finishing: string | null;
  /** Amount in minor units (integer paise/cents) */
  amount_minor_units: number;
  currency: string;
  payment_method: PaymentMethod;
  status: PrintJobStatus;
  created_at: string;
  updated_at: string;
}

export interface PrintJobResponse {
  id: string;
  jobNo: string;
  title: string;
  fileName: string;
  customerName: string;
  printerName: string;
  status: PrintJobStatus;
  /** Amount as decimal (e.g. 24.50) */
  amountTotal: number;
  currency: string;
  verification?: CollectionVerificationRecord;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentAttempt {
  attemptId: string;
  attemptNumber: number;
  timestamp: string;
  method: PaymentMethod;
  /** Amount in minor units */
  amountMinorUnits: number;
  currency: string;
  status: PaymentAttemptStatus;
  gatewayRef?: string;
  vpa?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface CollectionVerificationRecord {
  verificationCode: string;
  formattedCode: string;
  jobId: string;
  jobNo: string;
  jobTitle: string;
  printerName: string;
  customerName: string;
  customerPhone?: string;
  /** Amount as decimal */
  amountTotal: number;
  /** Amount in minor units */
  amountMinorUnits: number;
  currency: string;
  failedDigitalAttemptsCount: number;
  maxDigitalAttemptsAllowed: number;
  isCashLocked: boolean;
  lockoutReason?: string;
  paymentStatus: PaymentGatewayStatus;
  upiTransactionId?: string;
  upiPayerVpa?: string;
  /** Cash tendered in minor units */
  cashTenderedMinorUnits?: number;
  /** Cash change in minor units */
  cashChangeMinorUnits?: number;
  paymentAttempts: PaymentAttempt[];
  handoverStatus: HandoverStatus;
  handoverCompletedAt?: string;
  verifiedByStaffId?: string;
  verifiedByStaffName?: string;
  securityChecksum: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  verificationCode: string;
  jobId: string;
  jobNo: string;
  action: AuditAction;
  actor: AuditActor;
  staffId?: string;
  staffName?: string;
  ipAddressOrStation: string;
  details: Record<string, unknown>;
}

// ─── Zod-compatible request shapes (used in controllers) ─────────────────────

export interface SubmitJobBody {
  customerName: string;
  customerPhone?: string;
  printerId?: string;
  printerName?: string;
  colorMode: 'bw' | 'color';
  copies: number;
  pageRange: string;
  paperSize?: string;
  duplex?: string;
  finishing?: string;
  /** Amount in minor units sent by frontend */
  amountMinorUnits: number;
  currency?: string;
  paymentMethod: 'UPI' | 'CASH';
}

export interface LookupBody {
  code: string;
  staffId?: string;
}

export interface CollectCashBody {
  verificationCode: string;
  /** Tendered amount in minor units */
  tenderedMinorUnits: number;
  staffId?: string;
  staffName?: string;
}

export interface HandoverBody {
  verificationCode: string;
  staffId?: string;
  staffName?: string;
}

export interface DigitalAttemptBody {
  verificationCode: string;
  status: 'SUCCESS' | 'FAILED' | 'TIMED_OUT';
  gatewayRef?: string;
  vpa?: string;
  errorCode?: string;
  errorMessage?: string;
}

// ─── AppError ─────────────────────────────────────────────────────────────────

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}
