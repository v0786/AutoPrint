import os from 'os';
import fs from 'fs';
import path from 'path';
import { CONFIG, PATHS } from '../config/environment';
import { LogRedactor } from './logRedactor';
import { PrinterService } from '../services/printerService';
import { getDb } from '../database/db';

export interface SafeDiagnosticSummary {
  collectedAt: string;
  application: {
    name: string;
    version: string;
    environment: string;
    nodeVersion: string;
    uptimeSeconds: number;
  };
  system: {
    platform: string;
    osRelease: string;
    arch: string;
    totalMemoryMb: number;
    freeMemoryMb: number;
  };
  database: {
    engine: string;
    healthy: boolean;
  };
  printers: {
    count: number;
    names: string[];
  };
  recentLogsPreview: string[];
}

export class DiagnosticCollector {
  /**
   * Safely collects allowlisted system diagnostics with strict secret redaction.
   */
  public static async collectSafeDiagnostics(): Promise<SafeDiagnosticSummary> {
    let dbHealthy = false;
    try {
      const row = getDb().prepare('SELECT 1 as ok').get() as { ok: number };
      dbHealthy = row?.ok === 1;
    } catch {
      dbHealthy = false;
    }

    let printerNames: string[] = [];
    try {
      const printers = await PrinterService.getAvailablePrinters();
      printerNames = printers.map((p) => p.name);
    } catch {
      printerNames = ['AutoPrint Spooler'];
    }

    // Read last 30 lines from backend logs if available
    const recentLogs: string[] = [];
    const logFilePath = path.join(PATHS.LOGS_DIR, 'backend.log');
    if (fs.existsSync(logFilePath)) {
      try {
        const content = fs.readFileSync(logFilePath, 'utf8');
        const lines = content.split('\n').filter((l) => l.trim().length > 0);
        const lastLines = lines.slice(-30);
        for (const line of lastLines) {
          recentLogs.push(LogRedactor.redactText(line));
        }
      } catch {}
    }

    const summary: SafeDiagnosticSummary = {
      collectedAt: new Date().toISOString(),
      application: {
        name: 'AutoPrint',
        version: CONFIG.APP_VERSION,
        environment: CONFIG.NODE_ENV,
        nodeVersion: process.version,
        uptimeSeconds: Math.round(process.uptime()),
      },
      system: {
        platform: os.platform(),
        osRelease: os.release(),
        arch: os.arch(),
        totalMemoryMb: Math.round(os.totalmem() / (1024 * 1024)),
        freeMemoryMb: Math.round(os.freemem() / (1024 * 1024)),
      },
      database: {
        engine: 'SQLite3-WAL',
        healthy: dbHealthy,
      },
      printers: {
        count: printerNames.length,
        names: printerNames,
      },
      recentLogsPreview: recentLogs,
    };

    return LogRedactor.redactObject(summary);
  }
}
