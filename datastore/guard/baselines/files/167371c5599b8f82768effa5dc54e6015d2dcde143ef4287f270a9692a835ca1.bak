import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { VerificationService } from '../services/verificationService';
import { AutoPrintService } from '../services/autoprintService';
import { verificationRepository } from '../database/repositories/verificationRepository';
import { jobRepository } from '../database/repositories/jobRepository';
import { auditLogger } from '../utils/auditLogger';
import { AppError } from '../types';

const lookupSchema = z.object({
  code: z.string().min(1, 'Verification code is required'),
  staffId: z.string().optional(),
});

const cashCollectionSchema = z.object({
  verificationCode: z.string().min(1, 'Verification code is required'),
  tenderedMinorUnits: z.coerce.number().int().positive().optional(),
  tenderedAmount: z.coerce.number().positive().optional(),
  staffId: z.string().default('STAFF-01'),
  staffName: z.string().default('Duty Station Cashier'),
});

const handoverSchema = z.object({
  verificationCode: z.string().min(1, 'Verification code is required'),
  staffId: z.string().default('STAFF-01'),
  staffName: z.string().default('Duty Station Cashier'),
});

export class VerificationController {
  public static lookupByCode(req: Request, res: Response, next: NextFunction): void {
    try {
      const code = (req.params.code || req.body.code || req.query.code) as string;
      if (!code) {
        throw new AppError('Verification code is required.', 400);
      }
      const staffId = (req.query.staffId as string) || req.body.staffId || 'STAFF-DESK-01';
      const record = VerificationService.lookupByCode(code, staffId);
      res.json({
        ok: true,
        data: record,
      });
    } catch (err) {
      next(err);
    }
  }

  public static async processCashCollection(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = cashCollectionSchema.parse(req.body);

      let tenderedMinorUnits: number;
      if (parsed.tenderedMinorUnits !== undefined) {
        tenderedMinorUnits = parsed.tenderedMinorUnits;
      } else if (parsed.tenderedAmount !== undefined) {
        tenderedMinorUnits = Math.round(parsed.tenderedAmount * 100);
      } else {
        throw new AppError('tenderedMinorUnits or tenderedAmount is required.', 400);
      }

      const record = VerificationService.processCashCollection(
        parsed.verificationCode,
        tenderedMinorUnits,
        parsed.staffId,
        parsed.staffName
      );

      // Confirm cash payment and trigger print execution idempotently
      await AutoPrintService.confirmCashPayment(
        record.jobId,
        parsed.staffId,
        parsed.staffName,
        tenderedMinorUnits
      );

      const refreshedRecord = VerificationService.lookupByCode(parsed.verificationCode, parsed.staffId);

      res.json({
        ok: true,
        message: 'Cash collection completed successfully and print job dispatched.',
        data: refreshedRecord,
      });
    } catch (err) {
      next(err);
    }
  }

  public static confirmHandover(req: Request, res: Response, next: NextFunction): void {
    try {
      const parsed = handoverSchema.parse(req.body);

      const record = VerificationService.confirmHandover(
        parsed.verificationCode,
        parsed.staffId,
        parsed.staffName
      );

      if (record.jobId) {
        jobRepository.markCollected(record.jobId);
      }

      res.json({
        ok: true,
        message: 'Document handover confirmed successfully.',
        data: record,
      });
    } catch (err) {
      next(err);
    }
  }

  public static getAllRecords(req: Request, res: Response, next: NextFunction): void {
    try {
      const records = verificationRepository.getAll();
      res.json({
        ok: true,
        count: records.length,
        data: records,
      });
    } catch (err) {
      next(err);
    }
  }

  public static getAuditLogs(req: Request, res: Response, next: NextFunction): void {
    try {
      const verificationCode = (req.query.code || req.params.code) as string | undefined;
      const logs = auditLogger.getLogs(verificationCode);
      res.json({
        ok: true,
        count: logs.length,
        data: logs,
      });
    } catch (err) {
      next(err);
    }
  }
}