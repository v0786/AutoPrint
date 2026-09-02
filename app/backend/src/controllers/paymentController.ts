/**
 * Payment Controller — Manages UPI Intent Generation, Razorpay Gateway Orders,
 * Cryptographic Signature Verification, and 3-Strike Fail-Safe Lockout.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { VerificationService } from '../services/verificationService';
import { PaymentConfigRepository } from '../database/repositories/paymentConfigRepository';
import { verificationRepository } from '../database/repositories/verificationRepository';

const digitalAttemptSchema = z.object({
  verificationCode: z.string().min(1, 'Verification code is required'),
  status: z.enum(['SUCCESS', 'FAILED', 'TIMED_OUT']),
  vpa: z.string().optional(),
  gatewayRef: z.string().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
});

const createOrderSchema = z.object({
  verificationCode: z.string().min(1, 'Verification code is required'),
});

const verifyRazorpaySchema = z.object({
  verificationCode: z.string().min(1, 'Verification code is required'),
  razorpayOrderId: z.string().min(1, 'Razorpay order ID is required'),
  razorpayPaymentId: z.string().min(1, 'Razorpay payment ID is required'),
  razorpaySignature: z.string().min(1, 'Razorpay signature is required'),
});

export class PaymentController {
  /**
   * Generates a payment order or UPI intent string for the customer
   */
  public static async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { verificationCode } = createOrderSchema.parse(req.body);
      const record = verificationRepository.getByCode(verificationCode);

      if (!record) {
        res.status(404).json({ ok: false, error: 'Invalid verification code.' });
        return;
      }

      if (record.isCashLocked) {
        res.status(403).json({
          ok: false,
          error: 'Digital payments are locked for this order. Please pay cash at the merchant counter.',
          isCashLocked: true,
        });
        return;
      }

      const payConfig = PaymentConfigRepository.getConfig();
      const amountMajor = (record.amountMinorUnits / 100).toFixed(2);
      const payeeVpa = payConfig?.upi_id || 'autoprint@upi';
      const payeeName = payConfig?.upi_payee_name || 'AutoPrint Shop';

      // Generate standard NPCI UPI Intent URI
      const upiIntentUri = `upi://pay?pa=${encodeURIComponent(payeeVpa)}&pn=${encodeURIComponent(payeeName)}&am=${amountMajor}&cu=INR&tn=${encodeURIComponent(`AutoPrint Job #${record.jobNo}`)}&tr=${encodeURIComponent(verificationCode)}`;

      res.json({
        ok: true,
        data: {
          verificationCode,
          jobNo: record.jobNo,
          amountTotal: Number(amountMajor),
          currency: record.currency,
          payeeVpa,
          payeeName,
          upiIntentUri,
          customQrDataUrl: payConfig?.upi_qr_data_url || null,
          gateway: {
            provider: payConfig?.provider || 'UPI_DIRECT',
            razorpayKeyId: payConfig?.razorpay_key_id || null,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Cryptographic Server-Side Verification for Razorpay Payments
   */
  public static async verifyRazorpay(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { verificationCode, razorpayOrderId, razorpayPaymentId, razorpaySignature } = verifyRazorpaySchema.parse(req.body);
      const payConfig = PaymentConfigRepository.getConfig();

      const secret = payConfig?.razorpay_key_secret || process.env.RAZORPAY_KEY_SECRET;
      if (!secret) {
        // If no secret key is set, log warning and reject
        res.status(500).json({ ok: false, error: 'Razorpay secret key not configured on server.' });
        return;
      }

      // Compute expected HMAC SHA256 signature
      const body = razorpayOrderId + '|' + razorpayPaymentId;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body.toString())
        .digest('hex');

      const isSignatureValid = expectedSignature === razorpaySignature;

      if (!isSignatureValid) {
        // Record failed attempt (counts towards 3-strike lockout)
        const result = VerificationService.processDigitalPaymentAttempt(verificationCode, {
          status: 'FAILED',
          gatewayRef: razorpayPaymentId,
          errorCode: 'SIGNATURE_MISMATCH',
          errorMessage: 'Server-side cryptographic signature verification failed.',
        });

        res.status(400).json({
          ok: false,
          error: 'Payment verification failed: invalid signature.',
          strikeLockoutTriggered: result.strikeLockoutTriggered,
        });
        return;
      }

      // Record successful payment
      const result = VerificationService.processDigitalPaymentAttempt(verificationCode, {
        status: 'SUCCESS',
        gatewayRef: razorpayPaymentId,
      });

      res.json({
        ok: true,
        message: 'Payment successfully verified.',
        data: result.record,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Records digital payment attempts and enforces 3-strike fail-safe
   */
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