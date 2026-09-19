/**
 * Payment Controller — Manages UPI Intent Generation, Razorpay Gateway Orders,
 * Cryptographic Signature Verification, and 3-Strike Fail-Safe Lockout.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { VerificationService } from '../services/verificationService';
import { AutoPrintService } from '../services/autoprintService';
import { PaymentConfigRepository } from '../database/repositories/paymentConfigRepository';
import { verificationRepository } from '../database/repositories/verificationRepository';
import Razorpay from 'razorpay';

const digitalAttemptSchema = z.object({
  verificationCode: z.string().min(1, 'Verification code is required'),
  status: z.enum(['SUCCESS', 'FAILED', 'TIMED_OUT']),
  vpa: z.string().optional(),
  gatewayRef: z.string().optional(),
  errorCode: z.string().optional(),
  errorMessage: z.string().optional(),
});

const createOrderSchema = z.object({
  verificationCode: z.string().min(1, 'Verification code is required').optional(),
  amount: z.number().int().min(100, 'Amount must be at least 100 paise').optional(),
  currency: z.string().length(3).default('INR'),
  receipt: z.string().min(1).max(40).optional(),
});

const verifyRazorpaySchema = z.object({
  verificationCode: z.string().min(1, 'Verification code is required'),
  razorpayOrderId: z.string().min(1, 'Razorpay order ID is required'),
  razorpayPaymentId: z.string().min(1, 'Razorpay payment ID is required'),
  razorpaySignature: z.string().min(1, 'Razorpay signature is required'),
});

export class PaymentController {
  public static async checkRazorpay(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const payConfig = PaymentConfigRepository.getConfig();
      const keyId = process.env.RAZORPAY_KEY_ID || payConfig?.razorpay_key_id;
      const secret = process.env.RAZORPAY_KEY_SECRET || payConfig?.razorpay_key_secret;
      if (!keyId || !secret) {
        res.status(500).json({ ok: false, configured: false, error: 'Razorpay credentials are not configured on the server.' });
        return;
      }

      const razorpay = new Razorpay({ key_id: keyId, key_secret: secret });
      await razorpay.orders.all({ count: 1 });
      res.json({ ok: true, configured: true, keyId: keyId.replace(/^(rzp_(?:test|live)_).+$/i, '$1••••') });
    } catch (error: any) {
      const statusCode = Number(error?.statusCode || error?.status);
      if (statusCode === 401) {
        res.status(401).json({ ok: false, configured: true, error: 'Razorpay authentication failed. Check the server credentials.' });
        return;
      }
      next(error);
    }
  }

  /**
   * Generates a payment order or UPI intent string for the customer
   */
  public static async createOrder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = createOrderSchema.parse(req.body);
      const record = parsed.verificationCode ? verificationRepository.getByCode(parsed.verificationCode) : null;

      if (parsed.verificationCode && !record) {
        res.status(404).json({ ok: false, error: 'Invalid verification code.' });
        return;
      }

      if (record?.isCashLocked) {
        res.status(403).json({
          ok: false,
          error: 'Digital payments are locked for this order. Please pay cash at the merchant counter.',
          isCashLocked: true,
        });
        return;
      }

      const payConfig = PaymentConfigRepository.getConfig();
      const amount = record?.amountMinorUnits ?? parsed.amount;
      if (!amount || amount < 100) {
        res.status(400).json({ ok: false, error: 'Amount must be at least 100 paise.' });
        return;
      }
      const keyId = process.env.RAZORPAY_KEY_ID || payConfig?.razorpay_key_id;
      const secret = process.env.RAZORPAY_KEY_SECRET || payConfig?.razorpay_key_secret;
      if (!keyId || !secret) {
        res.status(500).json({ ok: false, error: 'Razorpay credentials are not configured on the server.' });
        return;
      }
      const razorpay = new Razorpay({ key_id: keyId, key_secret: secret });
      let order;
      try {
        order = await razorpay.orders.create({
          amount,
          currency: record?.currency || parsed.currency,
          receipt: parsed.receipt || (record ? `autoprint_${record.jobNo}` : `autoprint_${Date.now()}`),
        });
      } catch (error: any) {
        const statusCode = Number(error?.statusCode || error?.status);
        if (statusCode === 401) {
          res.status(401).json({ ok: false, error: 'Razorpay authentication failed. Check the server credentials.' });
          return;
        }
        next(error);
        return;
      }

      res.json({ ok: true, data: { order_id: order.id, amount: order.amount, currency: order.currency, key_id: keyId } });
      return;

    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ ok: false, error: err.issues[0]?.message || 'Invalid payment order request.' });
        return;
      }
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

      const secret = process.env.RAZORPAY_KEY_SECRET || payConfig?.razorpay_key_secret;
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

      const expectedBuf = Buffer.from(expectedSignature, 'utf8');
      const providedBuf = Buffer.from(razorpaySignature, 'utf8');
      const isSignatureValid =
        expectedBuf.length === providedBuf.length &&
        crypto.timingSafeEqual(expectedBuf, providedBuf);

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

      // Confirm digital payment and trigger print job dispatch
      await AutoPrintService.confirmDigitalPayment(
        result.record.jobId,
        razorpayPaymentId
      );

      res.json({
        ok: true,
        message: 'Payment successfully verified and print job dispatched.',
        data: result.record,
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ ok: false, error: err.issues[0]?.message || 'Invalid payment verification request.' });
        return;
      }
      next(err);
    }
  }

  /**
   * Records digital payment attempts and enforces 3-strike fail-safe.
   * Strictly disallows unauthenticated clients from self-reporting 'SUCCESS' to prevent free print fraud.
   */
  public static async recordDigitalAttempt(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = digitalAttemptSchema.parse(req.body);

      // Free print fraud defense: only authenticated staff can manually mark SUCCESS without gateway verification
      const user = (req as any).user;
      if (parsed.status === 'SUCCESS' && !user) {
        res.status(403).json({
          ok: false,
          error: 'Self-reported payment success is not permitted. Digital payments require cryptographic gateway verification or merchant staff counter confirmation.',
        });
        return;
      }

      const result = VerificationService.processDigitalPaymentAttempt(parsed.verificationCode, {
        status: parsed.status,
        vpa: parsed.vpa,
        gatewayRef: parsed.gatewayRef,
        errorCode: parsed.errorCode,
        errorMessage: parsed.errorMessage,
      });

      if (parsed.status === 'SUCCESS') {
        await AutoPrintService.confirmDigitalPayment(
          result.record.jobId,
          parsed.gatewayRef || `STAFF-DIGITAL-${Date.now()}`,
          parsed.vpa
        );
      }

      res.json({
        ok: true,
        message: result.strikeLockoutTriggered
          ? 'Digital payment failed 3 times. Job locked into Cash Collection mode exclusively.'
          : parsed.status === 'SUCCESS'
          ? 'Digital payment successful and print job dispatched.'
          : 'Digital payment attempt recorded.',
        strikeLockoutTriggered: result.strikeLockoutTriggered,
        data: result.record,
      });
    } catch (err) {
      next(err);
    }
  }
}