/**
 * Verification Service for AutoPrint Automated Print Collection System (Merchant Desktop)
 * Fully synchronized with AutoPrint Backend REST API with local offline caching.
 */

import {
  CollectionVerificationRecord,
  PaymentAttempt,
  PaymentGatewayStatus,
  VerificationAuditLog,
  CreateVerificationContext,
} from '../types/verification';
import { BackendApiService } from './backendApiService';

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
    this.syncFromBackend();
  }

  /**
   * Synchronizes state with backend REST API.
   */
  public async syncFromBackend(): Promise<void> {
    try {
      const jobs = await BackendApiService.getAllJobs();
      if (Array.isArray(jobs)) {
        jobs.forEach((j: any) => {
          if (j.verification) {
            this.records.set(j.verification.verificationCode, j.verification);
          }
        });
        this.saveToStorage();
        this.notifyListeners();
      }

      const logs = await BackendApiService.getAuditLogs();
      if (Array.isArray(logs) && logs.length > 0) {
        this.auditLogs = logs;
        this.saveAuditLogsToStorage();
      }
    } catch {
      // Offline fallback
    }
  }

  /**
   * Returns record synchronously from memory/local storage cache.
   */
  public getRecord(code: string): CollectionVerificationRecord | null {
    if (!code) return null;
    const sanitized = code.replace(/[\s\-_]/g, '').trim();
    return this.records.get(sanitized) || null;
  }

  /**
   * Normalizes and performs defensive lookup by raw or formatted verification code.
   */
  public async lookupByCode(inputCode: string, staffId = 'STAFF-DESK-01'): Promise<CollectionVerificationRecord | null> {
    if (!inputCode) return null;
    const sanitized = inputCode.replace(/[\s\-_]/g, '').trim();
    if (!/^\d{8}$/.test(sanitized)) {
      return null;
    }

    try {
      // 1. Primary: Authoritative Backend Lookup
      const backendRecord = await BackendApiService.lookupByCode(sanitized, staffId);
      if (backendRecord) {
        this.records.set(backendRecord.verificationCode, backendRecord);
        this.saveToStorage();
        this.notifyListeners();
        return backendRecord;
      }
    } catch {
      // Network failure, fallback to local storage
    }

    return this.records.get(sanitized) || null;
  }

  /**
   * Creates verification record (used by local electron bridge or fallback).
   */
  public createVerificationRecord(context: CreateVerificationContext): CollectionVerificationRecord {
    const raw = String(Math.floor(10000000 + Math.random() * 90000000));
    const formatted = `${raw.slice(0, 4)} ${raw.slice(4)}`;
    const record: CollectionVerificationRecord = {
      verificationCode: raw,
      formattedCode: formatted,
      jobId: context.job.id,
      jobNo: context.job.jobNo,
      jobTitle: context.job.title,
      printerName: context.job.printerName,
      customerName: context.customerName || 'Walk-In Customer',
      customerPhone: context.customerPhone,
      amountTotal: context.amountTotal,
      currency: context.currency || 'INR',
      failedDigitalAttemptsCount: 0,
      maxDigitalAttemptsAllowed: MAX_DIGITAL_ATTEMPTS,
      isCashLocked: false,
      paymentStatus: context.initialMethod === 'CASH' ? 'CASH_REQUIRED' : 'PENDING',
      paymentAttempts: [],
      handoverStatus: 'PENDING_PRINT',
      securityChecksum: `SEC-${raw.slice(0, 4)}-${raw.slice(4)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.records.set(raw, record);
    this.saveToStorage();
    this.notifyListeners();
    return record;
  }

  /**
   * Sets payment status to CASH_REQUIRED.
   */
  public markCashRequired(verificationCode: string): CollectionVerificationRecord {
    const record = this.getRecord(verificationCode);
    if (!record) {
      throw new Error(`Verification record not found for code: ${verificationCode}`);
    }

    if (!record.isCashLocked) {
      record.paymentStatus = 'CASH_REQUIRED';
      record.updatedAt = new Date().toISOString();
      this.records.set(record.verificationCode, record);
      this.saveToStorage();
      this.notifyListeners();
    }
    return record;
  }

  /**
   * Updates tray ready status when spooler completes document.
   */
  public updateTrayReadyStatus(jobId: string): void {
    for (const record of this.records.values()) {
      if (record.jobId === jobId && record.handoverStatus === 'PENDING_PRINT') {
        record.handoverStatus = 'READY_IN_TRAY';
        record.updatedAt = new Date().toISOString();
        this.records.set(record.verificationCode, record);
        this.saveToStorage();
        this.notifyListeners();
      }
    }
  }

  /**
   * Records a digital/UPI payment attempt and enforces the 3-strike failure lockout.
   */
  public async recordDigitalPaymentAttempt(
    verificationCode: string,
    attempt: Omit<PaymentAttempt, 'attemptId' | 'attemptNumber' | 'timestamp'>
  ): Promise<{ record: CollectionVerificationRecord; strikeLockoutTriggered: boolean }> {
    const status: 'SUCCESS' | 'FAILED' | 'TIMED_OUT' =
      attempt.status === 'SUCCESS' ? 'SUCCESS' : attempt.status === 'TIMED_OUT' ? 'TIMED_OUT' : 'FAILED';

    try {
      const result = await BackendApiService.recordDigitalAttempt({
        verificationCode,
        status,
        vpa: attempt.vpa,
        gatewayRef: attempt.gatewayRef,
        errorCode: attempt.errorCode,
        errorMessage: attempt.errorMessage,
      });

      this.records.set(result.record.verificationCode, result.record);
      this.saveToStorage();
      this.notifyListeners();
      return result;
    } catch (e) {
      console.warn('[VERIFICATION] Backend digital attempt recording failed:', e);
      throw e;
    }
  }

  /**
   * Records cash collection at the counter by staff.
   */
  public async recordCashCollection(
    verificationCode: string,
    tenderedAmount: number,
    staffId = 'STAFF-01',
    staffName = 'Duty Station Cashier'
  ): Promise<CollectionVerificationRecord> {
    const updated = await BackendApiService.recordCashCollection(
      verificationCode,
      tenderedAmount,
      staffId,
      staffName
    );

    this.records.set(updated.verificationCode, updated);
    this.saveToStorage();
    this.notifyListeners();
    return updated;
  }

  /**
   * Confirms physical handover of printed documents to the customer.
   */
  public async confirmDocumentHandover(
    verificationCode: string,
    staffId = 'STAFF-01',
    staffName = 'Duty Station Cashier'
  ): Promise<CollectionVerificationRecord> {
    const updated = await BackendApiService.confirmDocumentHandover(
      verificationCode,
      staffId,
      staffName
    );

    this.records.set(updated.verificationCode, updated);
    this.saveToStorage();
    this.notifyListeners();
    return updated;
  }

  /**
   * Retrieves all registered verification records.
   */
  public getAllRecords(): CollectionVerificationRecord[] {
    return Array.from(this.records.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Retrieves audit logs filtered for a specific verification code or all logs.
   */
  public async fetchAuditLogs(verificationCode?: string): Promise<VerificationAuditLog[]> {
    const logs = await BackendApiService.getAuditLogs(verificationCode);
    if (logs && logs.length > 0) {
      this.auditLogs = logs;
      return logs;
    }
    return this.getAuditLogs(verificationCode);
  }

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
}

export const verificationService = new VerificationWorkflowService();
