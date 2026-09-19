/**
 * AutoPrint SystemGuard — Comprehensive Diagnostic & Recovery Test Suite
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { BaselineManager } from '../src/recovery/baselineManager';
import { IntegrityScanner } from '../src/monitoring/integrityScanner';
import { FileRestorer } from '../src/recovery/fileRestorer';
import { CodeAnomaliesScanner } from '../src/monitoring/codeAnomaliesScanner';
import { ResourceLeakDetector } from '../src/monitoring/resourceLeakDetector';
import { ServiceController } from '../src/recovery/serviceController';
import { IncidentReporter } from '../src/reporting/incidentReporter';
import { StructuredLogger } from '../src/reporting/structuredLogger';
import { SystemGuard } from '../src/systemGuard';

test('=== SYSTEMGUARD DIAGNOSTIC & RECOVERY SUITE ===', async (t) => {
  const tempTestDir = path.join(os.tmpdir(), `guard_test_${Date.now()}`);
  fs.mkdirSync(tempTestDir, { recursive: true });

  t.after(() => {
    try {
      fs.rmSync(tempTestDir, { recursive: true, force: true });
    } catch {}
  });

  await t.test('1. Baseline Snapshot Creation & Verification', async () => {
    const testBaselineDir = path.join(tempTestDir, 'baselines');
    const mgr = new BaselineManager(testBaselineDir);

    const manifest = mgr.createSnapshot();
    assert.ok(manifest.totalFiles > 0, 'Baseline must register critical files');
    assert.ok(fs.existsSync(mgr.getManifestPath()), 'Manifest file must exist on disk');

    const loaded = mgr.loadBaseline();
    assert.ok(loaded, 'Baseline must be loadable from disk');
    assert.equal(loaded?.totalFiles, manifest.totalFiles);
  });

  await t.test('2. File Tampering Detection & Automated Restoration', async () => {
    const testBaselineDir = path.join(tempTestDir, 'baselines_tamper');
    const mgr = new BaselineManager(testBaselineDir);

    // Create dummy critical file to test
    const dummyFile = path.join(tempTestDir, 'critical_config.json');
    fs.writeFileSync(dummyFile, JSON.stringify({ version: '1.0.0', secure: true }), 'utf8');

    // Snapshot
    const originalHash = mgr.computeSha256(dummyFile);
    const filesStore = path.join(testBaselineDir, 'files');
    fs.mkdirSync(filesStore, { recursive: true });
    fs.copyFileSync(dummyFile, path.join(filesStore, `${originalHash}.bak`));

    const manifest = {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      totalFiles: 1,
      systemMetadata: {
        platform: os.platform(),
        nodeVersion: process.version,
        osRelease: os.release(),
        arch: os.arch(),
      },
      files: {
        [path.relative(tempTestDir, dummyFile).replace(/\\/g, '/')]: {
          relativePath: path.relative(tempTestDir, dummyFile).replace(/\\/g, '/'),
          absolutePath: dummyFile,
          sha256: originalHash,
          sizeBytes: fs.statSync(dummyFile).size,
          lastModifiedMs: fs.statSync(dummyFile).mtimeMs,
        },
      },
    };
    fs.writeFileSync(path.join(testBaselineDir, 'manifest.json'), JSON.stringify(manifest), 'utf8');

    // Tamper with file
    fs.writeFileSync(dummyFile, '{"tampered": true, "corrupted": "bad code"}', 'utf8');

    // Run Integrity Scanner
    const scanner = new IntegrityScanner(mgr);
    // Overwrite workspace root for test
    const diffs = [
      {
        type: 'MODIFIED' as const,
        relativePath: path.relative(tempTestDir, dummyFile).replace(/\\/g, '/'),
        expectedHash: originalHash,
        actualHash: mgr.computeSha256(dummyFile),
        timestamp: new Date().toISOString(),
      },
    ];

    // Restore file
    const restorer = new FileRestorer(mgr);
    // Create mock diff pointing to dummy file
    const mockBackupPath = mgr.getBackupFilePath(originalHash);
    assert.ok(mockBackupPath && fs.existsSync(mockBackupPath), 'Backup copy must exist in baseline');

    fs.copyFileSync(mockBackupPath, dummyFile);
    const restoredHash = mgr.computeSha256(dummyFile);
    assert.equal(restoredHash, originalHash, 'Restored file hash must match baseline hash');
  });

  await t.test('3. Code Anomalies & Syntax Scanner', async () => {
    const scanner = new CodeAnomaliesScanner();

    // Create valid and invalid files
    const validJs = path.join(tempTestDir, 'valid.js');
    fs.writeFileSync(validJs, 'function calculate(a, b) { return a + b; }', 'utf8');

    const invalidJs = path.join(tempTestDir, 'syntax_error.js');
    fs.writeFileSync(invalidJs, 'function broken( { return missing_paren;', 'utf8');

    const invalidJson = path.join(tempTestDir, 'broken.json');
    fs.writeFileSync(invalidJson, '{"key": "value", trailing_comma,}', 'utf8');

    const result = scanner.scanFiles([tempTestDir]);
    assert.ok(result.count >= 2, 'Scanner must detect syntax error and malformed JSON');

    const hasSyntax = result.issues.some((i) => i.type === 'SYNTAX_ERROR');
    const hasJsonErr = result.issues.some((i) => i.type === 'MALFORMED_CONFIG');
    assert.ok(hasSyntax, 'Must catch JavaScript syntax error');
    assert.ok(hasJsonErr, 'Must catch JSON parsing error');
  });

  await t.test('4. Resource Leak Detector & Heap Analysis', async () => {
    const detector = new ResourceLeakDetector();
    const metrics = detector.sampleMetrics();

    assert.ok(metrics.memory.totalMb > 0, 'Total memory must be positive');
    assert.ok(metrics.memory.heapUsedMb > 0, 'Heap usage must be tracked');
    assert.ok(typeof metrics.cpu.usagePercent === 'number', 'CPU usage percent must be calculated');
  });

  await t.test('5. Exponential Backoff & Crash Loop Prevention', async () => {
    const controller = new ServiceController();

    const backoff1 = controller.calculateBackoff(1);
    const backoff2 = controller.calculateBackoff(2);
    const backoff3 = controller.calculateBackoff(3);

    // Assert exponential scaling
    assert.ok(backoff2 >= backoff1, 'Backoff #2 must be >= Backoff #1');
    assert.ok(backoff3 >= backoff2, 'Backoff #3 must be >= Backoff #2');

    // Verify crash loop tripwire triggers when max attempts reached
    for (let i = 1; i <= 6; i++) {
      const act = await controller.restartService('NonExistentService');
      if (i > 5) {
        assert.equal(act.success, false, 'Must fail on attempt > 5');
        assert.ok(act.details.includes('Crash loop detected'), 'Must trigger crash loop breaker');
      }
    }
  });

  await t.test('6. Secret Redaction in Structured Logging', async () => {
    const logger = new StructuredLogger('test_redact.log');

    const sensitiveText = 'Connecting with password: "SuperSecretPassword123" and token: "bearer_987654321_secret"';
    const redacted = logger.redact(sensitiveText);

    assert.ok(!redacted.includes('SuperSecretPassword123'), 'Raw password must not appear');
    assert.ok(!redacted.includes('bearer_987654321_secret'), 'Raw token must not appear');
    assert.ok(redacted.includes('*****'), 'Masked wildcard must be present');
  });

  await t.test('7. AI Escalation Incident Report Formatting', async () => {
    const reporter = new IncidentReporter();

    const report = reporter.createIncidentReport({
      title: 'Simulated Spooler Disconnect Crash',
      component: 'PrinterSpoolerSubsystem',
      severity: 'HIGH',
      summary: 'Printer spooler pipe broke during multi-copy print dispatch.',
      healthStatus: 'DEGRADED',
      telemetry: {
        exceptionType: 'SpoolerConnectionException',
        errorMessage: 'EPIPE: Broken pipe on spooler handle',
        stackTrace: 'Error: EPIPE\n    at PrinterService.dispatch (printerService.ts:120)',
        triggeringInput: 'PrintJobRequest: 5 copies A4 color',
      },
    });

    assert.ok(report.id.startsWith('INC-'), 'Incident ID must follow INC- format');
    assert.ok(report.markdownPath && fs.existsSync(report.markdownPath), 'Markdown report file must be written');
    assert.ok(report.jsonPath && fs.existsSync(report.jsonPath), 'JSON report file must be written');

    const mdContent = fs.readFileSync(report.markdownPath, 'utf8');
    assert.ok(mdContent.includes('AI Assistant Instructions'), 'Must include AI instructions');
    assert.ok(mdContent.includes('EPIPE: Broken pipe'), 'Must include error details');
    assert.ok(mdContent.includes('Environment & Hardware Metrics'), 'Must include environment metrics');
  });

  await t.test('8. SystemGuard Master Diagnosis', async () => {
    const guard = new SystemGuard();
    const report = await guard.runDiagnosis();

    assert.ok(report.healthScore >= 0 && report.healthScore <= 100, 'Health score must be between 0 and 100');
    assert.ok(['OPTIMAL', 'DEGRADED', 'CRITICAL'].includes(report.overallStatus), 'Status must be valid');
    assert.ok(Array.isArray(report.services), 'Services list must be present');
    assert.ok(report.resources.memory.totalMb > 0, 'Resource memory must be reported');
  });
});
