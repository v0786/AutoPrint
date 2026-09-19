import { feedbackRepository, CustomerFeedbackRow, FeedbackAnalytics } from '../database/repositories/feedbackRepository';
import { verificationRepository } from '../database/repositories/verificationRepository';
import { AppError } from '../types';

export class FeedbackService {
  /**
   * Verifies whether an 8-digit verification code is eligible for customer feedback.
   * Requirement: Job must be COLLECTED and not have existing feedback.
   */
  public static verifyFeedbackEligibility(verificationCode: string): {
    eligible: boolean;
    jobId: string;
    jobNo: string;
    customerName: string;
    handoverStatus: string;
    message?: string;
  } {
    const sanitized = verificationCode.replace(/[\s\-_]/g, '').trim();
    if (!/^\d{8}$/.test(sanitized)) {
      throw new AppError('Invalid verification code format. Code must be exactly 8 digits.', 400);
    }

    const record = verificationRepository.getByCode(sanitized);
    if (!record) {
      throw new AppError('No order found for this verification code.', 404);
    }

    if (record.handoverStatus !== 'COLLECTED') {
      return {
        eligible: false,
        jobId: record.jobId,
        jobNo: record.jobNo,
        customerName: record.customerName,
        handoverStatus: record.handoverStatus,
        message: 'Feedback is available only after your printed documents have been collected from the merchant counter.',
      };
    }

    if (feedbackRepository.hasFeedbackForJob(record.jobId)) {
      return {
        eligible: false,
        jobId: record.jobId,
        jobNo: record.jobNo,
        customerName: record.customerName,
        handoverStatus: record.handoverStatus,
        message: 'Feedback has already been submitted for this print order. Thank you!',
      };
    }

    return {
      eligible: true,
      jobId: record.jobId,
      jobNo: record.jobNo,
      customerName: record.customerName,
      handoverStatus: record.handoverStatus,
    };
  }

  /**
   * Submits a new customer feedback rating and suggestions.
   */
  public static submitFeedback(params: {
    verificationCode: string;
    ratingOverall: number;
    ratingQuality: number;
    ratingService: number;
    ratingEase: number;
    category?: string;
    comment?: string;
    improvementSuggestion?: string;
  }): CustomerFeedbackRow {
    const eligibility = this.verifyFeedbackEligibility(params.verificationCode);
    if (!eligibility.eligible) {
      throw new AppError(eligibility.message || 'Order is not eligible for feedback.', 400);
    }

    return feedbackRepository.createFeedback({
      jobId: eligibility.jobId,
      verificationCode: params.verificationCode.replace(/[\s\-_]/g, '').trim(),
      customerName: eligibility.customerName,
      ratingOverall: params.ratingOverall,
      ratingQuality: params.ratingQuality,
      ratingService: params.ratingService,
      ratingEase: params.ratingEase,
      category: params.category,
      comment: params.comment,
      improvementSuggestion: params.improvementSuggestion,
    });
  }

  public static getAllFeedback(): CustomerFeedbackRow[] {
    return feedbackRepository.getAllFeedback();
  }

  public static getAnalytics(): FeedbackAnalytics {
    return feedbackRepository.getAnalytics();
  }
}
