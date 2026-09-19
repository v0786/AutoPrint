import { getDb } from '../db';
import { randomUUID } from 'crypto';

export interface SupportTicketRow {
  id: string;
  ticket_no: string;
  source: 'CUSTOMER' | 'MERCHANT' | 'SYSTEM';
  customer_name?: string | null;
  customer_email?: string | null;
  merchant_id?: string | null;
  job_id?: string | null;
  payment_id?: string | null;
  verification_code?: string | null;
  category: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'WAITING_FOR_INFO' | 'RESOLVED' | 'CLOSED' | 'REOPENED';
  description: string;
  expected_behavior?: string | null;
  actual_behavior?: string | null;
  steps_tried?: string | null;
  diagnostics_json?: string | null;
  assigned_to?: string | null;
  resolution_notes?: string | null;
  resolved_at?: string | null;
  sync_status: 'PENDING_SYNC' | 'SYNCED' | 'FAILED';
  cloud_ticket_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupportTicketHistoryRow {
  id: string;
  ticket_id: string;
  previous_status?: string | null;
  new_status: string;
  actor: string;
  notes?: string | null;
  created_at: string;
}

export interface DiagnosticAttachmentRow {
  id: string;
  ticket_id: string;
  file_name: string;
  file_type: string;
  file_size_bytes: number;
  file_path: string;
  redacted: number;
  created_at: string;
}

export interface SupportSyncQueueRow {
  id: string;
  entity_type: 'TICKET' | 'FEEDBACK' | 'DIAGNOSTIC';
  entity_id: string;
  payload_json: string;
  status: 'PENDING' | 'IN_FLIGHT' | 'SUCCESS' | 'FAILED';
  retry_count: number;
  max_retries: number;
  last_error?: string | null;
  next_retry_at: string;
  created_at: string;
  updated_at: string;
}

export const supportRepository = {
  getNextTicketNumber(): string {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomHex = randomUUID().slice(0, 6).toUpperCase();
    return `APT-${today}-${randomHex}`;
  },

  createTicket(params: {
    source: 'CUSTOMER' | 'MERCHANT' | 'SYSTEM';
    customerName?: string;
    customerEmail?: string;
    merchantId?: string;
    jobId?: string;
    paymentId?: string;
    verificationCode?: string;
    category: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    description: string;
    expectedBehavior?: string;
    actualBehavior?: string;
    stepsTried?: string;
    diagnosticsJson?: string;
  }): SupportTicketRow {
    const db = getDb();
    const id = `TKT-${randomUUID()}`;
    const ticketNo = this.getNextTicketNumber();
    const now = new Date().toISOString();
    const priority = params.priority || 'MEDIUM';

    db.prepare(`
      INSERT INTO support_tickets (
        id, ticket_no, source, customer_name, customer_email, merchant_id,
        job_id, payment_id, verification_code, category, priority, status,
        description, expected_behavior, actual_behavior, steps_tried,
        diagnostics_json, sync_status, created_at, updated_at
      ) VALUES (
        @id, @ticket_no, @source, @customer_name, @customer_email, @merchant_id,
        @job_id, @payment_id, @verification_code, @category, @priority, 'OPEN',
        @description, @expected_behavior, @actual_behavior, @steps_tried,
        @diagnostics_json, 'PENDING_SYNC', @created_at, @updated_at
      )
    `).run({
      id,
      ticket_no: ticketNo,
      source: params.source,
      customer_name: params.customerName || null,
      customer_email: params.customerEmail || null,
      merchant_id: params.merchantId || null,
      job_id: params.jobId || null,
      payment_id: params.paymentId || null,
      verification_code: params.verificationCode || null,
      category: params.category,
      priority,
      description: params.description,
      expected_behavior: params.expectedBehavior || null,
      actual_behavior: params.actualBehavior || null,
      steps_tried: params.stepsTried || null,
      diagnostics_json: params.diagnosticsJson || null,
      created_at: now,
      updated_at: now,
    });

    this.addTicketHistory({
      ticketId: id,
      previousStatus: null,
      newStatus: 'OPEN',
      actor: params.source === 'CUSTOMER' ? 'CUSTOMER' : 'MERCHANT',
      notes: 'Support ticket created.',
    });

    // Enqueue for offline sync
    this.enqueueSync({
      entityType: 'TICKET',
      entityId: id,
      payload: {
        ticketNo,
        source: params.source,
        category: params.category,
        priority,
        description: params.description,
        customerName: params.customerName,
        customerEmail: params.customerEmail,
        jobId: params.jobId,
        verificationCode: params.verificationCode,
        createdAt: now,
      },
    });

    return this.getTicketById(id)!;
  },

  getTicketById(id: string): SupportTicketRow | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM support_tickets WHERE id = ?').get(id) as SupportTicketRow | undefined;
    return row || null;
  },

