# AutoPrint — Payment Gateway Abstraction

**Document ID**: 04-26  
**Category**: Integration  

---

## 1. Multi-Provider Architecture

AutoPrint decouples payment collection from business logic using a pluggable payment provider interface:

```typescript
export interface PaymentIntent {
  jobId: string;
  amount: number;
  currency: string;
  customerName: string;
}

export interface IPaymentProvider {
  createPaymentIntent(intent: PaymentIntent): Promise<PaymentResponse>;
  verifyPayment(paymentRef: string, signature?: string): Promise<boolean>;
  getProviderName(): string;
}
```

---

## 2. Supported Payment Providers

### 2.1 Direct UPI QR (Zero-Fee Indian Domestic Standard)
* Generates standard dynamic UPI payment links (`upi://pay?pa=<MerchantVPA>&pn=<ShopName>&am=<Amount>&tr=<JobId>&tn=AutoPrint%20Job`).
* Embedded into a dynamic QR code on the customer's payment screen.
* Can be verified instantly via merchant reconciliation or manual cash confirmation.

### 2.2 Razorpay & Juspay Integration
* Supports automated webhook verification for high-volume automated university kiosks.
* Uses HMAC-SHA256 signature verification to prevent spoofed callbacks.

### 2.3 Counter Cash Payment
* **Zero Technical Risk**: Requires zero internet connection.
* Locks the job in `CASH_HELD` until the merchant presses "CASH COLLECTED" on the physical terminal.
