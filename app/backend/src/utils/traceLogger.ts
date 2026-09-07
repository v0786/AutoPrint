/**
 * AutoPrint End-to-End Request/Job Trace Logger
 * Provides unified cross-service correlation from customer submission to merchant desktop queue.
 */

import crypto from 'crypto';

export type TraceStage =
  | 'CUSTOMER_REQUEST_RECEIVED'
  | 'JOB_VALIDATED'
  | 'JOB_SAVED'
  | 'JOB_DATABASE_ID_CREATED'
  | 'JOB_PAYMENT_STATUS_UPDATED'
  | 'JOB_QUEUE_QUERY'
  | 'MERCHANT_JOB_RECEIVED';

export function generateTraceId(): string {
  const d = new Date();
  const yyyymmdd = d.toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `TRACE-${yyyymmdd}-${randomHex}`;
}

export function logTrace(
  traceId: string,
  stage: TraceStage,
  message: string,
  metadata?: Record<string, unknown>
): void {
  const cleanId = traceId || generateTraceId();
  console.log(`[${cleanId}] [${stage}] ${message}`);

  if (metadata) {
    // Redact any potential sensitive details
    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(metadata)) {
      const lower = key.toLowerCase();
      if (
        lower.includes('secret') ||
        lower.includes('token') ||
        lower.includes('password') ||
        lower.includes('content') ||
        lower.includes('buffer') ||
        lower.includes('key')
      ) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = value;
      }
    }
    const metaEntries = Object.entries(sanitized)
      .map(([k, v]) => `${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`)
      .join(' | ');
    if (metaEntries) {
      console.log(`  ↳ [${cleanId}] ${metaEntries}`);
    }
  }
}
