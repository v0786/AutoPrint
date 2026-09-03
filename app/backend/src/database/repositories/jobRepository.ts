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
        id, job_no, title, file_name, file_path, processed_file_path,
        customer_name, customer_phone, printer_id, printer_name,
        color_mode, copies, page_range, paper_size, duplex, finishing,
        amount_minor_units, currency, payment_method, status,
        created_at, updated_at
      ) VALUES (
        @id, @job_no, @title, @file_name, @file_path, @processed_file_path,
        @customer_name, @customer_phone, @printer_id, @printer_name,
        @color_mode, @copies, @page_range, @paper_size, @duplex, @finishing,
        @amount_minor_units, @currency, @payment_method, @status,
        @created_at, @updated_at
      )
    `).run({
      ...row,
      job_no: jobNo,
      processed_file_path: row.processed_file_path ?? null,
      customer_phone: row.customer_phone ?? null,
      printer_id: row.printer_id ?? null,
      created_at: now,
      updated_at: now,
    });

    return this.getById(row.id)!;
  },

  getById(id: string): PrintJobRow | null {
    const db = getDb();
    return (db.prepare('SELECT * FROM print_jobs WHERE id = ?').get(id) as PrintJobRow | undefined) ?? null;
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
