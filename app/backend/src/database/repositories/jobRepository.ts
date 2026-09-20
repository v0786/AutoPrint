/**
 * Job Repository — Persistent print job storage backed by SQLite
 */

import { getDb } from '../db.js';
import { PrintJobRow, PrintJobStatus } from '../../types/index.js';

function nextJobNumber(): string {
  const db = getDb();
  const result = db.prepare(`
    UPDATE job_sequence SET seq = seq + 1 WHERE id = 1
    RETURNING seq
  `).get() as { seq: number };
  return `#${String(result.seq).padStart(4, '0')}`;
}

export const jobRepository = {
  create(row: Omit<PrintJobRow, 'created_at' | 'updated_at'> & { job_no?: string }): PrintJobRow {
    const db = getDb();
    const jobNo = row.job_no || nextJobNumber();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO print_jobs (
        id, job_no, title, file_name, file_path, file_hash, processed_file_path,
        customer_access_token_hash,
        customer_name, customer_phone, printer_id, printer_name,
        color_mode, copies, page_range, paper_size, duplex, finishing,
        print_settings_json,
        amount_minor_units, currency, payment_method,
        payment_status, payment_transaction_id, print_status,
        paid_at, queued_at, printing_started_at, printed_at,
        ready_for_pickup_at, collected_at, pickup_code,
        status, created_at, updated_at
      ) VALUES (
        @id, @job_no, @title, @file_name, @file_path, @file_hash, @processed_file_path,
        @customer_access_token_hash,
        @customer_name, @customer_phone, @printer_id, @printer_name,
        @color_mode, @copies, @page_range, @paper_size, @duplex, @finishing,
        @print_settings_json,
        @amount_minor_units, @currency, @payment_method,
        @payment_status, @payment_transaction_id, @print_status,
        @paid_at, @queued_at, @printing_started_at, @printed_at,
        @ready_for_pickup_at, @collected_at, @pickup_code,
        @status, @created_at, @updated_at
      )
    `).run({
      ...row,
      job_no: jobNo,
      file_hash: row.file_hash ?? null,
      customer_access_token_hash: row.customer_access_token_hash ?? null,
      processed_file_path: row.processed_file_path ?? null,
      customer_phone: row.customer_phone ?? null,
      printer_id: row.printer_id ?? null,
      print_settings_json: row.print_settings_json ?? null,
      payment_status: row.payment_status || 'PAYMENT_PENDING',
      payment_transaction_id: row.payment_transaction_id ?? null,
      print_status: row.print_status || 'AWAITING_PAYMENT',
      paid_at: row.paid_at ?? null,
      queued_at: row.queued_at ?? null,
      printing_started_at: row.printing_started_at ?? null,
      printed_at: row.printed_at ?? null,
      ready_for_pickup_at: row.ready_for_pickup_at ?? null,
      collected_at: row.collected_at ?? null,
      pickup_code: row.pickup_code ?? null,
      created_at: now,
      updated_at: now,
    });

    return this.getById(row.id)!;
  },

  getById(id: string): PrintJobRow | null {
    const db = getDb();
    return (db.prepare('SELECT * FROM print_jobs WHERE id = ?').get(id) as PrintJobRow | undefined) ?? null;
  },

  getByPickupCode(code: string): PrintJobRow | null {
    const db = getDb();
    return (db.prepare('SELECT * FROM print_jobs WHERE pickup_code = ?').get(code) as PrintJobRow | undefined) ?? null;
  },

  hasValidCustomerAccessToken(id: string, token: string): boolean {
    const row = this.getById(id);
    if (!row?.customer_access_token_hash || !token) return false;
    const crypto = require('crypto') as typeof import('crypto');
    const actual = crypto.createHash('sha256').update(token).digest('hex');
    const expectedBuffer = Buffer.from(row.customer_access_token_hash, 'utf8');
    const actualBuffer = Buffer.from(actual, 'utf8');
    return expectedBuffer.length === actualBuffer.length && crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  },

  getAll(): PrintJobRow[] {
    const db = getDb();
    return db.prepare('SELECT * FROM print_jobs ORDER BY created_at DESC').all() as PrintJobRow[];
  },

  updateStatus(id: string, status: PrintJobStatus): void {
    const db = getDb();
    db.prepare(`
      UPDATE print_jobs SET status = @status, updated_at = @now WHERE id = @id
    `).run({ id, status, now: new Date().toISOString() });
  },

  updatePrintStatus(id: string, printStatus: string): void {
    const db = getDb();
    db.prepare(`
      UPDATE print_jobs SET print_status = @printStatus, updated_at = @now WHERE id = @id
    `).run({ id, printStatus, now: new Date().toISOString() });
  },

  /**
   * Transitions job to PAID and QUEUED status upon verified payment.
   */
  markPaid(id: string, transactionId?: string): boolean {
    const db = getDb();
    const now = new Date().toISOString();
    const result = db.prepare(`
      UPDATE print_jobs
      SET payment_status = 'PAID',
          payment_transaction_id = COALESCE(@transactionId, payment_transaction_id),
          status = 'QUEUED',
          print_status = 'QUEUED',
          paid_at = COALESCE(paid_at, @now),
          queued_at = COALESCE(queued_at, @now),
          updated_at = @now
      WHERE id = @id AND payment_status != 'PAID'
    `).run({ id, transactionId: transactionId ?? null, now });
    return result.changes > 0;
  },

  /**
   * Atomic reservation lock for print execution.
   * Ensures two printer workers cannot claim or print the same job simultaneously.
   */
  claimForPrinting(id: string): boolean {
    const db = getDb();
    const now = new Date().toISOString();
    const result = db.prepare(`
      UPDATE print_jobs
      SET status = 'PRINTING',
          print_status = 'PRINTING',
          printing_started_at = @now,
          updated_at = @now
      WHERE id = @id
        AND payment_status = 'PAID'
        AND status IN ('QUEUED', 'PAID', 'READY_FOR_PRINT')
        AND print_status NOT IN ('PRINTING', 'PRINTED')
    `).run({ id, now });
    return result.changes > 0;
  },

  markPrinted(id: string): void {
    const db = getDb();
    const now = new Date().toISOString();
    db.prepare(`
      UPDATE print_jobs
      SET status = 'READY_FOR_PICKUP',
          print_status = 'PRINTED',
          printed_at = @now,
          ready_for_pickup_at = @now,
          updated_at = @now
      WHERE id = @id
    `).run({ id, now });
  },

  markCollected(id: string): boolean {
    const db = getDb();
    const now = new Date().toISOString();
    const result = db.prepare(`
      UPDATE print_jobs
      SET status = 'COLLECTED',
          collected_at = @now,
          updated_at = @now
      WHERE id = @id AND status != 'COLLECTED'
    `).run({ id, now });
    return result.changes > 0;
  },

  updateProcessedFilePath(id: string, processedPath: string): void {
    const db = getDb();
    db.prepare(`
      UPDATE print_jobs SET processed_file_path = @path, updated_at = @now WHERE id = @id
    `).run({ id, path: processedPath, now: new Date().toISOString() });
  },

  delete(id: string): void {
    const db = getDb();
    db.prepare('DELETE FROM print_jobs WHERE id = ?').run(id);
  },

  getNextJobNumber(): string {
    return nextJobNumber();
  },
};
