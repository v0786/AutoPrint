/**
 * UPI Intent & Dynamic Payment Connector
 * Generates NPCI-compliant UPI deep link payloads and handles payment session parameters.
 */

export interface UpiSessionConfig {
  payeeVpa: string;
  payeeName: string;
  amount: number;
  currency?: string;
  verificationCode: string;
  merchantRef: string;
}

export interface UpiIntentResult {
  qrPayload: string;
  deepLinkUrl: string;
  payeeVpa: string;
  amount: number;
  currency: string;
  expiresAt: string;
}

export class UpiIntentConnector {
  /**
   * Generates standard UPI 2.0 intent deep link URI.
   * Spec: upi://pay?pa=...&pn=...&tr=...&am=...&cu=INR&tn=...
   */
  public static generateIntent(config: UpiSessionConfig): UpiIntentResult {
    const currency = config.currency || 'INR';
    const amountStr = config.amount.toFixed(2);
    const note = `AutoPrint Verification ${config.verificationCode}`;

    const params = new URLSearchParams({
      pa: config.payeeVpa,
      pn: config.payeeName,
      tr: config.merchantRef,
      am: amountStr,
      cu: currency,
      tn: note,
    });

    const qrPayload = `upi://pay?${params.toString()}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    return {
      qrPayload,
      deepLinkUrl: qrPayload,
      payeeVpa: config.payeeVpa,
      amount: config.amount,
      currency,
      expiresAt,
    };
  }
}
