/**
 * Cryptographic utilities for AutoPrint
 *
 * - Cryptographically secure 8-digit verification code generation
 * - Real HMAC-SHA256 checksum (not plain SHA-256)
 * - UUID v4 for job/audit IDs
 * - Rejection-sampling to eliminate modulo bias
 */

import crypto from 'crypto';
import { randomUUID } from 'crypto';
import { CONFIG } from '../config/environment.js';

export { randomUUID };

// ─── Verification Code ────────────────────────────────────────────────────────

export interface GeneratedCode {
  raw: string;       // '48291057'
  formatted: string; // '4829 1057'
}

/**
 * Generates a cryptographically secure 8-digit verification code.
 * Uses rejection sampling to eliminate modulo bias.
 * Output: 10000000–99999999 (guaranteed 8 digits, no leading zero).
 */
export function generateSecureVerificationCode(): GeneratedCode {
  const min = 10_000_000;
  const max = 99_999_999;
  const range = max - min + 1; // 90_000_000

  // Largest uint32 divisible by range — values above this are rejected
  const maxValid = Math.floor(0xffff_ffff / range) * range - 1;

  let randomVal: number;
  do {
    const buf = crypto.randomBytes(4);
    randomVal = buf.readUInt32BE(0);
  } while (randomVal > maxValid);

  const codeNum = min + (randomVal % range);
  const raw = String(codeNum);
  const formatted = `${raw.slice(0, 4)} ${raw.slice(4)}`;

  return { raw, formatted };
}

// ─── HMAC-SHA256 Checksum ─────────────────────────────────────────────────────

/**
 * Canonical payload: CODE:JOB_ID:AMOUNT_MINOR_UNITS
 * Example:          48291057:QRT-1234abc:2450
 *
 * Uses HMAC-SHA256 with the server's HMAC_SECRET.
 * The secret is NEVER embedded in the payload.
 * Output format: SEC-XXXX-XXXX (first 8 hex chars of HMAC, uppercased)
 */
export function computeHmacChecksum(
  verificationCode: string,
  jobId: string,
  amountMinorUnits: number
): string {
  const payload = `${verificationCode}:${jobId}:${amountMinorUnits}`;
  const hmac = crypto.createHmac('sha256', CONFIG.HMAC_SECRET);
  hmac.update(payload);
  const hex = hmac.digest('hex').toUpperCase();
  return `SEC-${hex.slice(0, 4)}-${hex.slice(4, 8)}`;
}

/**
 * Server-side checksum verification.
 * Uses timing-safe comparison to prevent timing attacks.
 */
export function verifyHmacChecksum(
  verificationCode: string,
  jobId: string,
  amountMinorUnits: number,
  providedChecksum: string
): boolean {
  const expected = computeHmacChecksum(verificationCode, jobId, amountMinorUnits);
  // Pad both to same length to avoid length-based timing leaks
  const a = Buffer.from(expected.padEnd(64, '0'));
  const b = Buffer.from(providedChecksum.padEnd(64, '0'));
  try {
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

// ─── Attempt ID Generation ────────────────────────────────────────────────────

/**
 * Generates a unique payment attempt ID.
 * Format: att-ULID-style using randomUUID to guarantee uniqueness.
 */
export function generateAttemptId(): string {
  return `att-${randomUUID()}`;
}

// ─── Safe filename ────────────────────────────────────────────────────────────

/**
 * Returns a filesystem-safe filename for storage.
 * Never uses the original filename directly to prevent path traversal.
 */
export function generateStorageFilename(jobId: string, originalName: string): string {
  const ext = originalName.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
  return `${jobId}.${ext}`;
}

export function generateProcessedFilename(jobId: string, ext = 'pdf'): string {
  return `${jobId}_stamped.${ext}`;
}
