import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { ensureDataDirectories } from '../config/environment';
import { initDatabase } from '../database/db';
import { AutoPrintService } from '../services/autoprintService';
import { FeedbackService } from '../services/feedbackService';
import { SupportService } from '../services/supportService';
import { RefundService } from '../services/refundService';
import { LogRedactor } from '../utils/logRedactor';
import { verificationRepository } from '../database/repositories/verificationRepository';

ensureDataDirectories();
initDatabase();

describe('=== AUTOPRINT RELIABILITY, SUPPORT, FEEDBACK & REFUND SUITE ===', () => {
  let testJobId = '';
  let testVerificationCode = '';

  test('1. Customer Name Identification & Job Ingress', async () => {
    const job = await AutoPrintService.submitJob({
      fileName: 'Project_Report_Final.pdf',
      mimeType: 'application/pdf',
      customerName: 'Rahul Patil',
      amountMinorUnits: 2500,
      currency: 'INR',
      paymentMethod: 'UPI',
      specs: {
        colorMode: 'bw',
        copies: 1,
        pageRange: 'all',
        paperSize: 'a4',
        duplex: 'single',
        finishing: 'none',
      },
    });

    assert.ok(job.id);
    assert.equal(job.customerName, 'Rahul Patil');
    assert.equal(job.amountTotal, 25.0);
    assert.ok(job.verification?.verificationCode);

    testJobId = job.id;
    testVerificationCode = job.verification.verificationCode;

    const history = AutoPrintService.getStatusHistory(testJobId);
    assert.ok(history.length >= 1);
  });

  test('2. Payment Reconciliation: Flagging PAYMENT_REVIEW_REQUIRED', () => {
    const flagged = AutoPrintService.flagPaymentReviewRequired(
      testJobId,
      'PAY_TEST_9988',
      'Orphaned payment gateway confirmation received without prior session link.',
      'PAYMENT_GATEWAY'
    );

    assert.ok(flagged);
    assert.equal(flagged.status, 'PAYMENT_REVIEW_REQUIRED');

    const history = AutoPrintService.getStatusHistory(testJobId);
    const last = history[history.length - 1];
    assert.equal(last.new_status, 'PAYMENT_REVIEW_REQUIRED');
    assert.equal(last.payment_id, 'PAY_TEST_9988');
  });

  test('3. Feedback Gate: Blocked when Handover is PENDING_PRINT', () => {
    assert.throws(
      () => {
        FeedbackService.submitFeedback({
          verificationCode: testVerificationCode,
          ratingOverall: 5,
          ratingQuality: 5,
          ratingService: 5,
          ratingEase: 5,
          category: 'POSITIVE',
          comment: 'Great service',
        });
      },
      /Feedback is available only after/
    );
  });

  test('4. Feedback Gate: Allowed once COLLECTED and Duplicate Prevention', () => {
    // Mark as collected
    verificationRepository.updateHandover({
      code: testVerificationCode,
      staffId: 'STAFF-01',
      staffName: 'Admin Desk',
      handoverAt: new Date().toISOString(),
    });

    // Now submit feedback
    const feedback = FeedbackService.submitFeedback({
      verificationCode: testVerificationCode,
      ratingOverall: 5,
      ratingQuality: 4,
      ratingService: 5,
      ratingEase: 5,
      category: 'POSITIVE',
      comment: 'Very fast printing and clear text!',
      improvementSuggestion: 'Add more finishing options.',
    });

    assert.ok(feedback.id);
    assert.equal(feedback.rating_overall, 5);
    assert.equal(feedback.category, 'POSITIVE');

    // Duplicate submission must be rejected
    assert.throws(
      () => {
        FeedbackService.submitFeedback({
          verificationCode: testVerificationCode,
          ratingOverall: 4,
          ratingQuality: 4,
          ratingService: 4,
          ratingEase: 4,
        });
      },
      /Feedback has already been submitted/
    );

    const analytics = FeedbackService.getAnalytics();
    assert.ok(analytics.totalFeedbackCount >= 1);
    assert.ok(analytics.recentSuggestions.length >= 1);
  });

  test('5. Customer Support Ticket Creation & ID Format', () => {
    const ticket = SupportService.createCustomerTicket({
      customerName: 'Rahul Patil',
      customerEmail: 'rahul.patil@example.com',
      verificationCode: testVerificationCode,
      category: 'PAYMENT_ISSUE',
      priority: 'HIGH',
      description: 'Amount deducted from UPI app but receipt showed pending status initially.',
    });

    assert.ok(ticket.id.startsWith('TKT-'));
    assert.match(ticket.ticket_no, /^APT-\d{8}-[A-F0-9]{6}$/);
    assert.equal(ticket.source, 'CUSTOMER');
    assert.equal(ticket.status, 'OPEN');

    const history = SupportService.getTicketHistory(ticket.id);
    assert.ok(history.length >= 1);
  });

  test('6. Merchant Support Ticket & Redacted Diagnostics', async () => {
    const merchantTicket = await SupportService.createMerchantTicket({
      merchantId: 'SHOP-PUNE-01',
      category: 'PRINTER_CONNECTIVITY',
      priority: 'HIGH',
      description: 'POS thermal receipt printer USB port disconnected after Windows update.',
      stepsTried: 'Replugged USB cable and restarted print spooler service.',
      includeDiagnostics: true,
    });

    assert.ok(merchantTicket.id);
    assert.equal(merchantTicket.source, 'MERCHANT');
    assert.ok(merchantTicket.diagnostics_json);

    const parsedDiag = JSON.parse(merchantTicket.diagnostics_json);
    assert.ok(parsedDiag.application.version);
    assert.ok(parsedDiag.database.engine);
  });

  test('7. Secret & Credential Redaction Engine', () => {
    const rawLog = 'User login with token: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 and secret: super_secret_123456 and --endpoint-token=service_secret_abcdef999';
    const redacted = LogRedactor.redactText(rawLog);

    assert.ok(!redacted.includes('super_secret_123456'));
    assert.ok(!redacted.includes('pk_secret_abcdef999'));
    assert.ok(redacted.includes('[REDACTED_TOKEN]'));
    assert.ok(redacted.includes('[REDACTED_SERVICE_SECRET]'));

    const obj = {
      password: 'merchant_pass_123',
      apiKey: 'live_key_998877',
      safeField: 'AutoPrint Desk',
    };
    const cleaned = LogRedactor.redactObject(obj);
    assert.equal(cleaned.password, '[REDACTED_FIELD]');
    assert.equal(cleaned.apiKey, '[REDACTED_FIELD]');
    assert.equal(cleaned.safeField, 'AutoPrint Desk');
  });

  test('8. Refund Request Lifecycle & Mandatory Explanation Validation', () => {
    // Short explanation must fail
    assert.throws(
      () => {
        RefundService.createRefundRequest({
          jobId: testJobId,
          reason: 'PRINT_DEFECT',
          detailedExplanation: 'Short text',
        });
      },
      /at least 15 characters/
    );

    const refund = RefundService.createRefundRequest({
      jobId: testJobId,
      reason: 'PRINTER_JAM_DEFECT',
      detailedExplanation: 'Printer jammed on page 4 during duplex run. Reprint was declined by customer.',
      staffName: 'Desk Staff #1',
    });

    assert.ok(refund.id.startsWith('REF-'));
    assert.equal(refund.status, 'REFUND_REQUESTED');

    const updated = RefundService.updateRefundStatus({
      id: refund.id,
      status: 'REFUNDED',
      staffName: 'Store Manager',
      reviewNotes: 'Verified jam log and approved cash refund.',
      gatewayRefundId: 'CASH-REF-001',
    });

    assert.equal(updated.status, 'REFUNDED');
  });
});
