import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { VerificationService } from '../services/verificationService';

const digitalAttemptSchema = z.object({
  verificationCode: z.string().min(1, 'Verification code is required'),
  status: z.enum(['SUCCESS', 'FAILED', 'TIMED_OUT']),
  vpa: z.string().optional(),
  gatewayRef: z.string().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
});

export class PaymentController {
  public static recordDigitalAttempt(req: Request, res: Response, next: NextFunction): void {
    try {
      const parsed = digitalAttemptSchema.parse(req.body);

      const result = VerificationService.processDigitalPaymentAttempt(parsed.verificationCode, {
        status: parsed.status,
        vpa: parsed.vpa,
        gatewayRef: parsed.gatewayRef,
        errorCode: parsed.errorCode,
        errorMessage: parsed.errorMessage,
      });

      res.json({
        ok: true,
        message: result.strikeLockoutTriggered
          ? 'Digital payment failed 3 times. Job locked into Cash Collection mode exclusively.'
          : parsed.status === 'SUCCESS'
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