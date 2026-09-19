import { getDb } from '../db';
import { randomUUID } from 'crypto';
import { supportRepository } from './supportRepository';

export interface CustomerFeedbackRow {
  id: string;
  job_id: string;
  verification_code: string;
  customer_name?: string | null;
  rating_overall: number;
  rating_quality: number;
  rating_service: number;
  rating_ease: number;
  category: string;
  comment?: string | null;
  improvement_suggestion?: string | null;
  created_at: string;
}

export interface FeedbackAnalytics {
  totalFeedbackCount: number;
  avgOverall: number;
  avgQuality: number;
  avgService: number;
  avgEase: number;
  categoryBreakdown: Record<string, number>;
  ratingDistribution: Record<number, number>;
  recentSuggestions: Array<{
    id: string;
    customerName: string;
    category: string;
    ratingOverall: number;
    suggestion: string;
    comment?: string;
    createdAt: string;
  }>;
}

export const feedbackRepository = {
  hasFeedbackForJob(jobId: string): boolean {
    const db = getDb();
    const row = db.prepare('SELECT 1 FROM customer_feedback WHERE job_id = ?').get(jobId);
    return row !== undefined;
  },

  createFeedback(params: {
    jobId: string;
    verificationCode: string;
    customerName?: string;
    ratingOverall: number;
    ratingQuality: number;
    ratingService: number;
    ratingEase: number;
    category?: string;
    comment?: string;
    improvementSuggestion?: string;
  }): CustomerFeedbackRow {
    const db = getDb();
    const id = `FDB-${randomUUID()}`;
    const now = new Date().toISOString();
    const category = params.category || 'POSITIVE';

    db.prepare(`
      INSERT INTO customer_feedback (
        id, job_id, verification_code, customer_name,
        rating_overall, rating_quality, rating_service, rating_ease,
        category, comment, improvement_suggestion, created_at
      ) VALUES (
        @id, @job_id, @verification_code, @customer_name,
        @rating_overall, @rating_quality, @rating_service, @rating_ease,
        @category, @comment, @improvement_suggestion, @created_at
      )
    `).run({
      id,
      job_id: params.jobId,
      verification_code: params.verificationCode,
      customer_name: params.customerName || null,
      rating_overall: Math.min(5, Math.max(1, params.ratingOverall)),
      rating_quality: Math.min(5, Math.max(1, params.ratingQuality)),
      rating_service: Math.min(5, Math.max(1, params.ratingService)),
      rating_ease: Math.min(5, Math.max(1, params.ratingEase)),
      category,
      comment: params.comment || null,
      improvement_suggestion: params.improvementSuggestion || null,
      created_at: now,
    });

    // Enqueue for cloud sync
    supportRepository.enqueueSync({
      entityType: 'FEEDBACK',
      entityId: id,
      payload: {
        id,
        jobId: params.jobId,
        ratingOverall: params.ratingOverall,
        ratingQuality: params.ratingQuality,
        category,
        comment: params.comment,
        improvementSuggestion: params.improvementSuggestion,
        createdAt: now,
      },
    });

    return db.prepare('SELECT * FROM customer_feedback WHERE id = ?').get(id) as CustomerFeedbackRow;
  },

  getAllFeedback(limit = 100): CustomerFeedbackRow[] {
    const db = getDb();
    return db.prepare('SELECT * FROM customer_feedback ORDER BY created_at DESC LIMIT ?').all(limit) as CustomerFeedbackRow[];
  },

  getAnalytics(): FeedbackAnalytics {
    const db = getDb();
    const allRows = db.prepare('SELECT * FROM customer_feedback ORDER BY created_at DESC').all() as CustomerFeedbackRow[];

    if (allRows.length === 0) {
      return {
        totalFeedbackCount: 0,
        avgOverall: 5.0,
        avgQuality: 5.0,
        avgService: 5.0,
        avgEase: 5.0,
        categoryBreakdown: {},
        ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        recentSuggestions: [],
      };
    }

    let sumOverall = 0;
    let sumQuality = 0;
    let sumService = 0;
    let sumEase = 0;
    const categoryBreakdown: Record<string, number> = {};
    const ratingDistribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    const recentSuggestions: FeedbackAnalytics['recentSuggestions'] = [];

    for (const row of allRows) {
      sumOverall += row.rating_overall;
      sumQuality += row.rating_quality;
      sumService += row.rating_service;
      sumEase += row.rating_ease;

      categoryBreakdown[row.category] = (categoryBreakdown[row.category] || 0) + 1;
      ratingDistribution[row.rating_overall] = (ratingDistribution[row.rating_overall] || 0) + 1;

      if (row.improvement_suggestion && row.improvement_suggestion.trim().length > 0) {
        if (recentSuggestions.length < 20) {
          recentSuggestions.push({
            id: row.id,
            customerName: row.customer_name || 'Anonymous Customer',
            category: row.category,
            ratingOverall: row.rating_overall,
            suggestion: row.improvement_suggestion,
            comment: row.comment ?? undefined,
            createdAt: row.created_at,
          });
        }
      }
    }

    const count = allRows.length;
    return {
      totalFeedbackCount: count,
      avgOverall: Number((sumOverall / count).toFixed(2)),
      avgQuality: Number((sumQuality / count).toFixed(2)),
      avgService: Number((sumService / count).toFixed(2)),
      avgEase: Number((sumEase / count).toFixed(2)),
      categoryBreakdown,
      ratingDistribution,
      recentSuggestions,
    };
  },
};
