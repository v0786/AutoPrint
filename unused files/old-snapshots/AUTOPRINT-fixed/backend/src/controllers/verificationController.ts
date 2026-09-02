import { Request, Response, NextFunction } from 'express';
import { VerificationService } from '../services/verificationService';
import { auditLogger } from '../utils/auditLogger';

export class VerificationController {
  public static lookupByCode(req: Request, res: Response, next: NextFunction): void {
    try {
      const code = req.params.code || req.body.code;
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

  public static processCashCollection(req: Request, res: Response, next: NextFunction): void {
    try {
      const { verificationCode, tenderedAmount, staffId, staffName } = req.body;
      if (!verificationCode || tenderedAmount === undefined) {
        res.status(400).json({ ok: false, error: 'verificationCode and tenderedAmount are required' });
        return;
      }
      const record = VerificationService.processCashCollection(
        verificationCode,
        Number(tenderedAmount),
        staffId,
        staffName
      );
      res.json({
        ok: true,
        message: 'Cash collection completed successfully.',
        data: record,
      });
    } catch (err) {
      next(err);
    }
  }

  public static confirmHandover(req: Request, res: Response, next: NextFunction): void {
    try {
      const { verificationCode, staffId, staffName } = req.body;
      if (!verificationCode) {
        res.status(400).json({ ok: false, error: 'verificationCode is required' });
        return;
      }
      const record = VerificationService.confirmHandover(verificationCode, staffId, staffName);
      res.json({
        ok: true,
        message: 'Document handover confirmed successfully.',
        data: record,
      });
    } catch (err) {
      next(err);
    }
  }

  public static getAuditLogs(req: Request, res: Response, next: NextFunction): void {
    try {
      const verificationCode = req.query.code as string | undefined;
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
