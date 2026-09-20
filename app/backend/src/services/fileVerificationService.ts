import crypto from 'crypto';
import fs from 'fs/promises';

export interface FileVerificationResult {
  ok: boolean;
  actualSize: number;
  actualHash: string;
  reason?: 'FILE_SIZE_MISMATCH' | 'FILE_HASH_MISMATCH' | 'MISSING_EXPECTED_HASH' | 'MISSING_EXPECTED_SIZE';
}

export function verifyDocumentBuffer(
  buffer: Buffer,
  expectedSize: number | null | undefined,
  expectedHash: string | null | undefined
): FileVerificationResult {
  const actualSize = buffer.length;
  const actualHash = crypto.createHash('sha256').update(buffer).digest('hex');

  if (typeof expectedSize !== 'number' || !Number.isInteger(expectedSize) || expectedSize < 0) {
    return { ok: false, actualSize, actualHash, reason: 'MISSING_EXPECTED_SIZE' };
  }
  if (actualSize !== expectedSize) {
    return { ok: false, actualSize, actualHash, reason: 'FILE_SIZE_MISMATCH' };
  }
  if (!expectedHash || !/^[a-f0-9]{64}$/i.test(expectedHash)) {
    return { ok: false, actualSize, actualHash, reason: 'MISSING_EXPECTED_HASH' };
  }
  if (!crypto.timingSafeEqual(Buffer.from(actualHash, 'utf8'), Buffer.from(expectedHash.toLowerCase(), 'utf8'))) {
    return { ok: false, actualSize, actualHash, reason: 'FILE_HASH_MISMATCH' };
  }

  return { ok: true, actualSize, actualHash };
}

export async function verifyDocumentFile(
  filePath: string,
  expectedSize: number | null | undefined,
  expectedHash: string | null | undefined
): Promise<FileVerificationResult> {
  return verifyDocumentBuffer(await fs.readFile(filePath), expectedSize, expectedHash);
}
