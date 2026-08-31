export type PaymentMethod = 'cash' | 'upi';
export type ColorMode = 'bw' | 'color';
export type PrintStatus = 'queued' | 'printing' | 'verified' | 'completed' | 'failed';
export type PrinterType = 'usb' | 'network' | 'bluetooth';

export interface StoreProfile {
  id: string;
  storeName: string;
  ownerName: string;
  mobileNumber: string;
  emailId: string;
  printerId?: string;
  isConfigured: boolean;
}

export interface PrinterDevice {
  id: string;
  name: string;
  type: PrinterType;
  status: 'online' | 'offline' | 'busy';
}

export interface PrintJobRequest {
  storeId: string;
  fileName: string;
  mimeType: string;
  colorMode: ColorMode;
  copies: number;
  pageRange: string;
  paymentMethod: PaymentMethod;
  customerName?: string;
}

export interface PrintJobStatus {
  id: string;
  verificationCode: string;
  status: PrintStatus;
  paymentMethod: PaymentMethod;
  fileName: string;
  pageRange: string;
}

export interface SetupSubmitData {
  storeName: string;
  ownerName: string;
  mobileNumber: string;
  emailId: string;
  printerId: string;
}

export const verifyOrderCode = (value: string) => /^[0-9]{8}$/.test(value);

export const buildVerificationCode = () =>
  `${Math.floor(10000000 + Math.random() * 90000000)}`;

export const buildOrderId = (prefix = 'QRT') =>
  `${prefix}-${Math.floor(1000 + Math.random() * 9000)}`;

export const sanitizePageRange = (value: string) => {
  const cleaned = value.trim();
  if (!cleaned) return '1';
  return cleaned;
};

export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export const normalizePhone = (value: string) => value.replace(/\D/g, '').slice(0, 15);
