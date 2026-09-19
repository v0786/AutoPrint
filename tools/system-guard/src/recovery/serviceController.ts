/**
 * AutoPrint SystemGuard — Exponential Backoff Service Restarter & Crash-Loop Breaker
 */

import { spawn, ChildProcess } from 'child_process';
import { RecoveryAction } from '../types';
import { GUARD_CONFIG } from '../config';
import { logger } from '../reporting/structuredLogger';

export interface ServiceRestartState {
  serviceName: string;
  restartCount: number;
  lastRestartTimestampMs: number;
  currentBackoffMs: number;
  isTripwireTriggered: boolean;
}

export class ServiceController {
  private restartStates: Map<string, ServiceRestartState> = new Map();
  private childProcesses: Map<string, ChildProcess> = new Map();

  public calculateBackoff(attempt: number): number {
    const base = GUARD_CONFIG.THRESHOLDS.INITIAL_BACKOFF_MS;
    const max = GUARD_CONFIG.THRESHOLDS.MAX_BACKOFF_MS;
    const mult = GUARD_CONFIG.THRESHOLDS.BACKOFF_MULTIPLIER;

    // Exponential calculation: base * (mult ^ (attempt - 1))
    let backoff = base * Math.pow(mult, Math.max(0, attempt - 1));
    backoff = Math.min(backoff, max);

    // Apply randomized jitter (+/- jitter percent)
    const jitterFactor = (GUARD_CONFIG.THRESHOLDS.JITTER_PERCENT / 100) * (Math.random() * 2 - 1);
    const jittered = Math.round(backoff * (1 + jitterFactor));

    return Math.max(base, jittered);
  }

  public async restartService(serviceName: string): Promise<RecoveryAction> {
    const config = GUARD_CONFIG.SERVICES.find((s) => s.name === serviceName);
    const actionId = `RESTART-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date().toISOString();

    let state = this.restartStates.get(serviceName);
    if (!state) {
      state = {
        serviceName,
        restartCount: 0,
        lastRestartTimestampMs: Date.now(),
        currentBackoffMs: GUARD_CONFIG.THRESHOLDS.INITIAL_BACKOFF_MS,
        isTripwireTriggered: false,
      };
      this.restartStates.set(serviceName, state);
    }

    // Reset restart counter if last restart was over 2 minutes ago
    if (Date.now() - state.lastRestartTimestampMs > 120000) {
      state.restartCount = 0;
      state.isTripwireTriggered = false;
    }

    state.restartCount++;
    state.lastRestartTimestampMs = Date.now();

    // Enforce crash-loop tripwire
    if (state.restartCount > GUARD_CONFIG.THRESHOLDS.MAX_RESTART_ATTEMPTS) {
      state.isTripwireTriggered = true;
      const warnMsg = `Crash loop detected for "${serviceName}": exceeded ${GUARD_CONFIG.THRESHOLDS.MAX_RESTART_ATTEMPTS} restarts within window. Halting automatic restarts.`;
      logger.critical(warnMsg);

      return {
        id: actionId,
        timestamp,
        type: 'SERVICE_RESTART',
        target: serviceName,
        success: false,
        attemptNumber: state.restartCount,
        details: warnMsg,
      };
    }

    if (!config) {
      return {
        id: actionId,
        timestamp,
        type: 'SERVICE_RESTART',
        target: serviceName,
        success: false,
        attemptNumber: state.restartCount,
        details: `Unknown service name: ${serviceName}`,
      };
    }

    state.currentBackoffMs = this.calculateBackoff(state.restartCount);
    logger.info(`Initiating restart for "${serviceName}" (Attempt #${state.restartCount}) with ${state.currentBackoffMs}ms backoff.`);

    // Wait for exponential backoff delay before respawning
    await new Promise((resolve) => setTimeout(resolve, state.currentBackoffMs));

    try {
      const parts = config.startCommand.split(' ');
      const cmd = parts[0];
      const args = parts.slice(1);

      const child = spawn(cmd, args, {
        cwd: config.cwd,
        detached: true,
        stdio: 'ignore',
        shell: process.platform === 'win32',
      });

      child.unref();
      this.childProcesses.set(serviceName, child);

      logger.info(`Successfully respawned service "${serviceName}" (PID: ${child.pid})`);

      return {
        id: actionId,
        timestamp,
        type: 'SERVICE_RESTART',
        target: serviceName,
        success: true,
        backoffDelayMs: state.currentBackoffMs,
        attemptNumber: state.restartCount,
        details: `Service process respawned with PID ${child.pid} after ${state.currentBackoffMs}ms backoff.`,
      };
    } catch (err: any) {
      logger.error(`Failed to respawn service "${serviceName}": ${err.message}`);
      return {
        id: actionId,
        timestamp,
        type: 'SERVICE_RESTART',
        target: serviceName,
        success: false,
        backoffDelayMs: state.currentBackoffMs,
        attemptNumber: state.restartCount,
        details: `Process spawn failure: ${err.message}`,
      };
    }
  }

  public getRestartState(serviceName: string): ServiceRestartState | undefined {
    return this.restartStates.get(serviceName);
  }
}
