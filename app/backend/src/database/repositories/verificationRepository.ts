/**
 * Verification Repository — Persistent verification record and payment attempt storage
 */

import { getDb } from '../db.js';
import {
  CollectionVerificationRecord,
  PaymentAttempt,
  PaymentGatewayStatus,
  HandoverStatus,
} from '../../types/index.js';

// ─── Row Types (SQLite raw shapes) ───────────────────────────────────────────

interface VerificationRow {
  verification_code: string;
  formatted_code: string;
  job_id: string;
  job_no: string;
  job_title: string;
  printer_name: string;
  customer_name: string;
  customer_phone: string | null;
  amount_minor_units: number;
  currency: string;
  failed_digital_attempts: number;
  max_digital_attempts: number;
  is_cash_locked: number; // SQLite boolean as 0/1
  lockout_reason: string | null;
  payment_status: string;
  upi_transaction_id: string | null;
  upi_payer_vpa: string | null;
  cash_tendered_minor_units: number | null;
  cash_change_minor_units: number | null;
  handover_status: string;
  handover_completed_at: string | null;
  verified_by_staff_id: string | null;
  verified_by_staff_name: string | null;
  security_checksum: string;
  created_at: string;
  updated_at: string;
}

interface AttemptRow {
  attempt_id: string;
  verification_code: string;
  attempt_number: number;
  timestamp: string;
  method: string;
  amount_minor_units: number;
  currency: string;
  status: string;
  gateway_ref: string | null;
  vpa: string | null;
  error_code: string | null;
  error_message: string | null;
}

// ─── Conversion helpers ───────────────────────────────────────────────────────

function toMinorToDecimal(minor: number): number {
  return +(minor / 100).toFixed(2);
}

function attemptsForCode(code: string): PaymentAttempt[] {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM payment_attempts WHERE verification_code = ? ORDER BY attempt_number ASC'
  ).all(code) as AttemptRow[];

  return rows.map((r) => ({
    attemptId: r.attempt_id,
    attemptNumber: r.attempt_number,
    timestamp: r.timestamp,
    method: r.method as PaymentAttempt['method'],
    amountMinorUnits: r.amount_minor_units,
    currency: r.currency,
    status: r.status as PaymentAttempt['status'],
    gatewayRef: r.gateway_ref ?? undefined,
    vpa: r.vpa ?? undefined,
    errorCode: r.error_code ?? undefined,
    errorMessage: r.error_message ?? undefined,
  }));
}

