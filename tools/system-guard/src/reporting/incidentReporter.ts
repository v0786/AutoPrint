/**
 * AutoPrint SystemGuard — AI-Optimized Incident Report Generator & Escalator
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { IncidentReport, SystemHealthStatus, IncidentSeverity, IntegrityDiff, RecoveryAction, ResourceMetrics } from '../types';
import { GUARD_PATHS, GUARD_CONFIG } from '../config';
import { logger } from './structuredLogger';

export class IncidentReporter {
  constructor() {
    if (!fs.existsSync(GUARD_PATHS.INCIDENTS_DIR)) {
      fs.mkdirSync(GUARD_PATHS.INCIDENTS_DIR, { recursive: true });
    }
  }

  public createIncidentReport(params: {
    title: string;
    component: string;
    severity: IncidentSeverity;
    summary: string;
    healthStatus: SystemHealthStatus;
    telemetry?: {
      exceptionType?: string;
      errorMessage?: string;
      stackTrace?: string;
      triggeringInput?: string;
      reproducibilityNotes?: string;
    };
    tamperedFiles?: IntegrityDiff[];
    recoveryActions?: RecoveryAction[];
    metrics?: ResourceMetrics;
  }): IncidentReport {
    const timestamp = new Date().toISOString();
    const incidentId = `INC-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const report: IncidentReport = {
      id: incidentId,
      timestamp,
      severity: params.severity,
      title: logger.redact(params.title),
      component: params.component,
      summary: logger.redact(params.summary),
      systemState: {
        healthStatus: params.healthStatus,
        os: `${os.type()} ${os.release()} (${os.arch()})`,
        nodeVersion: process.version,
        memoryUsedMb: params.metrics?.memory.usedMb || Math.round((os.totalmem() - os.freemem()) / (1024 * 1024)),
        freeMemoryMb: params.metrics?.memory.freeMb || Math.round(os.freemem() / (1024 * 1024)),
        cpuLoad: params.metrics?.cpu.usagePercent || 0,
      },
      telemetry: {
        exceptionType: params.telemetry?.exceptionType || 'RuntimeAnomaly',
        errorMessage: params.telemetry?.errorMessage ? logger.redact(params.telemetry.errorMessage) : undefined,
        stackTrace: params.telemetry?.stackTrace ? logger.redact(params.telemetry.stackTrace) : undefined,
        triggeringInput: params.telemetry?.triggeringInput ? logger.redact(params.telemetry.triggeringInput) : undefined,
        reproducibilityNotes: params.telemetry?.reproducibilityNotes ? logger.redact(params.telemetry.reproducibilityNotes) : undefined,
      },
      recentChanges: {
        tamperedFiles: params.tamperedFiles || [],
        recentLogs: logger.getRecentLogs(30),
      },
      recoveryHistory: params.recoveryActions || [],
      aiAssistantInstructions: this.generateAiInstructions(incidentId, params.component, params.severity),
    };

    // Save JSON output
    const jsonFilename = `${incidentId}.json`;
    const jsonPath = path.join(GUARD_PATHS.INCIDENTS_DIR, jsonFilename);
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf8');

    // Save AI-Optimized Markdown output
    const mdFilename = `${incidentId}.md`;
    const mdPath = path.join(GUARD_PATHS.INCIDENTS_DIR, mdFilename);
    const mdContent = this.formatMarkdownReport(report);
    fs.writeFileSync(mdPath, mdContent, 'utf8');

    report.jsonPath = jsonPath;
    report.markdownPath = mdPath;

    logger.critical(`AI Escalation Incident Report generated: ${incidentId} -> ${mdPath}`, {
      incidentId,
      severity: params.severity,
      component: params.component,
    });

    return report;
  }

  private generateAiInstructions(id: string, component: string, severity: IncidentSeverity): string {
    return [
      `You are analyzing an automated incident escalation from AutoPrint SystemGuard.`,
      `Incident ID: ${id} | Component: ${component} | Severity: ${severity}`,
      `GOAL: Identify the root cause, verify why automated self-healing failed, and provide an exact surgical code fix or diagnostic command.`,
      `RULES: Maintain existing dark-mode UI styling and non-breaking database schema rules. Verify secrets are not exposed.`,
    ].join(' ');
  }

  private formatMarkdownReport(report: IncidentReport): string {
    return `# 🚨 SystemGuard Incident Report: ${report.id}

**Severity**: \`${report.severity}\`  
**Timestamp**: \`${report.timestamp}\`  
**Component**: \`${report.component}\`  
**System Status**: \`${report.systemState.healthStatus}\`

---

## 1. Executive Summary
${report.summary}

---

## 2. Telemetry & Error Details
- **Exception Type**: \`${report.telemetry.exceptionType || 'N/A'}\`
- **Error Message**:
\`\`\`text
${report.telemetry.errorMessage || 'No specific error message provided.'}
\`\`\`

- **Stack Trace**:
\`\`\`text
${report.telemetry.stackTrace || 'No stack trace captured.'}
\`\`\`

- **Triggering Input / Conditions**:
\`\`\`text
${report.telemetry.triggeringInput || 'Normal background runtime cycle.'}
\`\`\`

---

## 3. Environment & Hardware Metrics
| Metric | Value |
| :--- | :--- |
| **Operating System** | \`${report.systemState.os}\` |
| **Node.js Version** | \`${report.systemState.nodeVersion}\` |
| **Used Memory** | \`${report.systemState.memoryUsedMb} MB\` |
| **Free Memory** | \`${report.systemState.freeMemoryMb} MB\` |
| **CPU Estimated Load** | \`${report.systemState.cpuLoad}%\` |

---

## 4. File Integrity & Recent Diffs
${
  report.recentChanges.tamperedFiles.length === 0
    ? '_All critical application files match the clean baseline manifest._'
    : report.recentChanges.tamperedFiles
        .map(
          (t) => `- **${t.type}**: \`${t.relativePath}\` (Expected: \`${t.expectedHash?.substring(0, 10)}...\`, Actual: \`${t.actualHash?.substring(0, 10) || 'None'}...\`)`
        )
        .join('\n')
}

---

## 5. Recovery Actions Attempted by SystemGuard
${
  report.recoveryHistory.length === 0
    ? '_No automatic recovery steps were initiated._'
    : report.recoveryHistory
        .map(
          (a) => `- [${a.success ? '✅ SUCCESS' : '❌ FAILED'}] **${a.type}** on \`${a.target}\`: ${a.details}`
        )
        .join('\n')
}

---

## 6. Recent Application Telemetry Logs
\`\`\`text
${report.recentChanges.recentLogs.slice(-25).join('\n') || 'No recent logs available.'}
\`\`\`

---

## 7. AI Assistant Instructions
> [!IMPORTANT]
> ${report.aiAssistantInstructions}
`;
  }
}
