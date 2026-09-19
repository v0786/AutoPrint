import { refundRepository, RefundRequestRow } from '../database/repositories/refundRepository';
import { verificationRepository } from '../database/repositories/verificationRepository';
import { jobRepository } from '../database/repositories/jobRepository';
import { AutoPrintService } from './autoprintService';
import { AppError } from '../types';

export class RefundService {
  /**
   * Submits a refund review request for a print job.
   * Requires mandatory reason and detailed explanation.
   */
  public static createRefundRequest(params: {
    jobId: string;
    reason: string;
    detailedExplanation: string;
    staffName?: string;
  }): RefundRequestRow {
    if (!params.reason || params.reason.trim().length === 0) {
      throw new AppError('A valid refund reason category is required.', 400);
    }
    if (!params.detailedExplanation || params.detailedExplanation.trim().length < 15) {
      throw new AppError('A detailed explanation is required (at least 15 characters). Explain what was checked and why a refund is required.', 400);
    }

    const job = jobRepository.getById(params.jobId);
    if (!job) {
      throw new AppError('Print job not found.', 404);
    }

    const verification = verificationRepository.getByJobId(job.id);
    const verificationCode = verification?.verificationCode || 'UNKNOWN';
    const paymentId = verification?.upiTransactionId || undefined;

    // Check for existing refund request
    const existing = refundRepository.getRefundByJobId(job.id);
    if (existing && existing.status !== 'REFUND_REJECTED') {
      throw new AppError(`A refund request (#${existing.id}) is already active in status: ${existing.status}`, 409);
    }

    const refund = refundRepository.createRefundRequest({
      jobId: job.id,
      verificationCode,
      paymentId,
      amountMinorUnits: job.amount_minor_units,
      currency: job.currency,
      customerName: job.customer_name,
      reason: params.reason,
      detailedExplanation: params.detailedExplanation,
      requestedBy: params.staffName || 'MERCHANT',
    });

    AutoPrintService.recordStatusTransition(
      job.id,
      job.status,
      'REFUND_REQUESTED',
      params.staffName || 'MERCHANT',
      params.reason
    );

    return refund;
  }

  public static getAllRefunds(statusFilter?: string): RefundRequestRow[] {
    return refundRepository.getAllRefunds(statusFilter);
  }

  public static getRefundById(id: string): RefundRequestRow | null {
    return refundRepository.getRefundById(id);
  }

  public static updateRefundStatus(params: {
    id: string;
    status: RefundRequestRow['status'];
    staffName: string;
    reviewNotes?: string;
    gatewayRefundId?: string;
  }): RefundRequestRow {
    const updated = refundRepository.updateRefundStatus(params);
    if (!updated) {
      throw new AppError('Refund request not found.', 404);
    }

    AutoPrintService.recordStatusTransition(
      updated.job_id,
      'REFUND_REQUESTED',
      params.status,
      params.staffName,
      params.reviewNotes
    );

    return updated;
  }
}
