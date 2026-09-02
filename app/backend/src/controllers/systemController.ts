/**
 * System Workload & Telemetry Controller
 * Computes live queue depth, pending jobs, and dynamic queue load
 * from persistent SQLite database records.
 */

import { Request, Response } from 'express';
import { getDb } from '../database/db';
import { jobRepository } from '../database/repositories/jobRepository';
import { verificationRepository } from '../database/repositories/verificationRepository';

export class SystemController {
  public static async getWorkload(_req: Request, res: Response): Promise<void> {
    const db = getDb();

    // Query active/pending jobs in queue
    const queueStats = db.prepare(`
      SELECT 
        COUNT(*) as totalActive,
        SUM(CASE WHEN status = 'CREATED' OR status = 'QUEUED' THEN 1 ELSE 0 END) as pendingCount,
        SUM(CASE WHEN status = 'PRINTING' THEN 1 ELSE 0 END) as printingCount,
        SUM(CASE WHEN status = 'PRINTED' OR status = 'READY_FOR_HANDOVER' THEN 1 ELSE 0 END) as readyCount
      FROM print_jobs
      WHERE status NOT IN ('COLLECTED', 'FAILED', 'CANCELLED')
    `).get() as {
      totalActive: number;
      pendingCount: number;
      printingCount: number;
      readyCount: number;
    };

    const pendingCount = queueStats?.pendingCount || 0;
    const totalActive = queueStats?.totalActive || 0;

    // Thresholds: High workload if pending > 5 or active > 10
    const isHighWorkload = pendingCount >= 5 || totalActive >= 10;
    const estimatedWaitMinutes = Math.max(1, Math.ceil(pendingCount * 1.5));

    let queueMessage: string | null = null;
    if (isHighWorkload) {
      queueMessage = `High print shop volume: ${pendingCount} jobs currently ahead in queue. Estimated wait time: ~${estimatedWaitMinutes} mins.`;
    }

    res.json({
      ok: true,
      data: {
        activeJobs: totalActive,
        pendingJobs: pendingCount,
        printingJobs: queueStats?.printingCount || 0,
        readyForHandover: queueStats?.readyCount || 0,
        isHighWorkload,
        estimatedWaitMinutes,
        queueMessage, // null under normal conditions
      },
    });
  }
}
