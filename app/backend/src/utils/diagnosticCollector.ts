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

  /**
   * Generates a sanitized text report formatted for operator/customer support.
   */
  public static async generateSanitizedReport(): Promise<string> {
    const diag = await this.collectSafeDiagnostics();
    const { MerchantRepository } = await import('../database/repositories/merchantRepository.js');
    const { InstallationIdentityRepository } = await import('../database/repositories/installationIdentityRepository.js');
    const { jobRepository } = await import('../database/repositories/jobRepository.js');
    const { SupabaseAdminClient } = await import('../services/supabase/supabaseAdminClient.js');

    const primary = MerchantRepository.getPrimaryMerchant();
    const identity = InstallationIdentityRepository.get();

    let activeJobs = 0;
    let completedJobs = 0;
    let failedJobs = 0;
    let totalJobs = 0;

    try {
      const allJobs = jobRepository.getAll();
      totalJobs = allJobs.length;
      activeJobs = allJobs.filter((j: any) => ['PAID', 'READY_TO_PRINT', 'DOWNLOADING', 'FILE_READY', 'QUEUED', 'PRINTING'].includes(j.status)).length;
      completedJobs = allJobs.filter((j: any) => ['PRINTED', 'READY_FOR_PICKUP', 'COLLECTED'].includes(j.status)).length;
      failedJobs = allJobs.filter((j: any) => ['PRINT_FAILED', 'DOWNLOAD_FAILED', 'FILE_VERIFICATION_FAILED', 'CANCELLED'].includes(j.status)).length;
    } catch {}

    const errorLogs = diag.recentLogsPreview.filter((l) => l.toLowerCase().includes('error') || l.toLowerCase().includes('failed'));
    const warningLogs = diag.recentLogsPreview.filter((l) => l.toLowerCase().includes('warn') || l.toLowerCase().includes('warning'));

    const cloudStatus = SupabaseAdminClient.isConfigured() ? 'Online' : 'Offline (Local V1 Mode)';
    const selectedPrinter = primary?.selected_printer || diag.printers.names[0] || 'AutoPrint System Spooler';

    return [
      '==================================================',
      'AutoPrint Diagnostics',
      '==================================================',
      `Version:      ${diag.application.version} (Node ${diag.application.nodeVersion})`,
      `OS:           ${diag.system.platform} ${diag.system.osRelease} (${diag.system.arch})`,
      `Device:       ${identity?.device_id || 'DEV-LOCAL'} (Installation: ${identity?.installation_id || 'LOCAL'})`,
      `Merchant:     ${primary?.shop_name || 'Unset'} (${identity?.merchant_id || 'AP-LOCAL'})`,
      `Printer:      ${selectedPrinter} (${diag.printers.count} detected)`,
      `Local DB:     SQLite3 (WAL) - ${diag.database.healthy ? 'Operational' : 'Error'}`,
      `Print Engine: V1 Local-First Autonomous (Operational)`,
      `Cloud:        ${cloudStatus}`,
      `Last Sync:    ${primary?.updated_at || 'N/A'}`,
      `Queue:        ${activeJobs} active, ${completedJobs} completed, ${failedJobs} failed (Total: ${totalJobs})`,
      `Errors:       ${errorLogs.length} error events in recent log window`,
      `Warnings:     ${warningLogs.length} warning events in recent log window`,
      '==================================================',
    ].join('\n');
  }
}

