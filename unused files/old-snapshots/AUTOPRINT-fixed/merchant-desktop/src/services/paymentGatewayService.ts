/**
 * Payment Gateway Service for AutoPrint Print Management System
 * 
 * Simulates UPI Intent, Dynamic QR generation, bank callback webhooks,
 * failure diagnostics, and triggers automated 3-strike failure handling.
 */

import { verificationService } from './verificationService';
import { CollectionVerificationRecord, PaymentAttempt } from '../types/verification';

export interface UpiIntentSession {
  sessionId: string;
  verificationCode: string;
  amount: number;
  currency: string;
  payeeVpa: string;
  payeeName: string;
  merchantRef: string;
  qrPayload: string;
  expiresAt: string;
  activeAttemptCount: number;
}

export interface UpiSimulationResult {
  success: boolean;
  attempt: PaymentAttempt;
  updatedRecord: CollectionVerificationRecord;
  strikeLockoutTriggered: boolean;
}

export type UpiFailureReason =
  | 'U16_INSUFFICIENT_FUNDS'
  | 'U30_GATEWAY_TIMEOUT'
  | 'U69_PIN_EXCEEDED'
  | 'U88_BANK_SERVER_DOWN'
  | 'U90_USER_CANCELLED';

const FAILURE_MESSAGES: Record<UpiFailureReason, string> = {
  U16_INSUFFICIENT_FUNDS: 'Declined by customer bank: Insufficient funds in account',
  U30_GATEWAY_TIMEOUT: 'UPI Switch Timeout: Beneficiary bank did not respond within 30 seconds',
  U69_PIN_EXCEEDED: 'Authentication Failed: Invalid UPI MPIN entered repeatedly',
  U88_BANK_SERVER_DOWN: 'NPCI Central Switch Error: Customer bank core server is temporarily down',
  U90_USER_CANCELLED: 'Transaction Aborted: User dismissed UPI authorization prompt on mobile',
};

class UpiPaymentGatewayService {
  private payeeVpa = 'autoprint.station01@icici';
  private payeeName = 'AutoPrint Automated Print Station';

  /**
   * Initializes a new UPI Payment Intent session for a print job's 8-digit verification code.
   */
  public initializeUpiIntent(
    verificationCode: string,
    amount: number,
    currency = 'USD'
  ): UpiIntentSession {
    const record = verificationService.lookupByCode(verificationCode);
    if (!record) {
      throw new Error(`Cannot initialize UPI session: verification code ${verificationCode} not found.`);
    }

    if (record.isCashLocked) {
      throw new Error('Digital payment disabled: Print job is locked in Cash Collection Mode.');
    }

    const sessionId = `upi-sess-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const merchantRef = `AP-${record.jobNo.replace('#', '')}-${verificationCode.slice(0, 4)}`;
    
    // Canonical UPI Deep Link URL specification
    const qrPayload = `upi://pay?pa=${encodeURIComponent(this.payeeVpa)}&pn=${encodeURIComponent(
      this.payeeName
    )}&tr=${merchantRef}&am=${amount.toFixed(2)}&cu=${currency}&tn=AutoPrint+Verification+${verificationCode}`;

    const expiresAt = new Date(Date.now() + 1000 * 60 * 5).toISOString(); // 5 min expiry

    return {
      sessionId,
      verificationCode,
      amount,
      currency,
      payeeVpa: this.payeeVpa,
      payeeName: this.payeeName,
      merchantRef,
      qrPayload,
      expiresAt,
      activeAttemptCount: record.failedDigitalAttemptsCount,
    };
  }

  /**
   * Simulates a successful UPI authorization response from customer banking app.
   */
  public async simulateSuccessfulUpiPayment(
    verificationCode: string,
    customerVpa = 'customer.print@okaxis'
  ): Promise<UpiSimulationResult> {
    const record = verificationService.lookupByCode(verificationCode);
    if (!record) {
      throw new Error(`Verification code not found: ${verificationCode}`);
    }

    if (record.isCashLocked) {
      throw new Error('Digital payment is locked due to previous consecutive failures.');
    }

    const gatewayRef = `UPI/${new Date().getFullYear()}/${Math.floor(100000000 + Math.random() * 900000000)}`;

    const { record: updatedRecord, strikeLockoutTriggered } =
      verificationService.recordDigitalPaymentAttempt(verificationCode, {
        method: 'UPI',
        amount: record.amountTotal,
        currency: record.currency,
        status: 'SUCCESS',
        gatewayRef,
        vpa: customerVpa,
      });

    return {
      success: true,
      attempt: updatedRecord.paymentAttempts[updatedRecord.paymentAttempts.length - 1],
      updatedRecord,
      strikeLockoutTriggered,
    };
  }

  /**
   * Simulates a failed UPI authorization response to test fail-safe retry limits and the 3-strike lockout.
   */
  public async simulateFailedUpiPayment(
    verificationCode: string,
    failureReason: UpiFailureReason = 'U16_INSUFFICIENT_FUNDS'
  ): Promise<UpiSimulationResult> {
    const record = verificationService.lookupByCode(verificationCode);
    if (!record) {
      throw new Error(`Verification code not found: ${verificationCode}`);
    }

    const errorMessage = FAILURE_MESSAGES[failureReason] || 'UPI Payment Failed';
    const status = failureReason === 'U30_GATEWAY_TIMEOUT' ? 'TIMED_OUT' : 'FAILED';

    const { record: updatedRecord, strikeLockoutTriggered } =
      verificationService.recordDigitalPaymentAttempt(verificationCode, {
        method: 'UPI',
        amount: record.amountTotal,
        currency: record.currency,
        status,
        errorCode: failureReason,
        errorMessage,
      });

    return {
      success: false,
      attempt: updatedRecord.paymentAttempts[updatedRecord.paymentAttempts.length - 1],
      updatedRecord,
      strikeLockoutTriggered,
    };
  }
}

export const paymentGatewayService = new UpiPaymentGatewayService();
