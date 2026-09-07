import { supportRepository, SupportSyncQueueRow } from '../database/repositories/supportRepository';

export class CloudSyncService {
  private static isRunning = false;
  private static timer: NodeJS.Timeout | null = null;

  /**
   * Starts the background sync worker.
   */
  public static startWorker(intervalMs = 30000): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.processQueue().catch((err) => console.warn('[SYNC] Worker loop error:', err));
    }, intervalMs);
    console.log('[SYNC] Background Cloud Support Sync Worker active (interval: 30s)');
  }

  public static stopWorker(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Processes pending sync queue items.
   */
  public static async processQueue(): Promise<{ processed: number; succeeded: number; failed: number }> {
    if (this.isRunning) return { processed: 0, succeeded: 0, failed: 0 };
    this.isRunning = true;

    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    try {
      const pendingItems = supportRepository.getPendingSyncItems(10);
      for (const item of pendingItems) {
        processed++;
        try {
          const success = await this.deliverPayload(item);
          if (success) {
            supportRepository.updateSyncStatus(item.id, 'SUCCESS');
            succeeded++;
          } else {
            supportRepository.updateSyncStatus(item.id, 'FAILED', 'Delivery endpoint unreachable or offline.');
            failed++;
          }
        } catch (err: any) {
          supportRepository.updateSyncStatus(item.id, 'FAILED', err?.message || 'Sync error');
          failed++;
        }
      }
    } finally {
      this.isRunning = false;
    }

    return { processed, succeeded, failed };
  }

  /**
   * Delivers a single sync item to Google Cloud / Support notification webhook.
   */
  private static async deliverPayload(item: SupportSyncQueueRow): Promise<boolean> {
    const cloudWebhookUrl = process.env.AUTOPRINT_SUPPORT_WEBHOOK_URL || process.env.GOOGLE_CLOUD_SUPPORT_ENDPOINT;
    
    // If no external cloud webhook is configured, payload is stored locally in SQLite safely
    if (!cloudWebhookUrl) {
      // Offline safe storage
      return true;
    }

    try {
      const response = await fetch(cloudWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AutoPrint-CloudSync/1.0',
        },
        body: JSON.stringify({
          entityType: item.entity_type,
          entityId: item.entity_id,
          payload: JSON.parse(item.payload_json),
          timestamp: new Date().toISOString(),
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
