/**
 * Local Print Job Repository
 * Manages the SQLite local queue for offline-first resilience, idempotency locking,
 * duplicate print prevention, and crash recovery.
 */

import { getDb } from '../db';
import { CloudJobStatus } from '../../services/stateMachine/printJobStateMachine';
import { InstallationIdentityRepository } from './installationIdentityRepository';

export interface LocalPrintJobRow {
  job_id: string;
  merchant_id: string;
  device_id: string | null;
  status: CloudJobStatus | string;
  local_file_path: string | null;
  storage_path: string | null;
  file_hash: string | null;
  file_size: number | null;
  printer_id: string | null;
  attempt_count: number;
  lock_acquired_at: string | null;
  created_at: string;
  last_attempt_at: string | null;
  error_message: string | null;
  updated_at?: string;
  printed_at?: string | null;
}

export class LocalPrintJobRepository {
  /**
   * Fetches local print job by ID
   */
  public static get(jobId: string): LocalPrintJobRow | null {
    const db = getDb();
    return (db.prepare('SELECT * FROM local_print_jobs WHERE job_id = ?').get(jobId) as LocalPrintJobRow) || null;
  }

  /** Compatibility alias for integrations that use repository naming conventions. */
  public static getById(jobId: string): LocalPrintJobRow | null {
    return this.get(jobId);
  }

