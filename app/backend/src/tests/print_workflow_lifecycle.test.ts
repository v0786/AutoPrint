/**
 * Print Workflow Lifecycle Automated Test Suite
 * Validates complete end-to-end payment-to-print separation,
 * cash confirmation, UPI verification, idempotent spooler claiming,
 * pickup verification, and double collection prevention.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { initDatabase } from '../database/db';
import { AutoPrintService } from '../services/autoprintService';
import { VerificationService } from '../services/verificationService';
import { jobRepository } from '../database/repositories/jobRepository';

// Ensure DB is initialized
initDatabase();

test('=== PRINT WORKFLOW LIFECYCLE TESTS ===', async (t) => {

  await t.test('1. Cash Flow: Job Creation -> Awaiting Confirmation -> Cash Confirmed -> Printed -> Collected', async () => {
    // 1. Submit cash job
    const job = await AutoPrintService.submitJob({
      fileName: 'Quarterly_Financials.pdf',
      mimeType: 'application/pdf',
      customerName: 'Kavita Rao',
      customerPhone: '+91 99887 76655',
      amountMinorUnits: 3500, // Rs. 35.00
      currency: 'INR',
      paymentMethod: 'CASH',
      specs: {
        copies: 1,
        colorMode: 'bw',
        paperSize: 'a4',
        duplex: 'single',
        pageRange: 'all',
        finishing: 'none',
      },
    });

    assert.equal(job.paymentMethod, 'CASH');
    assert.equal(job.paymentStatus, 'AWAITING_CASH_CONFIRMATION');
    assert.equal(job.status, 'AWAITING_CASH_CONFIRMATION');
    assert.equal(job.printStatus, 'AWAITING_PAYMENT');
    assert.ok(job.pickupCode, 'Pickup code must be generated');
    assert.equal(job.pickupCode.length, 8, 'Pickup code must be 8 digits');

    // Verify job is NOT printable before payment
    const claimBeforePay = jobRepository.claimForPrinting(job.id);
    assert.equal(claimBeforePay, false, 'Unpaid job must NEVER be claimed for printing');

    // 2. Merchant confirms cash received at the counter
    const afterCash = await AutoPrintService.confirmCashPayment(
      job.id,
      'STAFF-DESK-01',
      'Duty Cashier',
      4000 // Tendered Rs. 40.00
    );

    assert.equal(afterCash.paymentStatus, 'PAID');
    assert.ok(
      afterCash.status === 'READY_FOR_PICKUP' || afterCash.status === 'PRINTING',
      `Job status should be PRINTING or READY_FOR_PICKUP after cash confirmation, got ${afterCash.status}`
    );
    assert.ok(
      afterCash.printStatus === 'PRINTED' || afterCash.printStatus === 'PRINTING',
      `Print status should be PRINTED or PRINTING, got ${afterCash.printStatus}`
    );

    // Verify verification record was updated to CASH_COLLECTED
    const ver = VerificationService.lookupByCode(job.pickupCode);
    assert.equal(ver.paymentStatus, 'CASH_COLLECTED');
    assert.equal(ver.cashTenderedMinorUnits, 4000);
    assert.equal(ver.cashChangeMinorUnits, 500);

    // 3. Customer arrives at counter with pickup code: Staff verifies & hands over
    const handover = VerificationService.confirmHandover(job.pickupCode, 'STAFF-DESK-01', 'Duty Cashier');
    assert.equal(handover.handoverStatus, 'COLLECTED');

    // Verify database status is COLLECTED
    const finalJob = AutoPrintService.getJobById(job.id);
    assert.equal(finalJob?.status, 'COLLECTED');

    // 4. Double handover prevention: Attempting to handover again must throw 409
    assert.throws(
      () => VerificationService.confirmHandover(job.pickupCode!, 'STAFF-DESK-01', 'Duty Cashier'),
      (err: any) => err.statusCode === 409 || err.message.includes('already been handed over')
    );
  });

  await t.test('2. UPI Digital Flow: Payment Pending -> Digital Verification -> Printing -> Pickup Handover', async () => {
    // 1. Customer submits UPI job
    const job = await AutoPrintService.submitJob({
      fileName: 'Project_Proposal_Draft.pdf',
      mimeType: 'application/pdf',
      customerName: 'Dev Sharma',
      amountMinorUnits: 2000, // Rs. 20.00
      currency: 'INR',
      paymentMethod: 'UPI',
      specs: {
        copies: 1,
        colorMode: 'color',
        paperSize: 'a4',
        duplex: 'single',
        pageRange: 'all',
        finishing: 'none',
      },
    });

    assert.equal(job.paymentMethod, 'UPI');
    assert.equal(job.paymentStatus, 'PAYMENT_PENDING');
    assert.equal(job.status, 'PAYMENT_PENDING');
    assert.equal(job.printStatus, 'AWAITING_PAYMENT');

    // Unpaid UPI job cannot be claimed
    assert.equal(jobRepository.claimForPrinting(job.id), false);

    // 2. Gateway verifies digital payment
    const upiTxnId = `UPI-TXN-${Date.now()}`;
    const afterPay = await AutoPrintService.confirmDigitalPayment(job.id, upiTxnId, 'customer@okaxis');

    assert.equal(afterPay.paymentStatus, 'PAID');
    assert.ok(
      afterPay.status === 'READY_FOR_PICKUP' || afterPay.status === 'PRINTING',
      `Job should be ready or printing, got ${afterPay.status}`
    );

    // 3. Handover prints
    const handover = VerificationService.confirmHandover(job.pickupCode!, 'STAFF-DESK-01', 'Staff Desk');
    assert.equal(handover.handoverStatus, 'COLLECTED');

    const freshJob = AutoPrintService.getJobById(job.id);
    assert.equal(freshJob?.status, 'COLLECTED');
  });

  await t.test('3. Print Idempotency: Zero Double Printing Guarantee', async () => {
    const job = await AutoPrintService.submitJob({
      fileName: 'Important_Cert.pdf',
      mimeType: 'application/pdf',
      customerName: 'Sanjay Gupta',
      amountMinorUnits: 5000,
      currency: 'INR',
      paymentMethod: 'UPI',
      specs: { copies: 1, colorMode: 'bw', pageRange: 'all' },
    });

    // Mark paid
    jobRepository.markPaid(job.id, 'TXN-999');

    // First claim must succeed
    const firstClaim = jobRepository.claimForPrinting(job.id);
    assert.equal(firstClaim, true, 'First print claim must succeed');

    // Immediate second claim (e.g. concurrent thread or browser refresh) must fail
    const secondClaim = jobRepository.claimForPrinting(job.id);
    assert.equal(secondClaim, false, 'Concurrent print claim must fail to prevent double printing');

    // Once marked printed, claim must still fail
    jobRepository.markPrinted(job.id);
    const thirdClaim = jobRepository.claimForPrinting(job.id);
    assert.equal(thirdClaim, false, 'Already printed job cannot be claimed again');
  });

  await t.test('4. Lookup by Pickup Code Resolves Authentic Persistent Job', async () => {
    const job = await AutoPrintService.submitJob({
      fileName: 'Thesis_Final.pdf',
      mimeType: 'application/pdf',
      customerName: 'Ananya Roy',
      amountMinorUnits: 15000,
      currency: 'INR',
      paymentMethod: 'CASH',
      specs: { copies: 3, colorMode: 'color', pageRange: 'all' },
    });

    const code = job.pickupCode!;
    assert.ok(code && code.length === 8);

    const lookupResult = VerificationService.lookupByCode(code);
    assert.equal(lookupResult.jobId, job.id);
    assert.equal(lookupResult.customerName, 'Ananya Roy');
    assert.equal(lookupResult.amountMinorUnits, 15000);

    const dbRow = jobRepository.getByPickupCode(code);
    assert.ok(dbRow);
    assert.equal(dbRow?.id, job.id);
  });
});
