/**
 * AutoPrint SystemGuard — File Integrity & Unauthorized Modification Scanner
 */

import fs from 'fs';
import path from 'path';
import { IntegrityDiff, BaselineManifest } from '../types';
import { BaselineManager } from '../recovery/baselineManager';
import { GUARD_PATHS } from '../config';
import { logger } from '../reporting/structuredLogger';

export class IntegrityScanner {
  private baselineManager: BaselineManager;

  constructor(baselineManager?: BaselineManager) {
    this.baselineManager = baselineManager || new BaselineManager();
  }

  public scanIntegrity(): {
    isClean: boolean;
    tamperedCount: number;
    missingCount: number;
    diffs: IntegrityDiff[];
  } {
    const baseline = this.baselineManager.loadBaseline();
    if (!baseline) {
      logger.warn('Integrity scan skipped: No baseline snapshot found. Initializing new baseline.');
      this.baselineManager.createSnapshot();
      return { isClean: true, tamperedCount: 0, missingCount: 0, diffs: [] };
    }

    const diffs: IntegrityDiff[] = [];
    const now = new Date().toISOString();

    for (const [relPath, expected] of Object.entries(baseline.files)) {
      const absPath = path.resolve(GUARD_PATHS.WORKSPACE_ROOT, relPath);

      if (!fs.existsSync(absPath)) {
        diffs.push({
          type: 'MISSING',
          relativePath: relPath,
          expectedHash: expected.sha256,
          expectedSize: expected.sizeBytes,
          timestamp: now,
        });
        continue;
      }

      try {
        const stats = fs.statSync(absPath);
        const actualHash = this.baselineManager.computeSha256(absPath);

        if (actualHash !== expected.sha256) {
          diffs.push({
            type: 'MODIFIED',
            relativePath: relPath,
            expectedHash: expected.sha256,
            actualHash,
            expectedSize: expected.sizeBytes,
            actualSize: stats.size,
            timestamp: now,
          });
        }
      } catch (err: any) {
        diffs.push({
          type: 'CORRUPTED',
          relativePath: relPath,
          expectedHash: expected.sha256,
          timestamp: now,
        });
      }
    }

    const tamperedCount = diffs.filter((d) => d.type === 'MODIFIED' || d.type === 'CORRUPTED').length;
    const missingCount = diffs.filter((d) => d.type === 'MISSING').length;
    const isClean = diffs.length === 0;

    if (!isClean) {
      logger.warn(`Integrity scan detected anomalies: ${tamperedCount} modified/corrupt, ${missingCount} missing files`, {
        diffCount: diffs.length,
      });
    }

    return {
      isClean,
      tamperedCount,
      missingCount,
      diffs,
    };
  }
}
