/**
 * AutoPrint SystemGuard — Automated Pattern Fixer & Self-Healing Engine
 */

import { RecoveryAction, IntegrityDiff, ServiceHealth } from '../types';
import { FileRestorer } from './fileRestorer';
import { ServiceController } from './serviceController';
import { LockCleaner } from './lockCleaner';
import { logger } from '../reporting/structuredLogger';

export class AutoFixer {
  private fileRestorer: FileRestorer;
  private serviceController: ServiceController;
  private lockCleaner: LockCleaner;

  constructor(
    fileRestorer?: FileRestorer,
    serviceController?: ServiceController,
    lockCleaner?: LockCleaner
  ) {
    this.fileRestorer = fileRestorer || new FileRestorer();
    this.serviceController = serviceController || new ServiceController();
    this.lockCleaner = lockCleaner || new LockCleaner();
  }

  public async runFullSelfHealing(params: {
    integrityDiffs?: IntegrityDiff[];
    unhealthyServices?: ServiceHealth[];
  }): Promise<RecoveryAction[]> {
    const executedActions: RecoveryAction[] = [];

    // 1. Clean Stale Locks and Temporary Dumps
    const lockActions = this.lockCleaner.cleanStaleLocks();
    executedActions.push(...lockActions);

    // 2. Repair Corrupted or Tampered Files
    if (params.integrityDiffs && params.integrityDiffs.length > 0) {
      logger.info(`Auto-fixing ${params.integrityDiffs.length} integrity diffs...`);
      const restoreActions = this.fileRestorer.restoreFiles(params.integrityDiffs);
      executedActions.push(...restoreActions);
    }

    // 3. Resolve Service Failures
    if (params.unhealthyServices && params.unhealthyServices.length > 0) {
      for (const service of params.unhealthyServices) {
        logger.info(`Attempting auto-recovery for unhealthy service: "${service.name}" on port ${service.port}`);

        // Check if port is locked by a zombie unresponsive process
        const orphans = this.lockCleaner.findOrphanProcessesByPort(service.port);
        for (const pid of orphans) {
          const killAction = this.lockCleaner.terminateOrphan(
            pid,
            `Port ${service.port} blocked while service reported down`
          );
          executedActions.push(killAction);
        }

        // Restart service with exponential backoff
        const restartAction = await this.serviceController.restartService(service.name);
        executedActions.push(restartAction);
      }
    }

    return executedActions;
  }
}
