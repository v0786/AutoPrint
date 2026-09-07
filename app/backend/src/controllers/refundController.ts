import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RefundService } from '../services/refundService';

const createRefundSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
  reason: z.string().min(1, 'Reason category is required'),
  detailedExplanation: z.string().min(15, 'Detailed explanation must be at least 15 characters'),
  staffName: z.string().optional(),
});

const updateRefundSchema = z.object({
  status: z.enum(['REFUND_REQUESTED', 'REFUND_UNDER_REVIEW', 'REFUND_APPROVED', 'REFUND_PROCESSING', 'REFUNDED', 'REFUND_REJECTED']),
  staffName: z.string().default('STAFF'),
  reviewNotes: z.string().optional(),
  gatewayRefundId: z.string().optional(),
});

export class RefundController {
  public static create(req: Request, res: Response, next: NextFunction): void {
    try {
      const parsed = createRefundSchema.parse(req.body);
      const refund = RefundService.createRefundRequest(parsed);
      res.status(201).json({
        ok: true,
        message: 'Refund review request submitted successfully.',
        data: refund,
      });
    } catch (err) {
      next(err);
    }
  }

  public static getAll(req: Request, res: Response, next: NextFunction): void {
    try {
      const { status } = req.query as { status?: string };
      const refunds = RefundService.getAllRefunds(status);
      res.json({ ok: true, count: refunds.length, data: refunds });
    } catch (err) {
      next(err);
    }
  }

  public static getById(req: Request, res: Response, next: NextFunction): void {
    try {
      const { id } = req.params;
      const refund = RefundService.getRefundById(id);
      if (!refund) {
        res.status(404).json({ ok: false, error: 'Refund request not found' });
        return;
      }
      res.json({ ok: true, data: refund });
    } catch (err) {
      next(err);
    }
  }

  public static updateStatus(req: Request, res: Response, next: NextFunction): void {
    try {
      const { id } = req.params;
      const { status, staffName, reviewNotes, gatewayRefundId } = updateRefundSchema.parse(req.body);
      const updated = RefundService.updateRefundStatus({
        id,
        status,
        staffName,
        reviewNotes,
        gatewayRefundId,
      });
      res.json({ ok: true, message: `Refund status updated to ${status}`, data: updated });
    } catch (err) {
      next(err);
    }
  }
}
