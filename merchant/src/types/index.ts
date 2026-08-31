export type PaymentMethod = 'cash' | 'upi';
export type PrintStatus = 'queued' | 'printing' | 'verified' | 'completed';

export interface StoreProfile {
  storeName: string;
  ownerName: string;
  mobileNumber: string;
  emailId: string;
  printerSelection: string;
}

export interface OrderRecord {
  id: string;
  customerName: string;
  pages: string;
  status: PrintStatus;
  paymentMethod: PaymentMethod;
  verificationCode: string;
}