function rowToRecord(row: VerificationRow): CollectionVerificationRecord {
  return {
    verificationCode: row.verification_code,
    formattedCode: row.formatted_code,
    jobId: row.job_id,
    jobNo: row.job_no,
    jobTitle: row.job_title,
    printerName: row.printer_name,
    customerName: row.customer_name,
    customerPhone: row.customer_phone ?? undefined,
    amountTotal: toMinorToDecimal(row.amount_minor_units),
    amountMinorUnits: row.amount_minor_units,
    currency: row.currency,
    failedDigitalAttemptsCount: row.failed_digital_attempts,
    maxDigitalAttemptsAllowed: row.max_digital_attempts,
    isCashLocked: row.is_cash_locked === 1,
    lockoutReason: row.lockout_reason ?? undefined,
    paymentStatus: row.payment_status as PaymentGatewayStatus,
    upiTransactionId: row.upi_transaction_id ?? undefined,
    upiPayerVpa: row.upi_payer_vpa ?? undefined,
    cashTenderedMinorUnits: row.cash_tendered_minor_units ?? undefined,
    cashChangeMinorUnits: row.cash_change_minor_units ?? undefined,
    paymentAttempts: attemptsForCode(row.verification_code),
    handoverStatus: row.handover_status as HandoverStatus,
    handoverCompletedAt: row.handover_completed_at ?? undefined,
    verifiedByStaffId: row.verified_by_staff_id ?? undefined,
    verifiedByStaffName: row.verified_by_staff_name ?? undefined,
    securityChecksum: row.security_checksum,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ─── Repository ───────────────────────────────────────────────────────────────

export const verificationRepository = {
  codeExists(code: string): boolean {
    const db = getDb();
    const row = db.prepare('SELECT 1 FROM verification_records WHERE verification_code = ?').get(code);
    return row !== undefined;
  },

  create(params: {
    verificationCode: string;
    formattedCode: string;
    jobId: string;
    jobNo: string;
    jobTitle: string;
    printerName: string;
    customerName: string;
    customerPhone?: string;
    amountMinorUnits: number;
    currency: string;
    maxDigitalAttempts: number;
    initialPaymentStatus: PaymentGatewayStatus;
    securityChecksum: string;
  }): CollectionVerificationRecord {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO verification_records (
        verification_code, formatted_code, job_id, job_no, job_title,
        printer_name, customer_name, customer_phone,
        amount_minor_units, currency,
        failed_digital_attempts, max_digital_attempts,
        is_cash_locked, payment_status, security_checksum,
        handover_status, created_at, updated_at
      ) VALUES (
        @verification_code, @formatted_code, @job_id, @job_no, @job_title,
        @printer_name, @customer_name, @customer_phone,
        @amount_minor_units, @currency,
        0, @max_digital_attempts,
        0, @payment_status, @security_checksum,
        'PENDING_PRINT', @created_at, @updated_at
      )
    `).run({
      verification_code: params.verificationCode,
      formatted_code: params.formattedCode,
      job_id: params.jobId,
      job_no: params.jobNo,
      job_title: params.jobTitle,
      printer_name: params.printerName,
      customer_name: params.customerName,
      customer_phone: params.customerPhone ?? null,
      amount_minor_units: params.amountMinorUnits,
      currency: params.currency,
      max_digital_attempts: params.maxDigitalAttempts,
      payment_status: params.initialPaymentStatus,
      security_checksum: params.securityChecksum,
      created_at: now,
      updated_at: now,
    });

    return this.getByCode(params.verificationCode)!;
  },

  getByCode(code: string): CollectionVerificationRecord | null {
    const db = getDb();
    const row = db.prepare(
      'SELECT * FROM verification_records WHERE verification_code = ?'
    ).get(code) as VerificationRow | undefined;
    return row ? rowToRecord(row) : null;
  },

  getByJobId(jobId: string): CollectionVerificationRecord | null {
    const db = getDb();
    const row = db.prepare(
      'SELECT * FROM verification_records WHERE job_id = ?'
    ).get(jobId) as VerificationRow | undefined;
    return row ? rowToRecord(row) : null;
  },

  getAll(): CollectionVerificationRecord[] {
    const db = getDb();
    const rows = db.prepare(
      'SELECT * FROM verification_records ORDER BY created_at DESC'
    ).all() as VerificationRow[];
    return rows.map(rowToRecord);
  },

  updatePaymentSuccess(params: {
    code: string;
    upiTransactionId: string;
    upiPayerVpa?: string;
  }): void {
    const db = getDb();
    db.prepare(`
      UPDATE verification_records
      SET payment_status = 'UPI_SUCCESS',
          upi_transaction_id = @txn,
          upi_payer_vpa = @vpa,
          failed_digital_attempts = 0,
          updated_at = @now
      WHERE verification_code = @code
    `).run({
      code: params.code,
      txn: params.upiTransactionId,
      vpa: params.upiPayerVpa ?? null,
      now: new Date().toISOString(),
    });
  },

  updatePaymentFailed(params: {
    code: string;
    newCount: number;
    newStatus: PaymentGatewayStatus;
    lockoutReason?: string;
    isCashLocked: boolean;
  }): void {
    const db = getDb();
    db.prepare(`
      UPDATE verification_records
      SET payment_status = @status,
          failed_digital_attempts = @count,
          is_cash_locked = @locked,
          lockout_reason = @reason,
          updated_at = @now
      WHERE verification_code = @code
    `).run({
      code: params.code,
      status: params.newStatus,
      count: params.newCount,
      locked: params.isCashLocked ? 1 : 0,
      reason: params.lockoutReason ?? null,
      now: new Date().toISOString(),
    });
  },

  updateCashCollected(params: {
    code: string;
    tenderedMinorUnits: number;
    changeMinorUnits: number;
    staffId: string;
    staffName: string;
  }): void {
    const db = getDb();
    db.prepare(`
      UPDATE verification_records
      SET payment_status = 'CASH_COLLECTED',
          cash_tendered_minor_units = @tendered,
          cash_change_minor_units = @change,
          verified_by_staff_id = @staffId,
          verified_by_staff_name = @staffName,
          updated_at = @now
      WHERE verification_code = @code
    `).run({
      code: params.code,
      tendered: params.tenderedMinorUnits,
      change: params.changeMinorUnits,
      staffId: params.staffId,
      staffName: params.staffName,
      now: new Date().toISOString(),
    });
  },

  updateHandover(params: {
    code: string;
    staffId: string;
    staffName: string;
    handoverAt: string;
  }): void {
    const db = getDb();
    const ver = this.getByCode(params.code);
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE verification_records
      SET handover_status = 'COLLECTED',
          handover_completed_at = @handoverAt,
          verified_by_staff_id = @staffId,
          verified_by_staff_name = @staffName,
          updated_at = @now
      WHERE verification_code = @code
    `).run({
      code: params.code,
      handoverAt: params.handoverAt,
      staffId: params.staffId,
      staffName: params.staffName,
      now,
    });

    if (ver && ver.jobId) {
      db.prepare(`
        UPDATE print_jobs
        SET status = 'COLLECTED',
            updated_at = @now
        WHERE id = @jobId
      `).run({
        jobId: ver.jobId,
        now,
      });
    }
  },

  updateTrayReady(jobId: string): void {
    const db = getDb();
    db.prepare(`
      UPDATE verification_records
      SET handover_status = 'READY_IN_TRAY', updated_at = @now
      WHERE job_id = @jobId AND handover_status = 'PENDING_PRINT'
    `).run({ jobId, now: new Date().toISOString() });
  },

  addPaymentAttempt(attempt: PaymentAttempt & { verificationCode: string }): void {
    const db = getDb();
    db.prepare(`
      INSERT INTO payment_attempts (
        attempt_id, verification_code, attempt_number, timestamp,
        method, amount_minor_units, currency, status,
        gateway_ref, vpa, error_code, error_message
      ) VALUES (
        @attemptId, @verificationCode, @attemptNumber, @timestamp,
        @method, @amountMinorUnits, @currency, @status,
        @gatewayRef, @vpa, @errorCode, @errorMessage
      )
    `).run({
      attemptId: attempt.attemptId,
      verificationCode: attempt.verificationCode,
      attemptNumber: attempt.attemptNumber,
      timestamp: attempt.timestamp,
      method: attempt.method,
      amountMinorUnits: attempt.amountMinorUnits,
      currency: attempt.currency,
      status: attempt.status,
      gatewayRef: attempt.gatewayRef ?? null,
      vpa: attempt.vpa ?? null,
      errorCode: attempt.errorCode ?? null,
      errorMessage: attempt.errorMessage ?? null,
    });
  },
};
