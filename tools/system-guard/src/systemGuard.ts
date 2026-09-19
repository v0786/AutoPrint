/**
 * AutoPrint SystemGuard — Master Orchestration Engine
 */

import {
  SystemHealthReport,
  SystemHealthStatus,
  RecoveryAction,
  IncidentReport,
} from './types';
import { ProcessMonitor } from './monitoring/processMonitor';
import { ResourceLeakDetector } from './monitoring/resourceLeakDetector';
import { IntegrityScanner } from './monitoring/integrityScanner';
import { CodeAnomaliesScanner } from './monitoring/codeAnomaliesScanner';
import { BaselineManager } from './recovery/baselineManager';
import { AutoFixer } from './recovery/autoFixer';
import { IncidentReporter } from './reporting/incidentReporter';
import { logger } from './reporting/structuredLogger';

export class SystemGuard {
  public processMonitor: ProcessMonitor;
  public resourceDetector: ResourceLeakDetector;
  public integrityScanner: IntegrityScanner;
  public codeScanner: CodeAnomaliesScanner;
  public baselineManager: BaselineManager;
  public autoFixer: AutoFixer;
  public incidentReporter: IncidentReporter;

  private recentRecoveryActions: RecoveryAction[] = [];
  private isDaemonRunning = false;

  constructor(options?: { baselineDir?: string }) {
    this.baselineManager = new BaselineManager(options?.baselineDir);
    this.processMonitor = new ProcessMonitor();
    this.resourceDetector = new ResourceLeakDetector();
    this.integrityScanner = new IntegrityScanner(this.baselineManager);
    this.codeScanner = new CodeAnomaliesScanner();
    this.autoFixer = new AutoFixer();
    this.incidentReporter = new IncidentReporter();
  }

  /**
   * Performs an end-to-end diagnostic evaluation of the entire system.
   */
  public async runDiagnosis(): Promise<SystemHealthReport> {
    logger.info('Running complete SystemGuard health diagnostics...');

    const services = await this.processMonitor.checkAllServices();
    const resources = this.resourceDetector.sampleMetrics();
    const integrity = this.integrityScanner.scanIntegrity();
    const anomalies = this.codeScanner.scanFiles();

    // Calculate dynamic health score
    let score = 100;

    // Service penalties (25 pts per down service)
    const deadServices = services.filter((s) => !s.isAlive);
    score -= deadServices.length * 25;

    // Integrity penalties (10 pts per modified file)
    score -= Math.min(30, integrity.diffs.length * 10);

    // Code anomaly penalties (5 pts per anomaly)
    score -= Math.min(20, anomalies.count * 5);

    // Resource leak penalties
    if (resources.leakWarning) score -= 15;
    if (resources.disk.isDiskPressure) score -= 25;

    score = Math.max(0, Math.min(100, score));

    const overallStatus: SystemHealthStatus =
      score >= 85
        ? 'OPTIMAL'
        : score >= 50
        ? 'DEGRADED'
        : 'CRITICAL';

    const report: SystemHealthReport = {
      timestamp: new Date().toISOString(),
      overallStatus,
      healthScore: score,
      services,
      resources,
      integrity,
      codeAnomalies: anomalies,
      recentRecoveryActions: this.recentRecoveryActions.slice(-10),
      activeIncidentsCount: deadServices.length > 0 || integrity.diffs.length > 0 ? 1 : 0,
    };

    return report;
  }

  /**
   * Executes automated self-healing procedures for any detected anomalies.
   */
  public async runAutoRecovery(): Promise<{
    reportBefore: SystemHealthReport;
    reportAfter: SystemHealthReport;
    actions: RecoveryAction[];
  }> {
    const before = await this.runDiagnosis();
    const unhealthyServices = before.services.filter((s) => !s.isAlive);

    const actions = await this.autoFixer.runFullSelfHealing({
      integrityDiffs: before.integrity.diffs,
      unhealthyServices,
    });

    this.recentRecoveryActions.push(...actions);

    // If critical failures could not be resolved, escalate to AI incident reporter
    const after = await this.runDiagnosis();
    if (after.overallStatus === 'CRITICAL' || after.services.some((s) => !s.isAlive)) {
      this.incidentReporter.createIncidentReport({
        title: 'Unresolved System Failure After Automated Self-Healing',
        component: 'SystemGuard Orchestrator',
        severity: 'CRITICAL',
        summary: `Self-healing attempted ${actions.length} action(s), but the system remains in a ${after.overallStatus} state.`,
        healthStatus: after.overallStatus,
        tamperedFiles: after.integrity.diffs,
        recoveryActions: actions,
        metrics: after.resources,
      });
    }

    return {
      reportBefore: before,
      reportAfter: after,
      actions,
    };
  }

  /**
   * Creates or updates the verified baseline snapshot.
   */
  public createBaseline(): void {
    this.baselineManager.createSnapshot();
  }

  /**
   * Starts a continuous background watchdog loop.
   */
  public async startWatchdog(intervalMs = 15000, maxCycles?: number): Promise<void> {
    this.isDaemonRunning = true;
    logger.info(`SystemGuard watchdog started (Polling interval: ${intervalMs}ms)`);

    let cycle = 0;
    while (this.isDaemonRunning) {
      cycle++;
      try {
        const report = await this.runDiagnosis();
        if (report.overallStatus !== 'OPTIMAL') {
          logger.warn(`Watchdog detected system degradation (${report.overallStatus}). Triggering recovery...`);
          await this.runAutoRecovery();
        }
      } catch (err: any) {
        logger.error(`Watchdog cycle exception: ${err.message}`);
      }

      if (maxCycles && cycle >= maxCycles) {
        break;
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  public stopWatchdog(): void {
    this.isDaemonRunning = false;
    logger.info('SystemGuard watchdog stopped.');
  }
}

export const systemGuard = new SystemGuard();
