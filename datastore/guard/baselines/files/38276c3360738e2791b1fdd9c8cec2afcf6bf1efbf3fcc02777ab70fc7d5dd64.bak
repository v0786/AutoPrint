import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { FeedbackService } from '../services/feedbackService';

const submitFeedbackSchema = z.object({
  verificationCode: z.string().min(1, 'Verification code is required'),
  ratingOverall: z.coerce.number().min(1).max(5),
  ratingQuality: z.coerce.number().min(1).max(5),
  ratingService: z.coerce.number().min(1).max(5),
  ratingEase: z.coerce.number().min(1).max(5),
  category: z.enum([
    'POSITIVE',
    'PRINT_QUALITY',
    'WEBSITE_EXPERIENCE',
    'PAYMENT_EXPERIENCE',
    'MERCHANT_EXPERIENCE',
    'BUG_REPORT',
    'FEATURE_REQUEST',
    'OTHER',
  ]).default('POSITIVE'),
  comment: z.string().max(1000).optional(),
  improvementSuggestion: z.string().max(2000).optional(),
});

export class FeedbackController {
  public static checkEligibility(req: Request, res: Response, next: NextFunction): void {
    try {
      const { code } = req.params;
      const result = FeedbackService.verifyFeedbackEligibility(code);
      res.json({ ok: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  public static submit(req: Request, res: Response, next: NextFunction): void {
    try {
      const parsed = submitFeedbackSchema.parse(req.body);
      const feedback = FeedbackService.submitFeedback(parsed);
      res.status(201).json({
        ok: true,
        message: 'Thank you for your valuable feedback! Your response helps us continuously improve AutoPrint.',
        data: feedback,
      });
    } catch (err) {
      next(err);
    }
  }

  public static getAllFeedback(_req: Request, res: Response, next: NextFunction): void {
    try {
      const all = FeedbackService.getAllFeedback();
      res.json({ ok: true, count: all.length, data: all });
    } catch (err) {
      next(err);
    }
  }

  public static getAnalytics(_req: Request, res: Response, next: NextFunction): void {
    try {
      const analytics = FeedbackService.getAnalytics();
      res.json({ ok: true, data: analytics });
    } catch (err) {
      next(err);
    }
  }
}