  getTicketByNo(ticketNo: string): SupportTicketRow | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM support_tickets WHERE ticket_no = ?').get(ticketNo) as SupportTicketRow | undefined;
    return row || null;
  },

  getAllTickets(filters?: { source?: string; status?: string; category?: string }): SupportTicketRow[] {
    const db = getDb();
    let query = 'SELECT * FROM support_tickets WHERE 1=1';
    const params: Record<string, any> = {};

    if (filters?.source) {
      query += ' AND source = @source';
      params.source = filters.source;
    }
    if (filters?.status) {
      query += ' AND status = @status';
      params.status = filters.status;
    }
    if (filters?.category) {
      query += ' AND category = @category';
      params.category = filters.category;
    }
    query += ' ORDER BY created_at DESC';

    return db.prepare(query).all(params) as SupportTicketRow[];
  },

  updateTicketStatus(
    id: string,
    newStatus: SupportTicketRow['status'],
    actor: string,
    notes?: string
  ): SupportTicketRow | null {
    const db = getDb();
    const ticket = this.getTicketById(id);
    if (!ticket) return null;

    const now = new Date().toISOString();
    const resolvedAt = (newStatus === 'RESOLVED' || newStatus === 'CLOSED') ? now : ticket.resolved_at;

    db.prepare(`
      UPDATE support_tickets
      SET status = @status,
          resolution_notes = COALESCE(@notes, resolution_notes),
          resolved_at = @resolved_at,
          updated_at = @updated_at
      WHERE id = @id
    `).run({
      id,
      status: newStatus,
      notes: notes || null,
      resolved_at: resolvedAt,
      updated_at: now,
    });

    this.addTicketHistory({
      ticketId: id,
      previousStatus: ticket.status,
      newStatus,
      actor,
      notes,
    });

    return this.getTicketById(id);
  },

  addTicketHistory(params: {
    ticketId: string;
    previousStatus: string | null;
    newStatus: string;
    actor: string;
    notes?: string;
  }): void {
    const db = getDb();
    db.prepare(`
      INSERT INTO support_ticket_history (id, ticket_id, previous_status, new_status, actor, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(
      `TKTH-${randomUUID()}`,
      params.ticketId,
      params.previousStatus,
      params.newStatus,
      params.actor,
      params.notes || null
    );
  },

  getTicketHistory(ticketId: string): SupportTicketHistoryRow[] {
    const db = getDb();
    return db.prepare('SELECT * FROM support_ticket_history WHERE ticket_id = ? ORDER BY created_at ASC').all(ticketId) as SupportTicketHistoryRow[];
  },

  // ─── Sync Queue ─────────────────────────────────────────────────────────────
  enqueueSync(params: {
    entityType: 'TICKET' | 'FEEDBACK' | 'DIAGNOSTIC';
    entityId: string;
    payload: any;
  }): void {
    const db = getDb();
    const id = `SYNC-${randomUUID()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO support_sync_queue (
        id, entity_type, entity_id, payload_json, status, retry_count, max_retries, next_retry_at, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, 'PENDING', 0, 5, ?, ?, ?
      )
    `).run(
      id,
      params.entityType,
      params.entityId,
      JSON.stringify(params.payload),
      now,
      now,
      now
    );
  },

  getPendingSyncItems(limit = 10): SupportSyncQueueRow[] {
    const db = getDb();
    const now = new Date().toISOString();
    return db.prepare(`
      SELECT * FROM support_sync_queue
      WHERE (status = 'PENDING' OR status = 'FAILED') AND retry_count < max_retries AND next_retry_at <= ?
      ORDER BY next_retry_at ASC
      LIMIT ?
    `).all(now, limit) as SupportSyncQueueRow[];
  },

  updateSyncStatus(id: string, status: 'SUCCESS' | 'FAILED', error?: string): void {
    const db = getDb();
    const now = new Date().toISOString();
    const current = db.prepare('SELECT retry_count FROM support_sync_queue WHERE id = ?').get(id) as { retry_count: number } | undefined;
    const retryCount = (current?.retry_count ?? 0) + 1;
    // Exponential backoff in minutes: 1m, 2m, 4m, 8m, 16m
    const backoffMinutes = Math.pow(2, retryCount);
    const nextRetryDate = new Date(Date.now() + backoffMinutes * 60000).toISOString();

    db.prepare(`
      UPDATE support_sync_queue
      SET status = @status,
          retry_count = @retry_count,
          last_error = @error,
          next_retry_at = @next_retry_at,
          updated_at = @now
      WHERE id = @id
    `).run({
      id,
      status,
      retry_count: retryCount,
      error: error || null,
      next_retry_at: status === 'SUCCESS' ? now : nextRetryDate,
      now,
    });
  },

  getSyncQueueSummary(): { pending: number; failed: number; success: number } {
    const db = getDb();
    const rows = db.prepare(`
      SELECT status, COUNT(*) as count FROM support_sync_queue GROUP BY status
    `).all() as Array<{ status: string; count: number }>;

    let pending = 0;
    let failed = 0;
    let success = 0;

    for (const r of rows) {
      if (r.status === 'PENDING') pending = r.count;
      if (r.status === 'FAILED') failed = r.count;
      if (r.status === 'SUCCESS') success = r.count;
    }
    return { pending, failed, success };
  },
};
