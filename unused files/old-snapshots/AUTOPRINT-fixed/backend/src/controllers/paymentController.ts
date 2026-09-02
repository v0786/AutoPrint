import { Request, Response, NextFunction } from 'express';
import { VerificationService } from '../services/verificationService';

export class PaymentController {
  public static recordDigitalAttempt(req: Request, res: Response, next: NextFunction): void {
    try {
      const { verificationCode, status, vpa, gatewayRef, errorCode, errorMessage } = req.body;

      if (!verificationCode || !status) {
        res.status(400).json({ ok: false, error: 'verificationCode and status are required.' });
        return;
      }

      const result = VerificationService.processDigitalPaymentAttempt(verificationCode, {
        status,
        vpa,
        gatewayRef,
        errorCode,
        errorMessage,
      });

      res.json({
        ok: true,
        message: result.strikeLockoutTriggered
          ? 'Digital payment failed 3 times. Job locked into Cash Collection mode exclusively.'
          : status === 'SUCCESS'
          ? 'Digital payment successful.'
          : 'Digital payment attempt recorded.',
        strikeLockoutTriggered: result.strikeLockoutTriggered,
        data: result.record,
      });
    } catch (err) {
      next(err);
    }
  }
}
