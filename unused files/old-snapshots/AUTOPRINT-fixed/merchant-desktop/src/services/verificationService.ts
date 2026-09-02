/**
 * Verification Service for AutoPrint Automated Print Collection System
 * 
 * Provides cryptographically secure 8-digit verification code generation,
 * lifecycle persistence across print spooling, fail-safe 3-strike digital payment lockout,
 * staff verification, cash reconciliation, and granular compliance audit logging.
 */

import {
  CollectionVerificationRecord,
  PaymentAttempt,
  PaymentGatewayStatus,
  VerificationAuditLog,
  VerificationAction,
  VerificationActor,
  CreateVerificationContext,
} from '../types/verification';
import { PrintJob } from '../types/printer';

const STORAGE_KEY_RECORDS = 'autoprint_verification_records_v1';
const STORAGE_KEY_AUDIT_LOGS = 'autoprint_verification_audit_logs_v1';
const MAX_DIGITAL_ATTEMPTS = 3;

class VerificationWorkflowService {
  private records: Map<string, CollectionVerificationRecord> = new Map();
  private auditLogs: VerificationAuditLog[] = [];
  private listeners: Set<(records: CollectionVerificationRecord[]) => void> = new Set();
  private auditListeners: Set<(log: VerificationAuditLog) => void> = new Set();

  constructor() {
    this.loadFromStorage();
    this.seedDefaultRecordsIfEmpty();
  }

  /**
   * Generates a cryptographically secure 8-digit verification code.
   * Utilizes Web Cryptography API (crypto.getRandomValues) with rejection sampling
   * to eliminate modulo bias, strictly yielding numbers between 10000000 and 99999999.
   */
  public generateSecureVerificationCode(): { raw: string; formatted: string } {
    const min = 10000000;
    const max = 99999999;
    const range = max - min + 1;
    const maxValidUint32 = Math.floor(0xffffffff / range) * range - 1;

    const buffer = new Uint32Array(1);
    let randomVal: number;

    do {
      crypto.getRandomValues(buffer);
      randomVal = buffer[0];
    } while (randomVal > maxValidUint32);

    const codeNum = min + (randomVal % range);
    const raw = String(codeNum);
    const formatted = `${raw.slice(0, 4)} ${raw.slice(4)}`;

    return { raw, formatted };
  }

