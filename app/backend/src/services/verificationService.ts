import { CONFIG } from '../config/environment';
import {
  generateSecureVerificationCode,
  computeHmacChecksum,
  generateAttemptId,
} from '../utils/crypto';
import { auditLogger } from '../utils/auditLogger';
import { verificationRepository } from '../database/repositories/verificationRepository';
import {
  CollectionVerificationRecord,
  PaymentGatewayStatus,
  PrintJobRequest,
  AppError,
} from '../types';

export class VerificationService {
  /**
   * Creates a new persistent verification record for a print job.
   * Generates a unique 8-digit verification code with collision retry.
   */
  public static createVerificationRecord(
    jobId: string,
    jobNo: string,
    request: PrintJobRequest
  ): CollectionVerificationRecord {
    // Generate unique 8-digit verification code with DB collision retry
    let codeData = generateSecureVerificationCode();
    let retries = 0;
    while (verificationRepository.codeExists(codeData.raw) && retries < 10) {
      codeData = generateSecureVerificationCode();
      retries++;
    }

    if (verificationRepository.codeExists(codeData.raw)) {
      throw new AppError('Unable to allocate unique verification code. Please retry.', 500);
    }

    const { raw: verificationCode, formatted: formattedCode } = codeData;
    const currency = request.currency || CONFIG.CURRENCY;
    const amountMinorUnits = request.amountMinorUnits;

    const securityChecksum = computeHmacChecksum(verificationCode, jobId, amountMinorUnits);

    const initialStatus: PaymentGatewayStatus =
      request.paymentMethod === 'CASH' ? 'CASH_REQUIRED' : 'PENDING';

    const record = verificationRepository.create({
      verificationCode,
      formattedCode,
      jobId,
      jobNo,
      jobTitle: request.fileName,
      printerName: request.printerName || 'AutoPrint Spooler',
      customerName: request.customerName || 'Walk-In Customer',
      customerPhone: request.customerPhone,
      amountMinorUnits,
      currency,
      maxDigitalAttempts: CONFIG.MAX_DIGITAL_ATTEMPTS,
      initialPaymentStatus: initialStatus,
      securityChecksum,
    });

    auditLogger.logEvent({
      verificationCode,
      jobId,
      jobNo,
      action: 'CODE_GENERATED',
      actor: 'SYSTEM_AUTOPRINT',
      details: {
        amountMinorUnits,
        currency,
        customerName: record.customerName,
        paymentStatus: record.paymentStatus,
        securityChecksum,
      },
    });

    return record;
  }

