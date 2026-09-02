import { VerificationAuditLog, VerificationAction, VerificationActor } from '../types';

class AuditLoggerService {
  private auditLogs: VerificationAuditLog[] = [];

  public logEvent(params: {
    verificationCode: string;
    jobId: string;
    jobNo: string;
    action: VerificationAction;
    actor: VerificationActor;
    staffId?: string;
    staffName?: string;
    ipAddressOrStation?: string;
    details?: Record<string, any>;
  }): VerificationAuditLog {
    const entry: VerificationAuditLog = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      verificationCode: params.verificationCode,
      jobId: params.jobId,
      jobNo: params.jobNo,
      action: params.action,
      actor: params.actor,
      staffId: params.staffId,
      staffName: params.staffName,
      ipAddressOrStation: params.ipAddressOrStation || 'BACKEND-CORE-NODE',
      details: params.details || {},
    };

    this.auditLogs.unshift(entry);
    if (this.auditLogs.length > 1000) {
      this.auditLogs = this.auditLogs.slice(0, 1000);
    }
    return entry;
  }

  public getLogs(verificationCode?: string): VerificationAuditLog[] {
    if (!verificationCode) return [...this.auditLogs];
    return this.auditLogs.filter((log) => log.verificationCode === verificationCode);
  }

  public clearLogs(): void {
    this.auditLogs = [];
  }
}

export const auditLogger = new AuditLoggerService();
