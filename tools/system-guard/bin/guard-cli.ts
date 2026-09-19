#!/usr/bin/env node
/**
 * AutoPrint SystemGuard — Command Line Interface (CLI)
 */

import { SystemGuard } from '../src/systemGuard';
import { TerminalDashboard } from '../src/reporting/terminalDashboard';
import { logger } from '../src/reporting/structuredLogger';

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';
  const guard = new SystemGuard();

  switch (command.toLowerCase()) {
    case 'status': {
      const report = await guard.runDiagnosis();
      console.log(TerminalDashboard.render(report));
      process.exit(report.overallStatus === 'CRITICAL' ? 1 : 0);
      break;
    }

    case 'scan': {
      console.log('\x1b[36mRunning deep SystemGuard scan (Code, Configs, Integrity)...\x1b[0m');
      const anomalies = guard.codeScanner.scanFiles();
      const integrity = guard.integrityScanner.scanIntegrity();

      console.log('\n--- SCAN RESULTS ---');
      console.log(`Code Anomalies Detected: ${anomalies.count}`);
      for (const iss of anomalies.issues) {
        console.log(`  [${iss.severity}] ${iss.type} in ${iss.filePath}: ${iss.message}`);
      }

      console.log(`\nFile Integrity Check: ${integrity.isClean ? 'ALL CLEAN' : 'DIFFS DETECTED'}`);
      for (const diff of integrity.diffs) {
        console.log(`  [${diff.type}] ${diff.relativePath}`);
      }

      process.exit(anomalies.count > 0 || !integrity.isClean ? 1 : 0);
      break;
    }

    case 'baseline': {
      console.log('\x1b[36mGenerating verified clean baseline snapshot...\x1b[0m');
      guard.createBaseline();
      console.log('\x1b[32m✔ Baseline snapshot created successfully.\x1b[0m');
      break;
    }

    case 'recover': {
      console.log('\x1b[36mExecuting automated self-healing procedures...\x1b[0m');
      const result = await guard.runAutoRecovery();

      console.log('\n--- RECOVERY ACTIONS ---');
      if (result.actions.length === 0) {
        console.log('No self-healing actions required. System is in expected state.');
      } else {
        for (const act of result.actions) {
          const icon = act.success ? '✔' : '✖';
          console.log(`  ${icon} [${act.type}] on ${act.target}: ${act.details}`);
        }
      }

      console.log('\n--- POST-RECOVERY HEALTH ---');
      console.log(TerminalDashboard.render(result.reportAfter));
      break;
    }

    case 'report': {
      console.log('\x1b[36mGenerating on-demand AI escalation report...\x1b[0m');
      const report = await guard.runDiagnosis();
      const incident = guard.incidentReporter.createIncidentReport({
        title: 'Manual Diagnostics Escalation Triggered',
        component: 'SystemGuard CLI',
        severity: report.overallStatus === 'CRITICAL' ? 'HIGH' : 'LOW',
        summary: 'On-demand diagnostics report compiled by administrator via SystemGuard CLI.',
        healthStatus: report.overallStatus,
        tamperedFiles: report.integrity.diffs,
        metrics: report.resources,
      });

      console.log(`\x1b[32m✔ Incident report created:\x1b[0m ${incident.markdownPath}`);
      break;
    }

    case 'watch': {
      console.log('\x1b[36mStarting SystemGuard Continuous Watchdog Daemon (Ctrl+C to stop)...\x1b[0m');
      const intervalSec = parseInt(args[1], 10) || 15;
      await guard.startWatchdog(intervalSec * 1000);
      break;
    }

    default: {
      console.log(`
Usage: guard <command>

Commands:
  status     Display system health status & live dashboard (Default)
  scan       Run deep code & file integrity scan
  baseline   Create or update clean baseline snapshot
  recover    Trigger automated self-healing & repairs
  report     Generate AI-ready escalation report
  watch      Run continuous watchdog monitor loop
      `);
      break;
    }
  }
}

main().catch((err) => {
  logger.error('SystemGuard CLI execution failed', { error: err.message, stack: err.stack });
  console.error('\x1b[31mSystemGuard error:\x1b[0m', err.message);
  process.exit(1);
});
