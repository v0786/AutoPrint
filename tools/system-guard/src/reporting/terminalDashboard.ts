/**
 * AutoPrint SystemGuard — Rich ANSI Terminal Health Dashboard
 */

import { SystemHealthReport } from '../types';

export class TerminalDashboard {
  public static render(report: SystemHealthReport): string {
    const lines: string[] = [];

    const isOptimal = report.overallStatus === 'OPTIMAL';
    const isDegraded = report.overallStatus === 'DEGRADED';
    const isCritical = report.overallStatus === 'CRITICAL';

    const statusBadge = isOptimal
      ? '\x1b[42m\x1b[30m OPTIMAL \x1b[0m'
      : isDegraded
      ? '\x1b[43m\x1b[30m DEGRADED \x1b[0m'
      : '\x1b[41m\x1b[37m CRITICAL \x1b[0m';

    const scoreColor =
      report.healthScore >= 90
        ? '\x1b[32m'
        : report.healthScore >= 70
        ? '\x1b[33m'
        : '\x1b[31m';

    lines.push('\x1b[1m\x1b[36m====================================================================\x1b[0m');
    lines.push(`\x1b[1m\x1b[37m   AUTOPRINT SYSTEMGUARD — CONTINUOUS DIAGNOSTICS & RECOVERY       \x1b[0m`);
    lines.push('\x1b[1m\x1b[36m====================================================================\x1b[0m');
    lines.push(` System Status : ${statusBadge}  Score: ${scoreColor}${report.healthScore}/100\x1b[0m  Checked: ${report.timestamp}`);
    lines.push('--------------------------------------------------------------------');

    // 1. Service Health Matrix
    lines.push('\x1b[1m\x1b[34m[SERVICES & PROCESSES]\x1b[0m');
    for (const s of report.services) {
      const stateBadge = s.isAlive
        ? '\x1b[32m● ONLINE\x1b[0m'
        : '\x1b[31m✖ OFFLINE\x1b[0m';
      const latency = s.latencyMs !== undefined ? `(${s.latencyMs}ms)` : '';
      const portStr = `:${s.port}`.padEnd(7);
      lines.push(`  ${stateBadge} ${s.name.padEnd(26)} Port ${portStr} ${latency} ${s.errorMessage ? '\x1b[31m' + s.errorMessage + '\x1b[0m' : ''}`);
    }
    lines.push('--------------------------------------------------------------------');

    // 2. Resource Telemetry
    lines.push('\x1b[1m\x1b[34m[RESOURCE CONSUMPTION]\x1b[0m');
    const mem = report.resources.memory;
    const cpu = report.resources.cpu;
    const memBar = this.renderProgressBar(mem.usedPercent);
    lines.push(`  RAM Usage : [${memBar}] ${mem.usedPercent}% (${mem.usedMb}MB / ${mem.totalMb}MB) | Heap: ${mem.heapUsedMb}MB`);
    lines.push(`  CPU Load  : ${cpu.usagePercent}% (${cpu.cores} Cores) | System Uptime: ${Math.round(report.resources.systemUptimeSeconds / 3600)}h`);
    if (report.resources.leakWarning) {
      lines.push(`  \x1b[33m⚠ WARNING : ${report.resources.leakWarning}\x1b[0m`);
    }
    lines.push('--------------------------------------------------------------------');

    // 3. File Integrity & Code Quality
    lines.push('\x1b[1m\x1b[34m[INTEGRITY & CODE ANOMALIES]\x1b[0m');
    const intBadge = report.integrity.isClean
      ? '\x1b[32m✔ BASELINE VERIFIED\x1b[0m'
      : `\x1b[31m✖ ${report.integrity.tamperedCount} Tampered / ${report.integrity.missingCount} Missing\x1b[0m`;
    lines.push(`  File Integrity : ${intBadge}`);

    const anomBadge =
      report.codeAnomalies.count === 0
        ? '\x1b[32m✔ ZERO ANOMALIES\x1b[0m'
        : `\x1b[33m⚠ ${report.codeAnomalies.count} Issues Flagged\x1b[0m`;
    lines.push(`  Static Analysis: ${anomBadge}`);

    if (report.integrity.diffs.length > 0) {
      lines.push('  \x1b[31mModified/Missing Files:\x1b[0m');
      for (const d of report.integrity.diffs.slice(0, 5)) {
        lines.push(`    - [${d.type}] ${d.relativePath}`);
      }
      if (report.integrity.diffs.length > 5) {
        lines.push(`    ... and ${report.integrity.diffs.length - 5} more files.`);
      }
    }

    // 4. Recent Self-Healing Actions
    if (report.recentRecoveryActions.length > 0) {
      lines.push('--------------------------------------------------------------------');
      lines.push('\x1b[1m\x1b[35m[RECENT SELF-HEALING ACTIONS]\x1b[0m');
      for (const a of report.recentRecoveryActions.slice(-4)) {
        const icon = a.success ? '\x1b[32m✔\x1b[0m' : '\x1b[31m✖\x1b[0m';
        lines.push(`  ${icon} [${a.type}] on ${a.target}: ${a.details}`);
      }
    }

    lines.push('\x1b[1m\x1b[36m====================================================================\x1b[0m');
    return lines.join('\n');
  }

  private static renderProgressBar(percent: number, length = 20): string {
    const filled = Math.min(length, Math.max(0, Math.round((percent / 100) * length)));
    const empty = length - filled;
    const color = percent > 85 ? '\x1b[31m' : percent > 70 ? '\x1b[33m' : '\x1b[32m';
    return `${color}${'█'.repeat(filled)}\x1b[90m${'░'.repeat(empty)}\x1b[0m`;
  }
}
