import crypto from 'crypto';
import { CONFIG } from '../config/environment';

export interface GeneratedCode {
  raw: string;
  formatted: string;
}

/**
 * Generates a cryptographically secure 8-digit verification code.
 * Uses Node.js crypto.randomBytes with rejection sampling to eliminate modulo bias.
 * Ensures the output is strictly an 8-digit number string between 10000000 and 99999999.
 */
export function generateSecureVerificationCode(): GeneratedCode {
  const min = 10000000;
  const max = 99999999;
  const range = max - min + 1;
  const maxValidUint32 = Math.floor(0xffffffff / range) * range - 1;

  let randomVal: number;

  do {
    const buf = crypto.randomBytes(4);
    randomVal = buf.readUInt32BE(0);
  } while (randomVal > maxValidUint32);

  const codeNum = min + (randomVal % range);
  const raw = String(codeNum);
  const formatted = `${raw.slice(0, 4)} ${raw.slice(4)}`;

  return { raw, formatted };
}

/**
 * Computes a deterministic HMAC-like checksum for physical watermark validation.
 */
export function computeSecurityChecksum(verificationCode: string, jobId: string, amount: number): string {
  const rawPayload = `${verificationCode}:${jobId}:${amount.toFixed(2)}:${CONFIG.SECURITY_SALT}`;
  const hash = crypto.createHash('sha256').update(rawPayload).digest('hex').toUpperCase();
  return `SEC-${hash.slice(0, 4)}-${hash.slice(4, 8)}`;
}
