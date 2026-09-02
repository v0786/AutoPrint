/**
 * Fail-Safe Verification and Payment Workflow Type Definitions
 * AutoPrint Automated Print Collection System
 */

import { PrintJob } from './printer';

/**
 * Supported payment methods for print jobs
 */
export type PaymentMethod = 'UPI' | 'CASH' | 'DIGITAL_GATEWAY';

/**
 * Granular payment workflow lifecycle states
 */
export type PaymentGatewayStatus =
  | 'PENDING'
  | 'UPI_INITIATED'
  | 'UPI_SUCCESS'
  | 'UPI_FAILED'
  | 'CASH_REQUIRED'
  | 'CASH_COLLECTED'
  | 'CASH_LOCKED'
  | 'CANCELLED';

/**
 * Handover and physical document status in collection tray
 */
export type HandoverStatus =
  | 'PENDING_PRINT'
  | 'READY_IN_TRAY'
  | 'COLLECTED'
  | 'DISCARDED';

/**
 * Audit log actor types
 */
export type VerificationActor =
  | 'SYSTEM_AUTOPRINT'
  | 'CUSTOMER_KIOSK'
  | 'STAFF_TERMINAL'
  | 'PAYMENT_GATEWAY';

/**
 * Verification audit action events
 */
export type VerificationAction =
  | 'CODE_GENERATED'
  | 'DOCUMENT_EMBEDDED'
  | 'DIGITAL_PAYMENT_ATTEMPT'
  | 'DIGITAL_PAYMENT_FAILED'
  | 'THREE_STRIKE_LOCKOUT_TRIGGERED'
  | 'STAFF_LOOKUP_INITIATED'
  | 'UPI_PAYMENT_CONFIRMED'
  | 'CASH_COLLECTION_COMPLETED'
  | 'PRINTS_HANDED_OVER'
  | 'OVERRIDE_APPLIED';

/**
 * Structure of an individual digital or cash payment attempt
 */
export interface PaymentAttempt {
  attemptId: string;
  attemptNumber: number;
  timestamp: string;
  method: PaymentMethod;
  amount: number;
  currency: string;
  status: 'SUCCESS' | 'FAILED' | 'TIMED_OUT' | 'ABORTED';
  gatewayRef?: string;
  vpa?: string;
  errorCode?: string;
  errorMessage?: string;
}

/**
 * Comprehensive verification record tied to an 8-digit verification code and print job
 */
export interface CollectionVerificationRecord {
  /** Canonical 8-digit verification code (e.g., '48291057') */
  verificationCode: string;
  /** Human-formatted verification code (e.g., '4829 1057') */
  formattedCode: string;
  /** Associated print job ID */
  jobId: string;
  /** Associated job display number (e.g., '#1042') */
  jobNo: string;
  /** Job title */
  jobTitle: string;
  /** Target printer name */
  printerName: string;
  /** Customer display identifier */
  customerName: string;
  /** Optional customer phone for SMS/receipt */
  customerPhone?: string;
  /** Total monetary amount */
  amountTotal: number;
  /** Currency code */
  currency: string;
  /** Count of failed digital payment attempts (0 to 3) */
  failedDigitalAttemptsCount: number;
  /** Maximum digital attempts allowed before automatic cash lockout */
  maxDigitalAttemptsAllowed: number;
  /** True when 3 consecutive digital failures have triggered cash lockdown */
  isCashLocked: boolean;
  /** Explanatory lockout reason */
  lockoutReason?: string;
  /** Current payment gateway status */
  paymentStatus: PaymentGatewayStatus;
  /** Detailed history of all payment attempts */
  paymentAttempts: PaymentAttempt[];
  /** UPI transaction reference if paid digitally */
  upiTransactionId?: string;
  /** Payer VPA if paid digitally */
  upiPayerVpa?: string;
  /** Cash amount tendered by customer */
  cashTenderedAmount?: number;
  /** Change returned to customer */
  cashChangeDue?: number;
  /** Staff member ID who performed collection/verification */
  verifiedByStaffId?: string;
  /** Staff member display name */
  verifiedByStaffName?: string;
  /** Physical document handover status */
  handoverStatus: HandoverStatus;
  /** ISO timestamp when prints were handed over */
  handoverCompletedAt?: string;
  /** Tamper-proof cryptographic checksum representing printed watermark */
  securityChecksum: string;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Immutable audit log entry for compliance and transaction traceability
 */
export interface VerificationAuditLog {
  id: string;
  verificationCode: string;
  jobId: string;
  jobNo: string;
  action: VerificationAction;
  timestamp: string;
  actor: VerificationActor;
  staffId?: string;
  staffName?: string;
  details: Record<string, any>;
  ipAddressOrStation: string;
}

/**
 * Context payload for creating a new print verification record
 */
export interface CreateVerificationContext {
  job: PrintJob;
  customerName: string;
  customerPhone?: string;
  amountTotal: number;
  currency?: string;
  initialMethod?: PaymentMethod;
}