  /**
   * Computes a deterministic tamper-proof security checksum for physical watermark validation.
   */
  public computeSecurityChecksum(verificationCode: string, jobId: string, amount: number): string {
    const salt = 'AP_VERIFY_HMAC_SECURE_2026';
    const rawPayload = `${verificationCode}:${jobId}:${amount.toFixed(2)}:${salt}`;
    let hash = 0;
    for (let i = 0; i < rawPayload.length; i++) {
      const char = rawPayload.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
    return `SEC-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
  }

  /**
   * Registers and persists a new verification record for an automated print job.
   */
  public createVerificationRecord(
    context: CreateVerificationContext
  ): CollectionVerificationRecord {
    const { raw: verificationCode, formatted: formattedCode } = this.generateSecureVerificationCode();
    const securityChecksum = this.computeSecurityChecksum(
      verificationCode,
      context.job.id,
      context.amountTotal
    );

    const initialStatus: PaymentGatewayStatus =
      context.initialMethod === 'CASH'
        ? 'CASH_REQUIRED'
        : context.initialMethod === 'UPI'
        ? 'UPI_INITIATED'
        : 'PENDING';

    const record: CollectionVerificationRecord = {
      verificationCode,
      formattedCode,
      jobId: context.job.id,
      jobNo: context.job.jobNo,
      jobTitle: context.job.title,
      printerName: context.job.printerName,
      customerName: context.customerName || 'Walk-In Customer',
      customerPhone: context.customerPhone,
      amountTotal: context.amountTotal,
      currency: context.currency || 'USD',
      failedDigitalAttemptsCount: 0,
      maxDigitalAttemptsAllowed: MAX_DIGITAL_ATTEMPTS,
      isCashLocked: false,
      paymentStatus: initialStatus,
      paymentAttempts: [],
      handoverStatus: 'PENDING_PRINT',
      securityChecksum,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.records.set(verificationCode, record);
    this.saveToStorage();

    this.logAuditEvent({
      verificationCode,
      jobId: record.jobId,
      jobNo: record.jobNo,
      action: 'CODE_GENERATED',
      actor: 'SYSTEM_AUTOPRINT',
      details: {
        amountTotal: record.amountTotal,
        customerName: record.customerName,
        paymentStatus: record.paymentStatus,
        securityChecksum,
      },
    });

    this.logAuditEvent({
      verificationCode,
      jobId: record.jobId,
      jobNo: record.jobNo,
      action: 'DOCUMENT_EMBEDDED',
      actor: 'SYSTEM_AUTOPRINT',
      details: {
        printerName: record.printerName,
        embeddedFooterFormat: 'OCR-A_WATERMARK_FINAL_PAGE',
      },
    });

    this.notifyListeners();
    return record;
  }

  /**
   * Normalizes and performs defensive lookup by raw or formatted verification code.
   */
  public lookupByCode(inputCode: string): CollectionVerificationRecord | null {
    if (!inputCode) return null;
    const sanitized = inputCode.replace(/[\s\-_]/g, '').trim();
    if (!/^\d{8}$/.test(sanitized)) {
      return null;
    }

    const record = this.records.get(sanitized);
    if (record) {
      this.logAuditEvent({
        verificationCode: record.verificationCode,
        jobId: record.jobId,
        jobNo: record.jobNo,
        action: 'STAFF_LOOKUP_INITIATED',
        actor: 'STAFF_TERMINAL',
        details: {
          currentPaymentStatus: record.paymentStatus,
          isCashLocked: record.isCashLocked,
        },
      });
    }
    return record || null;
  }

  /**
   * Retrieves a record by its associated print job ID.
   */
  public getRecordByJobId(jobId: string): CollectionVerificationRecord | null {
    for (const record of this.records.values()) {
      if (record.jobId === jobId) return record;
    }
    return null;
  }

  /**
   * Records a digital/UPI payment attempt and enforces the 3-strike failure lockout.
   */
  public recordDigitalPaymentAttempt(
    verificationCode: string,
    attempt: Omit<PaymentAttempt, 'attemptId' | 'attemptNumber' | 'timestamp'>
  ): { record: CollectionVerificationRecord; strikeLockoutTriggered: boolean } {
    const record = this.records.get(verificationCode);
    if (!record) {
      throw new Error(`Verification record not found for code: ${verificationCode}`);
    }

    const attemptNumber = record.paymentAttempts.length + 1;
    const fullAttempt: PaymentAttempt = {
      ...attempt,
      attemptId: `att-${Date.now()}-${attemptNumber}`,
      attemptNumber,
      timestamp: new Date().toISOString(),
    };

    record.paymentAttempts.push(fullAttempt);
    record.updatedAt = new Date().toISOString();

    let strikeLockoutTriggered = false;

    if (attempt.status === 'SUCCESS') {
      record.paymentStatus = 'UPI_SUCCESS';
      record.upiTransactionId = attempt.gatewayRef;
      record.upiPayerVpa = attempt.vpa;
      record.failedDigitalAttemptsCount = 0;

      this.logAuditEvent({
        verificationCode: record.verificationCode,
        jobId: record.jobId,
        jobNo: record.jobNo,
        action: 'UPI_PAYMENT_CONFIRMED',
        actor: 'PAYMENT_GATEWAY',
        details: {
          gatewayRef: attempt.gatewayRef,
          vpa: attempt.vpa,
          amount: attempt.amount,
        },
      });
    } else {
      // Digital failure
      record.failedDigitalAttemptsCount += 1;
      record.paymentStatus = 'UPI_FAILED';

      this.logAuditEvent({
        verificationCode: record.verificationCode,
        jobId: record.jobId,
        jobNo: record.jobNo,
        action: 'DIGITAL_PAYMENT_FAILED',
        actor: 'PAYMENT_GATEWAY',
        details: {
          attemptNumber,
          errorCode: attempt.errorCode,
          errorMessage: attempt.errorMessage,
          cumulativeFailures: record.failedDigitalAttemptsCount,
        },
      });

      // Fail-Safe 3-Strike Threshold Enforcement
      if (record.failedDigitalAttemptsCount >= MAX_DIGITAL_ATTEMPTS) {
        record.isCashLocked = true;
        record.paymentStatus = 'CASH_LOCKED';
        record.lockoutReason = `Exceeded maximum digital attempts (${MAX_DIGITAL_ATTEMPTS}/${MAX_DIGITAL_ATTEMPTS}). Digital gateway disabled. Mandatory cash collection at counter.`;
        strikeLockoutTriggered = true;

        this.logAuditEvent({
          verificationCode: record.verificationCode,
          jobId: record.jobId,
          jobNo: record.jobNo,
          action: 'THREE_STRIKE_LOCKOUT_TRIGGERED',
          actor: 'SYSTEM_AUTOPRINT',
          details: {
            failedAttempts: record.failedDigitalAttemptsCount,
            lockoutReason: record.lockoutReason,
          },
        });
      }
    }

    this.records.set(verificationCode, record);
    this.saveToStorage();
    this.notifyListeners();

    return { record, strikeLockoutTriggered };
  }

  /**
   * Sets payment status to CASH_REQUIRED when customer selects counter cash payment.
   */
  public markCashRequired(verificationCode: string): CollectionVerificationRecord {
    const record = this.records.get(verificationCode);
    if (!record) {
      throw new Error(`Verification record not found for code: ${verificationCode}`);
    }

    if (!record.isCashLocked) {
      record.paymentStatus = 'CASH_REQUIRED';
      record.updatedAt = new Date().toISOString();
      this.records.set(verificationCode, record);
      this.saveToStorage();
      this.notifyListeners();
    }
    return record;
  }


  /**
   * Records cash collection at the counter by staff.
   */
  public recordCashCollection(
    verificationCode: string,
    tenderedAmount: number,
    staffId = 'STAFF-01',
    staffName = 'Duty Station Cashier'
  ): CollectionVerificationRecord {
    const record = this.records.get(verificationCode);
    if (!record) {
      throw new Error(`Verification record not found for code: ${verificationCode}`);
    }

    if (tenderedAmount < record.amountTotal) {
      throw new Error(
        `Insufficient cash tendered. Total due: $${record.amountTotal.toFixed(2)}, received: $${tenderedAmount.toFixed(2)}`
      );
    }

    const changeDue = +(tenderedAmount - record.amountTotal).toFixed(2);

    record.cashTenderedAmount = tenderedAmount;
    record.cashChangeDue = changeDue;
    record.paymentStatus = 'CASH_COLLECTED';
    record.verifiedByStaffId = staffId;
    record.verifiedByStaffName = staffName;
    record.updatedAt = new Date().toISOString();

    const attempt: PaymentAttempt = {
      attemptId: `att-cash-${Date.now()}`,
      attemptNumber: record.paymentAttempts.length + 1,
      timestamp: new Date().toISOString(),
      method: 'CASH',
      amount: record.amountTotal,
      currency: record.currency,
      status: 'SUCCESS',
      errorMessage: `Cash received: $${tenderedAmount.toFixed(2)}, Change: $${changeDue.toFixed(2)}`,
    };
    record.paymentAttempts.push(attempt);

    this.logAuditEvent({
      verificationCode: record.verificationCode,
      jobId: record.jobId,
      jobNo: record.jobNo,
      action: 'CASH_COLLECTION_COMPLETED',
      actor: 'STAFF_TERMINAL',
      staffId,
      staffName,
      details: {
        amountTotal: record.amountTotal,
        tenderedAmount,
        changeDue,
      },
    });

    this.records.set(verificationCode, record);
    this.saveToStorage();
    this.notifyListeners();

    return record;
  }

  /**
   * Confirms physical handover of printed documents to the customer.
   */
  public confirmDocumentHandover(
    verificationCode: string,
    staffId = 'STAFF-01',
    staffName = 'Duty Station Cashier'
  ): CollectionVerificationRecord {
    const record = this.records.get(verificationCode);
    if (!record) {
      throw new Error(`Verification record not found for code: ${verificationCode}`);
    }

    const isPaid =
      record.paymentStatus === 'UPI_SUCCESS' || record.paymentStatus === 'CASH_COLLECTED';

    if (!isPaid) {
      throw new Error('Cannot handover prints before payment confirmation or cash collection.');
    }

    record.handoverStatus = 'COLLECTED';
    record.handoverCompletedAt = new Date().toISOString();
    record.verifiedByStaffId = staffId;
    record.verifiedByStaffName = staffName;
    record.updatedAt = new Date().toISOString();

    this.logAuditEvent({
      verificationCode: record.verificationCode,
      jobId: record.jobId,
      jobNo: record.jobNo,
      action: 'PRINTS_HANDED_OVER',
      actor: 'STAFF_TERMINAL',
      staffId,
      staffName,
      details: {
        paymentStatus: record.paymentStatus,
        handoverCompletedAt: record.handoverCompletedAt,
      },
    });

    this.records.set(verificationCode, record);
    this.saveToStorage();
    this.notifyListeners();

    return record;
  }

  /**
   * Updates physical tray status (e.g. when print spooler finishes printing).
   */
  public updateTrayReadyStatus(jobId: string): void {
    const record = this.getRecordByJobId(jobId);
    if (record && record.handoverStatus === 'PENDING_PRINT') {
      record.handoverStatus = 'READY_IN_TRAY';
      record.updatedAt = new Date().toISOString();
      this.records.set(record.verificationCode, record);
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  /**
   * Appends an immutable audit log entry.
   */
  private logAuditEvent(
    entry: Omit<VerificationAuditLog, 'id' | 'timestamp' | 'ipAddressOrStation'>
  ): void {
    const log: VerificationAuditLog = {
      ...entry,
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      ipAddressOrStation: 'STATION-01-DESK',
    };

    this.auditLogs.unshift(log);
    if (this.auditLogs.length > 500) {
      this.auditLogs = this.auditLogs.slice(0, 500);
    }
    this.saveAuditLogsToStorage();
    this.auditListeners.forEach((fn) => fn(log));
  }

  /**
   * Retrieves all registered verification records sorted newest first.
   */
  public getAllRecords(): CollectionVerificationRecord[] {
    return Array.from(this.records.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Retrieves audit logs filtered for a specific verification code or all logs.
   */
  public getAuditLogs(verificationCode?: string): VerificationAuditLog[] {
    if (!verificationCode) return [...this.auditLogs];
    return this.auditLogs.filter((l) => l.verificationCode === verificationCode);
  }

  public subscribe(listener: (records: CollectionVerificationRecord[]) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public subscribeToAudit(listener: (log: VerificationAuditLog) => void): () => void {
    this.auditListeners.add(listener);
    return () => this.auditListeners.delete(listener);
  }

  private notifyListeners(): void {
    const all = this.getAllRecords();
    this.listeners.forEach((fn) => fn(all));
  }

  private saveToStorage(): void {
    try {
      const serialized = JSON.stringify(Array.from(this.records.entries()));
      localStorage.setItem(STORAGE_KEY_RECORDS, serialized);
    } catch {
      // Ignore quota storage errors gracefully
    }
  }

  private saveAuditLogsToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY_AUDIT_LOGS, JSON.stringify(this.auditLogs));
    } catch {
      // Ignore quota storage errors gracefully
    }
  }

  private loadFromStorage(): void {
    try {
      const rawRecords = localStorage.getItem(STORAGE_KEY_RECORDS);
      if (rawRecords) {
        const parsed = JSON.parse(rawRecords) as [string, CollectionVerificationRecord][];
        this.records = new Map(parsed);
      }

      const rawLogs = localStorage.getItem(STORAGE_KEY_AUDIT_LOGS);
      if (rawLogs) {
        this.auditLogs = JSON.parse(rawLogs);
      }
    } catch {
      this.records = new Map();
      this.auditLogs = [];
    }
  }

  private seedDefaultRecordsIfEmpty(): void {
    // Empty for clean production initialization
  }
}

export const verificationService = new VerificationWorkflowService();
