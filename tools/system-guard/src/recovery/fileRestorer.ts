/**
 * AutoPrint SystemGuard — Automated File Repair & Rollback Engine
 */

import fs from 'fs';
import path from 'path';
import { IntegrityDiff, RecoveryAction } from '../types';
import { BaselineManager } from './baselineManager';
import { GUARD_PATHS } from '../config';
import { logger } from '../reporting/structuredLogger';

export class FileRestorer {
  private baselineManager: BaselineManager;

  constructor(baselineManager?: BaselineManager) {
    this.baselineManager = baselineManager || new BaselineManager();
  }

  public restoreFiles(diffs: IntegrityDiff[]): RecoveryAction[] {
    const actions: RecoveryAction[] = [];

    for (const diff of diffs) {
      const absTarget = path.resolve(GUARD_PATHS.WORKSPACE_ROOT, diff.relativePath);
      const actionId = `RESTORE-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const timestamp = new Date().toISOString();

      if (!diff.expectedHash) {
        actions.push({
          id: actionId,
          timestamp,
          type: 'FILE_RESTORE',
          target: diff.relativePath,
          success: false,
          details: 'Cannot restore: No baseline hash provided.',
        });
        continue;
      }

      const backupSource = this.baselineManager.getBackupFilePath(diff.expectedHash);

      if (!backupSource || !fs.existsSync(backupSource)) {
        logger.error(`Restoration failed for ${diff.relativePath}: Clean backup not found for hash ${diff.expectedHash}`);
        actions.push({
          id: actionId,
          timestamp,
          type: 'FILE_RESTORE',
          target: diff.relativePath,
          success: false,
          details: `Baseline backup file not found for hash ${diff.expectedHash}`,
        });
        continue;
      }

      try {
        // Ensure parent directory exists
        const parentDir = path.dirname(absTarget);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }

        // Overwrite or reinstate with clean copy
        fs.copyFileSync(backupSource, absTarget);

        logger.info(`Automated repair: Restored ${diff.relativePath} from verified baseline (${diff.expectedHash.substring(0, 8)})`);
        actions.push({
          id: actionId,
          timestamp,
          type: 'FILE_RESTORE',
          target: diff.relativePath,
          success: true,
          details: `Successfully restored ${diff.type.toLowerCase()} file to baseline state.`,
        });
      } catch (err: any) {
        logger.error(`Failed to write restored file to ${absTarget}: ${err.message}`);
        actions.push({
          id: actionId,
          timestamp,
          type: 'FILE_RESTORE',
          target: diff.relativePath,
          success: false,
          details: `Write error during file replacement: ${err.message}`,
        });
      }
    }

    return actions;
  }
}
