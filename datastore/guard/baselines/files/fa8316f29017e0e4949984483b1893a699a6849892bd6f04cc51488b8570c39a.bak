/**
 * Audit Log Repository — Persistent, append-only audit trail
 */

import { getDb } from '../db.js';
import { AuditLogEntry, AuditAction, AuditActor } from '../../types/index.js';
import { randomUUID } from 'crypto';

interface AuditRow {
  id: string;
  timestamp: string;
  verification_code: string;
  job_id: string;
  job_no: string;
  action: string;
  actor: string;
  staff_id: string | null;
  staff_name: string | null;
  ip_address_or_station: string;
  details: string;
}

function rowToEntry(row: AuditRow): AuditLogEntry {
  return {
    id: row.id,
    timestamp: row.timestamp,
    verificationCode: row.verification_code,
    jobId: row.job_id,
    jobNo: row.job_no,
    action: row.action as AuditAction,
    actor: row.actor as AuditActor,
    staffId: row.staff_id ?? undefined,
    staffName: row.staff_name ?? undefined,
    ipAddressOrStation: row.ip_address_or_station,
    details: JSON.parse(row.details) as Record<string, unknown>,
  };
}

export const auditRepository = {
  append(params: {
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
    const db = getDb();
    const entry: AuditLogEntry = {
      id: randomUUID(),
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

    db.prepare(`
      INSERT INTO audit_logs (
        id, timestamp, verification_code, job_id, job_no,
        action, actor, staff_id, staff_name,
        ip_address_or_station, details
      ) VALUES (
        @id, @timestamp, @verification_code, @job_id, @job_no,
        @action, @actor, @staff_id, @staff_name,
        @ip_address_or_station, @details
      )
    `).run({
      id: entry.id,
      timestamp: entry.timestamp,
      verification_code: entry.verificationCode,
      job_id: entry.jobId,
      job_no: entry.jobNo,
      action: entry.action,
      actor: entry.actor,
      staff_id: entry.staffId ?? null,
      staff_name: entry.staffName ?? null,
      ip_address_or_station: entry.ipAddressOrStation,
      details: JSON.stringify(entry.details),
    });

    return entry;
  },

  getAll(limit = 500): AuditLogEntry[] {
    const db = getDb();
    const rows = db.prepare(
      'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?'
    ).all(limit) as AuditRow[];
    return rows.map(rowToEntry);
  },

  getByCode(code: string): AuditLogEntry[] {
    const db = getDb();
    const rows = db.prepare(
      'SELECT * FROM audit_logs WHERE verification_code = ? ORDER BY timestamp DESC'
    ).all(code) as AuditRow[];
    return rows.map(rowToEntry);
  },

  getByJobId(jobId: string): AuditLogEntry[] {
    const db = getDb();
    const rows = db.prepare(
      'SELECT * FROM audit_logs WHERE job_id = ? ORDER BY timestamp DESC'
    ).all(jobId) as AuditRow[];
    return rows.map(rowToEntry);
  },
};
