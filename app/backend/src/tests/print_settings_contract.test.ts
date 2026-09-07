import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import { AutoPrintService } from '../services/autoprintService';
import { VerificationService } from '../services/verificationService';
import { jobRepository } from '../database/repositories/jobRepository';
import { verificationRepository } from '../database/repositories/verificationRepository';
import { initDatabase, closeDatabase, getDb } from '../database/db';
import { CONFIG } from '../config/environment';

const TEST_DB_PATH = path.join(CONFIG.PATHS.DATA_DIR, 'backend', 'database', 'print_settings_test.db');

describe('=== AUTOPRINT PRINT SETTINGS CONTRACT & RESILIENCE SUITE ===', () => {
  before(() => {
    // Ensure clean test database directory
    const dir = path.dirname(TEST_DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);

    // Override DB file for isolation
    (CONFIG.PATHS as any).DB_FILE = TEST_DB_PATH;
    initDatabase();
  });

  after(() => {
    closeDatabase();
    if (fs.existsSync(TEST_DB_PATH)) {
      try { fs.unlinkSync(TEST_DB_PATH); } catch {}
    }
  });

  it('Test 1 — New Job: Verified that printSettings and paperFormat exist on job creation', async () => {
    const job = await AutoPrintService.submitJob({
      fileName: 'Architecture_Plan.pdf',
      mimeType: 'application/pdf',
      customerName: 'Siddharth Varma',
      specs: {
        colorMode: 'color',
        copies: 3,
        pageRange: '1-5',
        paperSize: 'a4',
        duplex: 'single',
      },
      printSettings: {
        paperFormat: 'A4',
        orientation: 'portrait',
        colorMode: 'color',
        copies: 3,
        duplex: false,
        pageRange: '1-5',
      },
      paymentMethod: 'UPI',
      amountMinorUnits: 7500,
    });

    assert.ok(job.id, 'Job should have an ID');
    assert.ok(job.printSettings, 'Job response MUST contain printSettings');
    assert.equal(job.printSettings.paperFormat, 'A4', 'paperFormat must be A4');
    assert.equal(job.printSettings.orientation, 'portrait');
    assert.equal(job.printSettings.colorMode, 'color');
    assert.equal(job.printSettings.copies, 3);
    assert.equal(job.printSettings.duplex, false);
    assert.equal(job.printSettings.pageRange, '1-5');

    // Retrieve via getJobById
    const fetched = AutoPrintService.getJobById(job.id);
    assert.ok(fetched);
    assert.ok(fetched.printSettings);
    assert.equal(fetched.printSettings.paperFormat, 'A4');
  });

  it('Test 2 — Default Settings: Job without explicit printSettings normalizes to safe A4 defaults', async () => {
    const job = await AutoPrintService.submitJob({
      fileName: 'Default_Document.pdf',
      mimeType: 'application/pdf',
      customerName: 'Anita Desai',
      specs: {
        colorMode: 'bw',
        copies: 1,
        pageRange: 'all',
      },
      paymentMethod: 'UPI',
      amountMinorUnits: 2000,
    });

    assert.ok(job.printSettings, 'Default job must contain printSettings');
    assert.equal(job.printSettings.paperFormat, 'A4', 'Default paper format must be A4');
    assert.equal(job.printSettings.orientation, 'portrait');
    assert.equal(job.printSettings.colorMode, 'black_and_white');
    assert.equal(job.printSettings.copies, 1);
    assert.equal(job.printSettings.duplex, false);
    assert.equal(job.printSettings.pageRange, 'all');
  });

  it('Test 3 — Custom Settings: Selecting A3, Landscape, Duplex reflects accurately', async () => {
    const job = await AutoPrintService.submitJob({
      fileName: 'Blueprint_A3_Double.pdf',
      mimeType: 'application/pdf',
      customerName: 'Vikram Mehta',
      specs: {
        colorMode: 'bw',
        copies: 5,
        pageRange: 'all',
        paperSize: 'a3',
        duplex: 'double',
      },
      printSettings: {
        paperFormat: 'A3',
        orientation: 'landscape',
        colorMode: 'black_and_white',
        copies: 5,
        duplex: true,
        pageRange: 'all',
      },
      paymentMethod: 'UPI',
      amountMinorUnits: 15000,
    });

    assert.ok(job.printSettings);
    assert.equal(job.printSettings.paperFormat, 'A3', 'Custom paper format must be A3');
    assert.equal(job.printSettings.orientation, 'landscape');
    assert.equal(job.printSettings.colorMode, 'black_and_white');
    assert.equal(job.printSettings.copies, 5);
    assert.equal(job.printSettings.duplex, true);
  });

  it('Test 4 — Payment Flow: Status transitions preserve original printSettings', async () => {
    const job = await AutoPrintService.submitJob({
      fileName: 'Payment_Test_Doc.pdf',
      mimeType: 'application/pdf',
      customerName: 'Pooja Hegde',
      specs: {
        colorMode: 'color',
        copies: 2,
        pageRange: 'all',
        paperSize: 'legal',
      },
      paymentMethod: 'UPI',
      amountMinorUnits: 6000,
    });

    const code = job.verification?.verificationCode!;
    assert.ok(code);

    // Simulate Payment Gateway Confirmation
    const result = VerificationService.processDigitalPaymentAttempt(code, {
      status: 'SUCCESS',
      gatewayRef: 'UPI-TXN-882910',
      vpa: 'pooja@oksbi',
    });

    assert.equal(result.record.paymentStatus, 'UPI_SUCCESS');

    // Update job status to PRINTED then COLLECTED
    const updated = AutoPrintService.updateJobStatus(job.id, 'PRINTED', 'SYSTEM_AUTOPRINT', 'Spooler complete');
    assert.ok(updated);
    assert.equal(updated.status, 'PRINTED');
    assert.ok(updated.printSettings);
    assert.equal(updated.printSettings.paperFormat, 'Legal', 'paperFormat must be preserved after status transitions');
    assert.equal(updated.printSettings.colorMode, 'color');
    assert.equal(updated.printSettings.copies, 2);
  });

  it('Test 5 — Legacy Job Normalization: Database record with NULL print_settings_json normalizes safely', async () => {
    const db = getDb();
    const legacyId = 'AP-LEGACY-001';

    // Directly insert legacy row with NULL print_settings_json
    db.prepare(`
      INSERT INTO print_jobs (
        id, job_no, title, file_name, file_path, customer_name, printer_name,
        color_mode, copies, page_range, paper_size, duplex, finishing,
        print_settings_json, amount_minor_units, currency, payment_method, status
      ) VALUES (
        ?, '#9999', 'Old Invoice', 'old_invoice.pdf', '', 'Legacy Customer', 'AutoPrint Spooler',
        'bw', 2, 'all', 'letter', 'single', 'none',
        NULL, 4000, 'INR', 'CASH', 'QUEUED'
      )
    `).run(legacyId);

    // Fetch via AutoPrintService
    const legacyJob = AutoPrintService.getJobById(legacyId);
    assert.ok(legacyJob, 'Legacy job must be retrieved');
    assert.ok(legacyJob.printSettings, 'printSettings must not be undefined for legacy jobs');
    assert.equal(legacyJob.printSettings.paperFormat, 'Letter', 'Legacy paper_size letter should normalize to Letter');
    assert.equal(legacyJob.printSettings.copies, 2);
    assert.equal(legacyJob.printSettings.colorMode, 'black_and_white');
    assert.equal(legacyJob.printSettings.duplex, false);
    assert.equal(legacyJob.printSettings.orientation, 'portrait');
  });

  it('Test 6 — Malformed Data: Corrupted print_settings_json string normalizes without crashing', async () => {
    const db = getDb();
    const malformedId = 'AP-CORRUPT-002';

    // Insert malformed JSON string into database
    db.prepare(`
      INSERT INTO print_jobs (
        id, job_no, title, file_name, file_path, customer_name, printer_name,
        color_mode, copies, page_range, paper_size, duplex, finishing,
        print_settings_json, amount_minor_units, currency, payment_method, status
      ) VALUES (
        ?, '#9998', 'Corrupt Doc', 'corrupt.pdf', '', 'Corrupt Customer', 'AutoPrint Spooler',
        'color', 1, 'all', 'a4', 'single', 'none',
        'NOT_JSON_CORRUPTED_{{{', 3000, 'INR', 'UPI', 'QUEUED'
      )
    `).run(malformedId);

    // Fetch via AutoPrintService — MUST NOT CRASH
    const fetched = AutoPrintService.getJobById(malformedId);
    assert.ok(fetched, 'Job should be retrieved safely');
    assert.ok(fetched.printSettings, 'printSettings MUST NOT be undefined even if database JSON is corrupt');
    assert.equal(fetched.printSettings.paperFormat, 'A4');
    assert.equal(fetched.printSettings.colorMode, 'color');
  });

  it('Test 7 — All Jobs List: getAllJobs returns complete printSettings on every single job', async () => {
    const allJobs = AutoPrintService.getAllJobs();
    assert.ok(allJobs.length >= 5, 'Should have at least 5 jobs in database');

    for (const j of allJobs) {
      assert.ok(j.printSettings, `Job ${j.id} is missing printSettings`);
      assert.ok(j.printSettings.paperFormat, `Job ${j.id} is missing paperFormat`);
      assert.ok(['A4', 'A3', 'Letter', 'Legal', '80mm'].includes(j.printSettings.paperFormat), `Job ${j.id} has invalid paperFormat`);
      assert.ok(typeof j.printSettings.copies === 'number');
      assert.ok(typeof j.printSettings.duplex === 'boolean');
      assert.ok(['black_and_white', 'color'].includes(j.printSettings.colorMode));
    }
  });
});