  /**
   * Inserts a locally received cloud job idempotently. Repeated Realtime events
   * return the existing row instead of creating another physical print.
   */
  public static create(input: {
    job_id: string;
    merchant_id?: string;
    device_id?: string;
    storage_path?: string | null;
    file_hash?: string | null;
    file_size?: number | null;
    status?: CloudJobStatus | string;
    attempt_count?: number;
    printer_id?: string | null;
  }): LocalPrintJobRow {
    const db = getDb();
    const existing = this.get(input.job_id);
    if (existing) return existing;

    db.prepare(`
      INSERT INTO local_print_jobs (
        job_id, merchant_id, device_id, status, storage_path, file_hash,
        file_size, printer_id, attempt_count, created_at, last_attempt_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(
      input.job_id,
      input.merchant_id || InstallationIdentityRepository.get()?.merchant_id || process.env.MERCHANT_ID || 'LOCAL_UNCONFIGURED',
      input.device_id || null,
      input.status || 'RECEIVED',
      input.storage_path || null,
      input.file_hash || null,
      input.file_size ?? null,
      input.printer_id || null,
      input.attempt_count ?? 0
    );

    return this.get(input.job_id)!;
  }

  /**
   * Attempts to atomically claim a job for local processing.
   * Returns true if lock was acquired, or false if already claimed/completed.
   */
  public static claimJob(
    jobId: string,
    merchantId: string,
    storagePath: string,
    printerId?: string | null,
    fileHash?: string | null,
    fileSize?: number | null,
    initialStatus: string = 'PRINTING'
  ): boolean {
    const db = getDb();
    const existing = this.get(jobId);

    if (existing) {
      // If already completed or currently processing, reject claim to prevent duplicates
      if (['DOWNLOADING', 'FILE_READY', 'QUEUED', 'PRINTING', 'PRINTED', 'READY_FOR_COLLECTION', 'COLLECTED'].includes(existing.status)) {
        return false;
      }

      // If in retryable failed state, allow re-acquiring lock
      if (existing.status === 'PRINT_FAILED' || existing.status === 'READY_TO_PRINT' || existing.status === 'DOWNLOAD_FAILED' || existing.status === 'FILE_VERIFICATION_FAILED') {
        const stmt = db.prepare(`
          UPDATE local_print_jobs
          SET status = ?,
              lock_acquired_at = datetime('now'),
              attempt_count = attempt_count + 1,
              last_attempt_at = datetime('now'),
              file_hash = COALESCE(?, file_hash),
              file_size = COALESCE(?, file_size),
              error_message = NULL
          WHERE job_id = ? AND status IN ('PRINT_FAILED', 'READY_TO_PRINT', 'DOWNLOAD_FAILED', 'FILE_VERIFICATION_FAILED')
        `);
        const res = stmt.run(initialStatus, fileHash || null, fileSize ?? null, jobId);
        return res.changes > 0;
      }

      return false;
    }

    try {
      const stmt = db.prepare(`
        INSERT INTO local_print_jobs (
          job_id, merchant_id, status, storage_path, file_hash, file_size, printer_id,
          attempt_count, lock_acquired_at, created_at, last_attempt_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?, ?,
          1, datetime('now'), datetime('now'), datetime('now')
        )
      `);
      stmt.run(jobId, merchantId, initialStatus, storagePath, fileHash || null, fileSize ?? null, printerId || null);
      return true;
    } catch (err) {
      // Unique constraint violation means another thread/process claimed it
      return false;
    }
  }

  /**
   * Sets file hash once computed or verified
   */
  public static setFileHash(jobId: string, fileHash: string): void {
    const db = getDb();
    db.prepare(`
      UPDATE local_print_jobs
      SET file_hash = ?
      WHERE job_id = ?
    `).run(fileHash, jobId);
  }

  public static setFileSize(jobId: string, fileSize: number): void {
    const db = getDb();
    db.prepare('UPDATE local_print_jobs SET file_size = ?, updated_at = datetime(\'now\') WHERE job_id = ?')
      .run(fileSize, jobId);
  }

  /**
   * Updates local status and optional error message
   */
  public static updateStatus(jobId: string, status: CloudJobStatus | string, errorMessage?: string | null): void {
    const db = getDb();
    db.prepare(`
      UPDATE local_print_jobs
      SET status = ?,
          error_message = ?,
          last_attempt_at = datetime('now'),
          updated_at = datetime('now'),
          printed_at = CASE WHEN ? = 'PRINTED' THEN COALESCE(printed_at, datetime('now')) ELSE printed_at END
      WHERE job_id = ?
    `).run(status, errorMessage || null, status, jobId);
  }

  /**
   * Sets local file path once downloaded
   */
  public static setLocalFilePath(jobId: string, localFilePath: string): void {
    const db = getDb();
    db.prepare(`
      UPDATE local_print_jobs
      SET local_file_path = ?
      WHERE job_id = ?
    `).run(localFilePath, jobId);
  }

  /**
   * Checks if a job has already been printed or is currently in-progress
   */
  public static isAlreadyProcessedOrActive(jobId: string): boolean {
    const existing = this.get(jobId);
    if (!existing) return false;
    return ['DOWNLOADING', 'FILE_READY', 'QUEUED', 'PRINTING', 'PRINTED', 'READY_FOR_COLLECTION', 'COLLECTED'].includes(existing.status);
  }

  /**
   * Retrieves all unfinished jobs for crash recovery
   */
  public static getUnfinishedJobs(merchantId: string): LocalPrintJobRow[] {
    const db = getDb();
    return db.prepare(`
      SELECT * FROM local_print_jobs
      WHERE merchant_id = ?
        AND status IN ('READY_TO_PRINT', 'DOWNLOADING', 'FILE_READY', 'QUEUED', 'PRINTING')
      ORDER BY created_at ASC
    `).all(merchantId) as LocalPrintJobRow[];
  }
}

// Keep the original functional import contract used by the architecture tests
// and older integrations while exposing the class-based repository above.
export const localPrintJobRepository = {
  get: (jobId: string) => LocalPrintJobRepository.get(jobId),
  getById: (jobId: string) => LocalPrintJobRepository.get(jobId),
  create: (input: Parameters<typeof LocalPrintJobRepository.create>[0]) => LocalPrintJobRepository.create(input),
  updateStatus: (jobId: string, status: CloudJobStatus | string, errorMessage?: string | null) =>
    LocalPrintJobRepository.updateStatus(jobId, status, errorMessage),
  isAlreadyProcessedOrActive: (jobId: string) => LocalPrintJobRepository.isAlreadyProcessedOrActive(jobId),
};