  /**
   * Defensive code lookup by raw or formatted 8-digit verification code.
   */
  public static lookupByCode(inputCode: string, staffId = 'STAFF-DESK-01'): CollectionVerificationRecord {
    if (!inputCode) {
      throw new AppError('Verification code is required.', 400);
    }

    const sanitized = inputCode.replace(/[\s\-_]/g, '').trim();
    if (!/^\d{8}$/.test(sanitized)) {
      throw new AppError('Invalid verification code format. Code must be exactly 8 digits.', 400);
    }

    const record = verificationRepository.getByCode(sanitized);
    if (!record) {
      throw new AppError(`No print job found for verification code: ${sanitized}`, 404);
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
      throw new AppError(
        'Digital payment is locked due to 3 failed attempts. Cash payment is required at the counter.',
        403
      );
    }

    if (record.paymentStatus === 'UPI_SUCCESS' || record.paymentStatus === 'CASH_COLLECTED') {
      throw new AppError('Payment for this print job has already been verified and completed.', 409);
    }

    if (record.failedDigitalAttemptsCount >= record.maxDigitalAttemptsAllowed) {
      throw new AppError(
        'Maximum digital payment attempts exceeded. Digital gateway disabled. Cash collection required.',
        403
      );
    }

    const attemptNumber = record.paymentAttempts.length + 1;
    const attemptId = generateAttemptId();
    const timestamp = new Date().toISOString();

    // Persist attempt record
    verificationRepository.addPaymentAttempt({
      attemptId,
      verificationCode: record.verificationCode,
      attemptNumber,
      timestamp,
      method: 'UPI',
      amountMinorUnits: record.amountMinorUnits,
      currency: record.currency,
      status: attemptInput.status,
      gatewayRef: attemptInput.gatewayRef,
      vpa: attemptInput.vpa,
      errorCode: attemptInput.errorCode,
      errorMessage: attemptInput.errorMessage,
    });

    let strikeLockoutTriggered = false;

    if (attemptInput.status === 'SUCCESS') {
      const upiTxnId = attemptInput.gatewayRef || `UPI-${Date.now()}`;
      verificationRepository.updatePaymentSuccess({
        code: record.verificationCode,
        upiTransactionId: upiTxnId,
        upiPayerVpa: attemptInput.vpa,
      });

      auditLogger.logEvent({
        verificationCode: record.verificationCode,
        jobId: record.jobId,
        jobNo: record.jobNo,
        action: 'UPI_PAYMENT_CONFIRMED',
        actor: 'PAYMENT_GATEWAY',
        details: {
          gatewayRef: upiTxnId,
          vpa: attemptInput.vpa,
          amountMinorUnits: record.amountMinorUnits,
        },
      });
    } else {
      const newCount = record.failedDigitalAttemptsCount + 1;
      let newStatus: PaymentGatewayStatus = 'UPI_FAILED';
      let lockoutReason: string | undefined;
      let isCashLocked = false;

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
          cumulativeFailures: newCount,
        },
      });

      // Fail-Safe 3-Strike Threshold Enforcement
      if (newCount >= record.maxDigitalAttemptsAllowed) {
        isCashLocked = true;
        newStatus = 'CASH_LOCKED';
        lockoutReason = `Exceeded maximum digital payment attempts (${newCount}/${record.maxDigitalAttemptsAllowed}). Digital gateway disabled. Mandatory cash collection at staff desk.`;
        strikeLockoutTriggered = true;

        auditLogger.logEvent({
          verificationCode: record.verificationCode,
          jobId: record.jobId,
          jobNo: record.jobNo,
          action: 'THREE_STRIKE_LOCKOUT_TRIGGERED',
          actor: 'SYSTEM_AUTOPRINT',
          details: {
            failedAttempts: newCount,
            lockoutReason,
          },
        });
      }

      verificationRepository.updatePaymentFailed({
        code: record.verificationCode,
        newCount,
        newStatus,
        lockoutReason,
        isCashLocked,
      });
    }

    const updated = verificationRepository.getByCode(record.verificationCode)!;
    return { record: updated, strikeLockoutTriggered };
  }

  /**
   * Staff Cash Collection Action with integer minor-unit financial validation.
   */
  public static processCashCollection(
    verificationCode: string,
    tenderedMinorUnits: number,
    staffId = 'STAFF-01',
    staffName = 'Duty Station Cashier'
  ): CollectionVerificationRecord {
    const record = this.lookupByCode(verificationCode);

    if (record.paymentStatus === 'CASH_COLLECTED' || record.paymentStatus === 'UPI_SUCCESS') {
      throw new AppError('Payment has already been collected for this print job.', 409);
    }

    if (!Number.isFinite(tenderedMinorUnits) || tenderedMinorUnits <= 0) {
      throw new AppError('Invalid cash tendered amount. Amount must be a positive integer.', 400);
    }

    if (tenderedMinorUnits < record.amountMinorUnits) {
      const dueDecimal = (record.amountMinorUnits / 100).toFixed(2);
      const recDecimal = (tenderedMinorUnits / 100).toFixed(2);
      throw new AppError(
        `Insufficient cash tendered. Total due: ${record.currency} ${dueDecimal}, Received: ${record.currency} ${recDecimal}`,
        400
      );
    }

    const changeMinorUnits = tenderedMinorUnits - record.amountMinorUnits;

    verificationRepository.updateCashCollected({
      code: record.verificationCode,
      tenderedMinorUnits,
      changeMinorUnits,
      staffId,
      staffName,
    });

    // Record cash payment attempt
    const attemptId = generateAttemptId();
    verificationRepository.addPaymentAttempt({
      attemptId,
      verificationCode: record.verificationCode,
      attemptNumber: record.paymentAttempts.length + 1,
      timestamp: new Date().toISOString(),
      method: 'CASH',
      amountMinorUnits: record.amountMinorUnits,
      currency: record.currency,
      status: 'SUCCESS',
      errorMessage: `Cash received: ${(tenderedMinorUnits / 100).toFixed(2)}, Change due: ${(changeMinorUnits / 100).toFixed(2)}`,
    });

    auditLogger.logEvent({
      verificationCode: record.verificationCode,
      jobId: record.jobId,
      jobNo: record.jobNo,
      action: 'CASH_COLLECTION_COMPLETED',
      actor: 'STAFF_TERMINAL',
      staffId,
      staffName,
      details: {
        amountMinorUnits: record.amountMinorUnits,
        tenderedMinorUnits,
        changeMinorUnits,
        currency: record.currency,
      },
    });

    return verificationRepository.getByCode(record.verificationCode)!;
  }

  /**
   * Confirms Handover of Document to Customer.
   * Only allowed when payment is confirmed and document is not already handed over.
   */
  public static confirmHandover(
    verificationCode: string,
    staffId = 'STAFF-01',
    staffName = 'Duty Station Cashier'
  ): CollectionVerificationRecord {
    const record = this.lookupByCode(verificationCode);

    if (record.handoverStatus === 'COLLECTED') {
      throw new AppError('Document has already been handed over to the customer.', 409);
    }

    const isPaid =
      record.paymentStatus === 'UPI_SUCCESS' || record.paymentStatus === 'CASH_COLLECTED';

    if (!isPaid) {
      throw new AppError(
        'Cannot hand over prints before payment confirmation or cash collection.',
        400
      );
    }

    const handoverAt = new Date().toISOString();
    verificationRepository.updateHandover({
      code: record.verificationCode,
      staffId,
      staffName,
      handoverAt,
    });

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
        handoverCompletedAt: handoverAt,
      },
    });

    return verificationRepository.getByCode(record.verificationCode)!;
  }
}
