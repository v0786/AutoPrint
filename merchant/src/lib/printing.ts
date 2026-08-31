import { buildOrderId, buildVerificationCode, type PrintJobRequest, type PrintJobStatus, type PrintStatus } from '../../../shared/src';

export type PrintQueueItem = PrintJobStatus & {
  orderId: string;
  printerId: string;
  createdAt: string;
  customerName: string;
};

export const createPrintQueueItem = (request: PrintJobRequest, customerName = 'Customer'): PrintQueueItem => {
  const orderId = buildOrderId();
  const verificationCode = buildVerificationCode();

  return {
    id: orderId,
    orderId,
    verificationCode,
    status: 'queued',
    paymentMethod: request.paymentMethod,
    fileName: request.fileName,
    pageRange: request.pageRange,
    printerId: 'usb-01',
    createdAt: new Date().toISOString(),
    customerName,
  };
};

export const advancePrintStatus = (status: PrintStatus): PrintStatus => {
  switch (status) {
    case 'queued':
      return 'printing';
    case 'printing':
      return 'verified';
    case 'verified':
      return 'completed';
    default:
      return 'failed';
  }
};

export const getPrintableQueue = (items: PrintQueueItem[]) => [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

export const validatePrintRequest = (request: PrintJobRequest) => {
  if (!request.fileName || !request.pageRange || request.copies < 1) {
    return false;
  }

  return ['cash', 'upi'].includes(request.paymentMethod);
};
