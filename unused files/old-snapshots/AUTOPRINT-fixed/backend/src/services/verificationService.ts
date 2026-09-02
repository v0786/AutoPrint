import { db } from '../database/db';
import { CONFIG } from '../config/environment';
import { generateSecureVerificationCode, computeSecurityChecksum } from '../utils/crypto';
import { auditLogger } from '../utils/auditLogger';
import {
  CollectionVerificationRecord,
  PaymentAttempt,
  PaymentGatewayStatus,
  PrintJobRequest,
} from '../types';
import { PdfOverlayService } from './pdfOverlayService';

export class VerificationService {
  /**
   * Creates a new verification record for a print job with an 8-digit verification code.
   */
  public static createVerificationRecord(
    jobId: string,
    jobNo: string,
    request: PrintJobRequest
  ): CollectionVerificationRecord {
    const { raw: verificationCode, formatted: formattedCode } = generateSecureVerificationCode();
    const securityChecksum = computeSecurityChecksum(verificationCode, jobId, request.amountTotal);

    const initialStatus: PaymentGatewayStatus =
      request.paymentMethod === 'CASH'
        ? 'CASH_REQUIRED'
        : 'PENDING';

    const record: CollectionVerificationRecord = {
      verificationCode,
      formattedCode,
      jobId,
      jobNo,
      jobTitle: request.fileName,
      printerName: request.printerName || 'Default AutoPrint Spooler',
      customerName: request.customerName || 'Walk-In Customer',
      customerPhone: request.customerPhone,
      amountTotal: request.amountTotal,
      currency: 'USD',
      failedDigitalAttemptsCount: 0,
      maxDigitalAttemptsAllowed: CONFIG.MAX_DIGITAL_ATTEMPTS,
      isCashLocked: false,
      paymentStatus: initialStatus,
      paymentAttempts: [],
      handoverStatus: 'PENDING_PRINT',
      securityChecksum,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.verificationRecords.set(verificationCode, record);

    // Audit Event: Code Generation
    auditLogger.logEvent({
      verificationCode,
      jobId,
      jobNo,
      action: 'CODE_GENERATED',
      actor: 'SYSTEM_AUTOPRINT',
      details: {
        amountTotal: record.amountTotal,
        customerName: record.customerName,
        paymentStatus: record.paymentStatus,
        securityChecksum,
      },
    });

    // Embed watermark on final page
    PdfOverlayService.embedVerificationCodeOnFinalPage(
      request.rawContentHtml || '',
      verificationCode,
      formattedCode,
      securityChecksum
    );

    // Audit Event: Document Watermark Embedded
    auditLogger.logEvent({
      verificationCode,
      jobId,
      jobNo,
      action: 'DOCUMENT_EMBEDDED',
      actor: 'SYSTEM_AUTOPRINT',
      details: {
        printerName: record.printerName,
        embeddedFooterFormat: 'OCR-A_WATERMARK_FINAL_PAGE',
      },
    });

    return record;
  }

  /**
   * Performs defensive code lookup by raw or formatted 8-digit verification code.
   */
  public static lookupByCode(inputCode: string, staffId = 'STAFF-DESK-01'): CollectionVerificationRecord {
    if (!inputCode) {
      throw new Error('Verification code is required.');
    }

    const sanitized = inputCode.replace(/[\s\-_]/g, '').trim();
    if (!/^\d{8}$/.test(sanitized)) {
      throw new Error('Invalid verification code format. Code must be exactly 8 digits.');
    }

    const record = db.verificationRecords.get(sanitized);
    if (!record) {
      throw new Error(`No print job found for verification code: ${sanitized}`);
    }

    auditLogger.logEvent({
      verificationCode: record.verificationCode,
      jobId: record.jobId,
      jobNo: record.jobNo,
      action: 'STAFF_LOOKUP_INITIATED',
      actor: 'STAFF_TERMINAL',
      staffId,
      details: {
        currentPaymentStatus: record.paymentStatus,
        isCashLocked: record.isCashLocked,
        handoverStatus: record.handoverStatus,
      },
    });

    return record;
  }

  /**
   * Records a digital payment attempt and enforces the fail-safe 3-strike lockout.
   */
  public static processDigitalPaymentAttempt(
    verificationCode: string,
    attemptInput: {
      status: 'SUCCESS' | 'FAILED' | 'TIMED_OUT';
      vpa?: string;
      gatewayRef?: string;
      errorCode?: string;
      errorMessage?: string;
    }
  ): { record: CollectionVerificationRecord; strikeLockoutTriggered: boolean } {
    const record = this.lookupByCode(verificationCode);

    if (record.isCashLocked) {
      throw new Error(
        'Digital payment is locked due to 3 failed attempts. Cash payment required at counter.'
      );
    }

    if (record.paymentStatus === 'UPI_SUCCESS' || record.paymentStatus === 'CASH_COLLECTED') {
      throw new Error('Payment for this print job has already been verified.');
    }

    const attemptNumber = record.paymentAttempts.length + 1;
    const attempt: PaymentAttempt = {
      attemptId: `att-${Date.now()}-${attemptNumber}`,
      attemptNumber,
      timestamp: new Date().toISOString(),
      method: 'UPI',
      amount: record.amountTotal,
      currency: record.currency,
      status: attemptInput.status,
      gatewayRef: attemptInput.gatewayRef,
      vpa: attemptInput.vpa,
      errorCode: attemptInput.errorCode,
      errorMessage: attemptInput.errorMessage,
    };

    record.paymentAttempts.push(attempt);
    record.updatedAt = new Date().toISOString();

    let strikeLockoutTriggered = false;

    if (attemptInput.status === 'SUCCESS') {
      record.paymentStatus = 'UPI_SUCCESS';
      record.upiTransactionId = attemptInput.gatewayRef || `UPI-${Date.now()}`;
      record.upiPayerVpa = attemptInput.vpa;
      record.failedDigitalAttemptsCount = 0;

      auditLogger.logEvent({
        verificationCode: record.verificationCode,
        jobId: record.jobId,
        jobNo: record.jobNo,
        action: 'UPI_PAYMENT_CONFIRMED',
        actor: 'PAYMENT_GATEWAY',
        details: {
          gatewayRef: record.upiTransactionId,
          vpa: record.upiPayerVpa,
          amount: record.amountTotal,
        },
      });
    } else {
      record.failedDigitalAttemptsCount += 1;
      record.paymentStatus = 'UPI_FAILED';

      auditLogger.logEvent({
        verificationCode: record.verificationCode,
        jobId: record.jobId,
        jobNo: record.jobNo,
        action: 'DIGITAL_PAYMENT_FAILED',
        actor: 'PAYMENT_GATEWAY',
        details: {
          attemptNumber,
          errorCode: attemptInput.errorCode,
          errorMessage: attemptInput.errorMessage,
          cumulativeFailures: record.failedDigitalAttemptsCount,
        },
      });

      // Fail-Safe 3-Strike Threshold Enforcement
      if (record.failedDigitalAttemptsCount >= CONFIG.MAX_DIGITAL_ATTEMPTS) {
        record.isCashLocked = true;
        record.paymentStatus = 'CASH_LOCKED';
        record.lockoutReason = `Exceeded maximum digital payment attempts (${CONFIG.MAX_DIGITAL_ATTEMPTS}/${CONFIG.MAX_DIGITAL_ATTEMPTS}). Digital gateway disabled. Mandatory cash collection at staff desk.`;
        strikeLockoutTriggered = true;

        auditLogger.logEvent({
          verificationCode: record.verificationCode,
          jobId: record.jobId,
          jobNo: record.jobNo,
          action: 'THREE_STRIKE_LOCKOUT_TRIGGERED',
          actor: 'SYSTEM_AUTOPRINT',
          details: {
            failedAttempts: record.failedDigitalAttemptsCount,
            lockoutReason: record.lockoutReason,
          },
        });
      }
    }

    db.verificationRecords.set(verificationCode, record);
    return { record, strikeLockoutTriggered };
  }

  /**
   * Staff Cash Collection Action
   */
  public static processCashCollection(
    verificationCode: string,
    tenderedAmount: number,
    staffId = 'STAFF-01',
    staffName = 'Duty Station Cashier'
  ): CollectionVerificationRecord {
    const record = this.lookupByCode(verificationCode);

    if (tenderedAmount < record.amountTotal) {
      throw new Error(
        `Insufficient cash tendered. Total due: $${record.amountTotal.toFixed(2)}, Received: $${tenderedAmount.toFixed(2)}`
      );
    }

    const changeDue = +(tenderedAmount - record.amountTotal).toFixed(2);

    record.cashTenderedAmount = tenderedAmount;
    record.cashChangeDue = changeDue;
    record.paymentStatus = 'CASH_COLLECTED';
    record.verifiedByStaffId = staffId;
    record.verifiedByStaffName = staffName;
    record.updatedAt = new Date().toISOString();

    const attempt: PaymentAttempt = {
      attemptId: `att-cash-${Date.now()}`,
      attemptNumber: record.paymentAttempts.length + 1,
      timestamp: new Date().toISOString(),
      method: 'CASH',
      amount: record.amountTotal,
      currency: record.currency,
      status: 'SUCCESS',
      errorMessage: `Cash received: $${tenderedAmount.toFixed(2)}, Change due: $${changeDue.toFixed(2)}`,
    };

    record.paymentAttempts.push(attempt);

    auditLogger.logEvent({
      verificationCode: record.verificationCode,
      jobId: record.jobId,
      jobNo: record.jobNo,
      action: 'CASH_COLLECTION_COMPLETED',
      actor: 'STAFF_TERMINAL',
      staffId,
      staffName,
      details: {
        amountTotal: record.amountTotal,
        tenderedAmount,
        changeDue,
      },
    });

    db.verificationRecords.set(verificationCode, record);
    return record;
  }

  /**
   * Confirms Handover of Document to Customer
   */
  public static confirmHandover(
    verificationCode: string,
    staffId = 'STAFF-01',
    staffName = 'Duty Station Cashier'
  ): CollectionVerificationRecord {
    const record = this.lookupByCode(verificationCode);

    const isPaid =
      record.paymentStatus === 'UPI_SUCCESS' || record.paymentStatus === 'CASH_COLLECTED';

    if (!isPaid) {
      throw new Error(
        'Cannot hand over prints before payment confirmation or cash collection.'
      );
    }

    record.handoverStatus = 'COLLECTED';
    record.handoverCompletedAt = new Date().toISOString();
    record.verifiedByStaffId = staffId;
    record.verifiedByStaffName = staffName;
    record.updatedAt = new Date().toISOString();

    auditLogger.logEvent({
      verificationCode: record.verificationCode,
      jobId: record.jobId,
      jobNo: record.jobNo,
      action: 'PRINTS_HANDED_OVER',
      actor: 'STAFF_TERMINAL',
      staffId,
      staffName,
      details: {
        paymentStatus: record.paymentStatus,
        handoverCompletedAt: record.handoverCompletedAt,
      },
    });

    db.verificationRecords.set(verificationCode, record);
    return record;
  }
}
