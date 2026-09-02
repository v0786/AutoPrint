import { auditRepository } from '../database/repositories/auditRepository';
import { AuditLogEntry, AuditAction, AuditActor } from '../types';

class AuditLoggerService {
  public logEvent(params: {
    verificationCode: string;
    jobId: string;
    jobNo: string;
    action: AuditAction;
    actor: AuditActor;
    staffId?: string;
    staffName?: string;
    ipAddressOrStation?: string;
    details?: Record<string, unknown>;
  }): AuditLogEntry {
    const entry = auditRepository.append(params);
    
    // Structured console output for observability (excluding sensitive fields)
    const timestamp = new Date().toISOString();
    console.log(`[AUDIT] [${timestamp}] [${params.action}] Code: ${params.verificationCode}, Job: ${params.jobNo}, Actor: ${params.actor}`);
    
    return entry;
  }

  public getLogs(verificationCode?: string): AuditLogEntry[] {
    if (verificationCode) {
      return auditRepository.getByCode(verificationCode);
    }
    return auditRepository.getAll();
  }

  public getLogsByJobId(jobId: string): AuditLogEntry[] {
    return auditRepository.getByJobId(jobId);
  }
}

export const auditLogger = new AuditLoggerService();
