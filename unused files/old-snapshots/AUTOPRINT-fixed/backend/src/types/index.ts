/**
 * Types & Domain Models for AutoPrint Fail-Safe Verification and Payment Backend
 */

export type PaymentMethod = 'UPI' | 'CASH';

export type PaymentGatewayStatus =
  | 'PENDING'
  | 'UPI_INITIATED'
  | 'UPI_SUCCESS'
  | 'UPI_FAILED'
  | 'CASH_REQUIRED'
  | 'CASH_LOCKED'
  | 'CASH_COLLECTED';

export type HandoverStatus = 'PENDING_PRINT' | 'READY_IN_TRAY' | 'COLLECTED';

export type VerificationAction =
  | 'CODE_GENERATED'
  | 'DOCUMENT_EMBEDDED'
  | 'STAFF_LOOKUP_INITIATED'
  | 'UPI_PAYMENT_INITIATED'
  | 'UPI_PAYMENT_CONFIRMED'
  | 'DIGITAL_PAYMENT_FAILED'
  | 'THREE_STRIKE_LOCKOUT_TRIGGERED'
  | 'CASH_COLLECTION_COMPLETED'
  | 'PRINTS_HANDED_OVER';

export type VerificationActor =
  | 'SYSTEM_AUTOPRINT'
  | 'CUSTOMER_TERMINAL'
  | 'STAFF_TERMINAL'
  | 'PAYMENT_GATEWAY';

export interface PaymentAttempt {
  attemptId: string;
  attemptNumber: number;
  timestamp: string;
  method: PaymentMethod;
  amount: number;
  currency: string;
  status: 'SUCCESS' | 'FAILED' | 'TIMED_OUT';
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
  amountTotal: number;
  currency: string;
  failedDigitalAttemptsCount: number;
  maxDigitalAttemptsAllowed: number;
  isCashLocked: boolean;
  lockoutReason?: string;
  paymentStatus: PaymentGatewayStatus;
  upiTransactionId?: string;
  upiPayerVpa?: string;
  cashTenderedAmount?: number;
  cashChangeDue?: number;
  paymentAttempts: PaymentAttempt[];
  handoverStatus: HandoverStatus;
  handoverCompletedAt?: string;
  verifiedByStaffId?: string;
  verifiedByStaffName?: string;
  securityChecksum: string;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationAuditLog {
  id: string;
  timestamp: string;
  verificationCode: string;
  jobId: string;
  jobNo: string;
  action: VerificationAction;
  actor: VerificationActor;
  staffId?: string;
  staffName?: string;
  ipAddressOrStation: string;
  details: Record<string, any>;
}

export interface PrintJobSpecs {
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
  specs: PrintJobSpecs;
  paymentMethod: PaymentMethod;
  amountTotal: number;
  rawContentHtml?: string;
}

export interface PrintJobResponse {
  id: string;
  jobNo: string;
  title: string;
  customerName: string;
  printerName: string;
  status: 'queued' | 'printing' | 'completed' | 'failed';
  verification: CollectionVerificationRecord;
  createdAt: string;
}

export type MerchantPaymentMethod = 'QR' | 'UPI' | 'BOTH';

export interface MerchantPaymentConfig {
  shopId: string;
  paymentMethod: MerchantPaymentMethod;
  upiId?: string;
  qrImageUrl?: string;
  qrFileName?: string;
  shopName?: string;
  updatedAt: string;
}

