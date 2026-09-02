import { buildVerificationCode, normalizePhone, verifyOrderCode, type PaymentMethod } from '../../../shared/src';

export interface PaymentEvent {
  orderId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: 'pending' | 'verified' | 'failed';
  verificationCode: string;
  customerPhone: string;
  createdAt: string;
}

export const createPaymentEvent = (orderId: string, amount: number, paymentMethod: PaymentMethod, customerPhone: string): PaymentEvent => ({
  orderId,
  amount,
  paymentMethod,
  status: paymentMethod === 'upi' ? 'verified' : 'pending',
  verificationCode: buildVerificationCode(),
  customerPhone: normalizePhone(customerPhone),
  createdAt: new Date().toISOString(),
});

export const verifyCashPayment = (code: string) => {
  if (!verifyOrderCode(code)) {
    return { ok: false, reason: 'Invalid verification code' };
  }

  return { ok: true, reason: 'Cash payment verified' };
};

export const verifyUpiPayment = (providerSignature?: string) => {
  if (!providerSignature || providerSignature.length < 12) {
    return { ok: false, reason: 'UPI verification signature missing' };
  }

  return { ok: true, reason: 'Razorpay payment confirmed' };
};

export const summarizePaymentState = (events: PaymentEvent[]) => ({
  pending: events.filter(event => event.status === 'pending').length,
  verified: events.filter(event => event.status === 'verified').length,
  failed: events.filter(event => event.status === 'failed').length,
});
