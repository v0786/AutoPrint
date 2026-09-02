/**
 * System Workload & Telemetry Controller
 * Computes live queue depth, pending jobs, and dynamic queue load
 * from persistent SQLite database records based on real connected printer capacity.
 */

import { Request, Response } from 'express';
import { getDb } from '../database/db';
import { PrinterService } from '../services/printerService';
import { MerchantRepository } from '../database/repositories/merchantRepository';

export class SystemController {
  public static async getWorkload(_req: Request, res: Response): Promise<void> {
    const db = getDb();

    // 1. Clean up stale/abandoned test jobs created > 2 hours ago that never got processed
    try {
      db.prepare(`
        UPDATE print_jobs 
        SET status = 'CANCELLED' 
        WHERE status IN ('CREATED', 'QUEUED') 
          AND created_at < datetime('now', '-2 hours')
      `).run();
    } catch {}

    // 2. Query active/pending jobs in queue
    const queueStats = db.prepare(`
      SELECT 
        COUNT(*) as totalActive,
        SUM(CASE WHEN status = 'CREATED' OR status = 'QUEUED' THEN 1 ELSE 0 END) as pendingCount,
        SUM(CASE WHEN status = 'PRINTING' THEN 1 ELSE 0 END) as printingCount,
        SUM(CASE WHEN status = 'PRINTED' OR status = 'READY_FOR_HANDOVER' THEN 1 ELSE 0 END) as readyCount
      FROM print_jobs
      WHERE status IN ('CREATED', 'QUEUED', 'PRINTING')
    `).get() as {
      totalActive: number;
      pendingCount: number;
      printingCount: number;
      readyCount: number;
    };

    const pendingCount = queueStats?.pendingCount || 0;
    const printingCount = queueStats?.printingCount || 0;
    const totalActive = pendingCount + printingCount;

    // 3. Determine connected printer count
    let connectedPrinterCount = 1;
    try {
      const localPrinters = await PrinterService.getAvailablePrinters();
      if (localPrinters && localPrinters.length > 0) {
        connectedPrinterCount = localPrinters.length;
      }
    } catch {
      connectedPrinterCount = 1;
    }

    // Workload Capacity Rule:
    // Max concurrent capacity depends strictly on number of connected printers:
    // 1 printer -> max 1 job at a time
    // 2 printers -> max 2 jobs at a time
    // 5 printers -> max 5 jobs at a time
    const maxCapacity = Math.max(1, connectedPrinterCount);

    // High workload is ONLY triggered if the pending queue exceeds the parallel printer capacity * 2
    const isHighWorkload = pendingCount > maxCapacity * 2;
    const estimatedWaitMinutes = Math.max(1, Math.ceil((pendingCount / maxCapacity) * 1.5));

    let queueMessage: string | null = null;
    if (isHighWorkload) {
      queueMessage = `High print shop volume: ${pendingCount} jobs currently pending (${connectedPrinterCount} printers active). Estimated wait time: ~${estimatedWaitMinutes} mins.`;
    }

    res.json({
      ok: true,
      data: {
        activeJobs: totalActive,
        pendingJobs: pendingCount,
        printingJobs: printingCount,
        readyForHandover: queueStats?.readyCount || 0,
        connectedPrinters: connectedPrinterCount,
        maxCapacityPerBatch: maxCapacity,
        isHighWorkload,
        estimatedWaitMinutes,
        queueMessage, // null under normal / manageable load
      },
    });
  }
}
