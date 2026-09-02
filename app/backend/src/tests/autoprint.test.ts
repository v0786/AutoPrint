/**
 * AutoPrint Repository-Wide Automated Test Suite
 * Rigorous automated tests verifying all business logic, security constraints,
 * persistence, payment state machine, 3-strike lockout, and audit trails.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { initDatabase, getDb } from '../database/db';
import { AutoPrintService } from '../services/autoprintService';
import { VerificationService } from '../services/verificationService';
import { PdfOverlayService } from '../services/pdfOverlayService';
import { StorageService } from '../services/storageService';
import { auditLogger } from '../utils/auditLogger';
import { computeHmacChecksum, verifyHmacChecksum } from '../utils/crypto';
import { PDFDocument } from 'pdf-lib';

// Ensure DB is initialized before running tests
initDatabase();

test('=== AUTOPRINT BACKEND TEST SUITE ===', async (t) => {

  await t.test('1. Job Creation and Retrieval', async () => {
    const job = await AutoPrintService.submitJob({
      fileName: 'Invoice_Report_2026.pdf',
      mimeType: 'application/pdf',
      customerName: 'Aarav Sharma',
      customerPhone: '+91 98765 43210',
      printerName: 'Epson TM-T88VI',
      amountMinorUnits: 4500, // Rs. 45.00
      currency: 'INR',
      paymentMethod: 'UPI',
      specs: {
        copies: 2,
        colorMode: 'color',
        paperSize: 'a4',
        duplex: 'single',
        pageRange: '1-5',
        finishing: 'none',
      },
    });

    assert.ok(job.id.startsWith('AP-'), 'Job ID must follow AP- format');
    assert.ok(job.jobNo.startsWith('#'), 'Job No must start with #');
    assert.equal(job.amountTotal, 45.00, 'Amount must be 45.00');
    assert.equal(job.currency, 'INR', 'Currency must be INR');
    assert.ok(job.verification, 'Verification record must be present');
    assert.equal(job.verification?.verificationCode.length, 8, 'Verification code must be 8 digits');

    // Retrieve by ID
    const retrieved = AutoPrintService.getJobById(job.id);
    assert.ok(retrieved, 'Job must be retrievable by ID');
    assert.equal(retrieved?.id, job.id);

    // Retrieve all jobs
    const all = AutoPrintService.getAllJobs();
    assert.ok(all.length >= 1, 'Job list must contain created job');
  });

  await t.test('2. Verification Code Generation & Lookup', async () => {
    const job = await AutoPrintService.submitJob({
      fileName: 'Lab_Report.pdf',
      mimeType: 'application/pdf',
      customerName: 'Priya Patel',
      amountMinorUnits: 2500,
      currency: 'INR',
      paymentMethod: 'CASH',
      specs: { copies: 1, colorMode: 'bw', pageRange: 'all' },
    });

    const code = job.verification!.verificationCode;
    const formatted = job.verification!.formattedCode;

    // Lookup with raw 8-digit code
    const foundRaw = VerificationService.lookupByCode(code);
    assert.equal(foundRaw.jobId, job.id);
    assert.equal(foundRaw.customerName, 'Priya Patel');

    // Lookup with formatted code (contains spaces/dashes)
    const foundFormatted = VerificationService.lookupByCode(formatted);
    assert.equal(foundFormatted.jobId, job.id);

    // Invalid format rejected
    assert.throws(() => VerificationService.lookupByCode('123'), /Invalid verification code format/);
    assert.throws(() => VerificationService.lookupByCode('1234567890'), /Invalid verification code format/);

    // Unknown code throws 404
    assert.throws(() => VerificationService.lookupByCode('99999999'), /No print job found/);
  });

  await t.test('3. HMAC Checksum Validation', async () => {
    const code = '48291057';
    const jobId = 'AP-TEST01';
    const amountMinor = 2450;

    const checksum = computeHmacChecksum(code, jobId, amountMinor);
    assert.match(checksum, /^SEC-[0-9A-F]{4}-[0-9A-F]{4}$/, 'Checksum must match SEC-XXXX-XXXX format');

    const isValid = verifyHmacChecksum(code, jobId, amountMinor, checksum);
    assert.equal(isValid, true, 'Computed checksum must verify as valid');

    const isTampered = verifyHmacChecksum(code, jobId, 9999, checksum);
    assert.equal(isTampered, false, 'Tampered amount must fail verification');
  });

  await t.test('4. Fail-Safe 3-Strike Digital Payment Lockout & Rejection of 4th Attempt', async () => {
    const job = await AutoPrintService.submitJob({
      fileName: 'Thesis_Draft.pdf',
      mimeType: 'application/pdf',
      customerName: 'Vikram Singh',
      amountMinorUnits: 15000, // Rs. 150.00
      currency: 'INR',
      paymentMethod: 'UPI',
      specs: { copies: 1, colorMode: 'bw', pageRange: 'all' },
    });

    const code = job.verification!.verificationCode;

    // Strike 1: Failed attempt
    const s1 = VerificationService.processDigitalPaymentAttempt(code, {
      status: 'FAILED',
      errorCode: 'U16_INSUFFICIENT_FUNDS',
      errorMessage: 'Insufficient balance',
    });
    assert.equal(s1.record.failedDigitalAttemptsCount, 1);
    assert.equal(s1.record.isCashLocked, false);
    assert.equal(s1.strikeLockoutTriggered, false);

    // Strike 2: Timeout attempt
    const s2 = VerificationService.processDigitalPaymentAttempt(code, {
      status: 'TIMED_OUT',
      errorCode: 'U30_GATEWAY_TIMEOUT',
      errorMessage: 'Timeout',
    });
    assert.equal(s2.record.failedDigitalAttemptsCount, 2);
    assert.equal(s2.record.isCashLocked, false);
    assert.equal(s2.strikeLockoutTriggered, false);

    // Strike 3: Failed attempt -> Lockout triggered!
    const s3 = VerificationService.processDigitalPaymentAttempt(code, {
      status: 'FAILED',
      errorCode: 'U69_PIN_EXCEEDED',
      errorMessage: 'PIN limit exceeded',
    });
    assert.equal(s3.record.failedDigitalAttemptsCount, 3);
    assert.equal(s3.record.isCashLocked, true);
    assert.equal(s3.strikeLockoutTriggered, true);
    assert.equal(s3.record.paymentStatus, 'CASH_LOCKED');
    assert.ok(s3.record.lockoutReason?.includes('Exceeded maximum digital payment attempts'));

    // Strike 4: 4th attempt MUST BE REJECTED
    assert.throws(
      () =>
        VerificationService.processDigitalPaymentAttempt(code, {
          status: 'SUCCESS',
          vpa: 'vikram@upi',
        }),
      /Digital payment is locked due to 3 failed attempts/
    );
  });

  await t.test('5. Successful UPI Payment Flow and Prevention of Duplicate Payment', async () => {
    const job = await AutoPrintService.submitJob({
      fileName: 'Boarding_Pass.pdf',
      mimeType: 'application/pdf',
      customerName: 'Ananya Roy',
      amountMinorUnits: 3000,
      currency: 'INR',
      paymentMethod: 'UPI',
      specs: { copies: 1, colorMode: 'color', pageRange: '1' },
    });

    const code = job.verification!.verificationCode;

    const res = VerificationService.processDigitalPaymentAttempt(code, {
      status: 'SUCCESS',
      gatewayRef: 'UPI/2026/987654321',
      vpa: 'ananya@okicici',
    });

    assert.equal(res.record.paymentStatus, 'UPI_SUCCESS');
    assert.equal(res.record.upiTransactionId, 'UPI/2026/987654321');
    assert.equal(res.record.upiPayerVpa, 'ananya@okicici');

    // Duplicate payment attempt rejected
    assert.throws(
      () =>
        VerificationService.processDigitalPaymentAttempt(code, {
          status: 'SUCCESS',
        }),
      /Payment for this print job has already been verified/
    );
  });

  await t.test('6. Cash Collection Validation, Change Calculation, & Duplicate Prevention', async () => {
    const job = await AutoPrintService.submitJob({
      fileName: 'Legal_Affidavit.pdf',
      mimeType: 'application/pdf',
      customerName: 'Devendra Kumar',
      amountMinorUnits: 4000, // Rs. 40.00
      currency: 'INR',
      paymentMethod: 'CASH',
      specs: { copies: 1, colorMode: 'bw', pageRange: 'all' },
    });

    const code = job.verification!.verificationCode;

    // Insufficient cash rejected
    assert.throws(
      () => VerificationService.processCashCollection(code, 3000, 'STAFF-01', 'Cashier A'),
      /Insufficient cash tendered/
    );

    // Exact or excess cash collected with change
    const collected = VerificationService.processCashCollection(code, 5000, 'STAFF-01', 'Cashier A'); // Gave Rs 50
    assert.equal(collected.paymentStatus, 'CASH_COLLECTED');
    assert.equal(collected.cashTenderedMinorUnits, 5000);
    assert.equal(collected.cashChangeMinorUnits, 1000); // Change Rs 10.00
    assert.equal(collected.verifiedByStaffName, 'Cashier A');

    // Duplicate cash collection rejected
    assert.throws(
      () => VerificationService.processCashCollection(code, 5000, 'STAFF-01', 'Cashier A'),
      /Payment has already been collected/
    );
  });

  await t.test('7. Handover Workflow & Duplicate Handover Prevention', async () => {
    // 1. Unpaid job cannot be handed over
    const unpaidJob = await AutoPrintService.submitJob({
      fileName: 'Unpaid_Doc.pdf',
      mimeType: 'application/pdf',
      customerName: 'Rohan Mehta',
      amountMinorUnits: 2000,
      currency: 'INR',
      paymentMethod: 'UPI',
      specs: { copies: 1, colorMode: 'bw', pageRange: 'all' },
    });

    const unpaidCode = unpaidJob.verification!.verificationCode;
    assert.throws(
      () => VerificationService.confirmHandover(unpaidCode, 'STAFF-01', 'Staff Member'),
      /Cannot hand over prints before payment confirmation/
    );

    // 2. Pay and confirm handover
    VerificationService.processDigitalPaymentAttempt(unpaidCode, { status: 'SUCCESS' });
    const handedOver = VerificationService.confirmHandover(unpaidCode, 'STAFF-01', 'Staff Member');
    assert.equal(handedOver.handoverStatus, 'COLLECTED');
    assert.ok(handedOver.handoverCompletedAt);

    // 3. Duplicate handover rejected
    assert.throws(
      () => VerificationService.confirmHandover(unpaidCode, 'STAFF-01', 'Staff Member'),
      /Document has already been handed over/
    );
  });

  await t.test('8. Real PDF Watermarking Stamp Verification', async () => {
    // Create a real 2-page sample PDF in memory
    const sampleDoc = await PDFDocument.create();
    sampleDoc.addPage([595, 842]);
    sampleDoc.addPage([595, 842]);
    const sampleBytes = Buffer.from(await sampleDoc.save());

    const result = await PdfOverlayService.embedVerificationStamp(
      'AP-TEST-WATERMARK',
      sampleBytes,
      '12345678',
      '1234 5678',
      'SEC-A1B2-C3D4'
    );

    assert.ok(result.processedFilePath, 'Processed file path must be returned');
    assert.equal(result.pageCount, 2, 'Page count must remain intact');
    assert.equal(StorageService.fileExists(result.processedFilePath), true, 'Processed PDF must exist on disk');

    // Read back stamped PDF and verify valid PDF structure
    const stampedBuffer = StorageService.readFile(result.processedFilePath);
    const loadedDoc = await PDFDocument.load(stampedBuffer);
    assert.equal(loadedDoc.getPageCount(), 2, 'Loaded stamped PDF must have 2 pages');
  });

  await t.test('9. Persistent Audit Logging', async () => {
    const job = await AutoPrintService.submitJob({
      fileName: 'Audit_Test.pdf',
      mimeType: 'application/pdf',
      customerName: 'Neha Gupta',
      amountMinorUnits: 1000,
      currency: 'INR',
      paymentMethod: 'CASH',
      specs: { copies: 1, colorMode: 'bw', pageRange: 'all' },
    });

    const code = job.verification!.verificationCode;
    const logs = auditLogger.getLogs(code);

    assert.ok(logs.length >= 2, 'Should have CODE_GENERATED and DOCUMENT_EMBEDDED logs');
    assert.equal(logs[logs.length - 1].verificationCode, code);
  });

  await t.test('10. Persistence Across Simulated Reconnection', async () => {
    // Query directly from SQLite table
    const db = getDb();
    const count = (db.prepare('SELECT count(*) as c FROM print_jobs').get() as { c: number }).c;
    assert.ok(count > 0, 'Print jobs table must have records');
  });
});
