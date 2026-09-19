import { getDb } from '../db';
import { randomUUID } from 'crypto';
import { jobRepository } from './jobRepository';

export interface RefundRequestRow {
  id: string;
  job_id: string;
  verification_code: string;
  payment_id?: string | null;
  amount_minor_units: number;
  currency: string;
  customer_name: string;
  reason: string;
  detailed_explanation: string;
  status: 'REFUND_REQUESTED' | 'REFUND_UNDER_REVIEW' | 'REFUND_APPROVED' | 'REFUND_PROCESSING' | 'REFUNDED' | 'REFUND_REJECTED';
  requested_by: string;
  reviewed_by_staff?: string | null;
  review_notes?: string | null;
  gateway_refund_id?: string | null;
  created_at: string;
  updated_at: string;
}

export const refundRepository = {
  createRefundRequest(params: {
    jobId: string;
    verificationCode: string;
    paymentId?: string;
    amountMinorUnits: number;
    currency?: string;
    customerName: string;
    reason: string;
    detailedExplanation: string;
    requestedBy?: string;
  }): RefundRequestRow {
    const db = getDb();
    const id = `REF-${randomUUID()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO refund_requests (
        id, job_id, verification_code, payment_id, amount_minor_units, currency,
        customer_name, reason, detailed_explanation, status, requested_by,
        created_at, updated_at
      ) VALUES (
        @id, @job_id, @verification_code, @payment_id, @amount_minor_units, @currency,
        @customer_name, @reason, @detailed_explanation, 'REFUND_REQUESTED', @requested_by,
        @created_at, @updated_at
      )
    `).run({
      id,
      job_id: params.jobId,
      verification_code: params.verificationCode,
      payment_id: params.paymentId || null,
      amount_minor_units: params.amountMinorUnits,
      currency: params.currency || 'INR',
      customer_name: params.customerName,
      reason: params.reason,
      detailed_explanation: params.detailedExplanation,
      requested_by: params.requestedBy || 'MERCHANT',
      created_at: now,
      updated_at: now,
    });

    // Update job status to REFUND_REQUESTED
    jobRepository.updateStatus(params.jobId, 'REFUND_REQUESTED');

    return this.getRefundById(id)!;
  },

  getRefundById(id: string): RefundRequestRow | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM refund_requests WHERE id = ?').get(id) as RefundRequestRow | undefined;
    return row || null;
  },

  getRefundByJobId(jobId: string): RefundRequestRow | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM refund_requests WHERE job_id = ? ORDER BY created_at DESC LIMIT 1').get(jobId) as RefundRequestRow | undefined;
    return row || null;
  },

  getAllRefunds(statusFilter?: string): RefundRequestRow[] {
    const db = getDb();
    if (statusFilter) {
      return db.prepare('SELECT * FROM refund_requests WHERE status = ? ORDER BY created_at DESC').all(statusFilter) as RefundRequestRow[];
    }
    return db.prepare('SELECT * FROM refund_requests ORDER BY created_at DESC').all() as RefundRequestRow[];
  },

  updateRefundStatus(params: {
    id: string;
    status: RefundRequestRow['status'];
    staffName?: string;
    reviewNotes?: string;
    gatewayRefundId?: string;
  }): RefundRequestRow | null {
    const db = getDb();
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE refund_requests
      SET status = @status,
          reviewed_by_staff = COALESCE(@staffName, reviewed_by_staff),
          review_notes = COALESCE(@reviewNotes, review_notes),
          gateway_refund_id = COALESCE(@gatewayRefundId, gateway_refund_id),
          updated_at = @now
      WHERE id = @id
    `).run({
      id: params.id,
      status: params.status,
      staffName: params.staffName || null,
      reviewNotes: params.reviewNotes || null,
      gatewayRefundId: params.gatewayRefundId || null,
      now,
    });

    const refund = this.getRefundById(params.id);
    if (refund && params.status === 'REFUNDED') {
      jobRepository.updateStatus(refund.job_id, 'REFUNDED');
    }

    return refund;
  },
};
