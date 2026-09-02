/**
 * Type definitions for Desktop Printing Job Application & Electron Spooler Bridge
 */

export type PrinterStatus =
  | 'ready'
  | 'printing'
  | 'paused'
  | 'offline'
  | 'out_of_paper'
  | 'paper_jam'
  | 'door_open'
  | 'error';

export type PrinterType =
  | 'thermal_receipt'
  | 'label_barcode'
  | 'document_laser'
  | 'kitchen_impact'
  | 'virtual_pdf';

export type PaperFormat = '80mm' | '58mm' | '4x6in' | 'A4' | 'Letter' | 'Continuous';

export type SpoolerBackend = 'winspool' | 'cups' | 'browser_native' | 'mock_spooler';

export interface PrinterDevice {
  id: string;
  name: string;
  displayName: string;
  status: PrinterStatus;
  isDefault: boolean;
  type: PrinterType;
  paperFormat: PaperFormat;
  dpi: number;
  connectionType: 'usb' | 'network' | 'bluetooth' | 'virtual';
  port: string;
  location: string;
  paperLevelPercent: number; // 0 - 100
  tonerLevelPercent: number; // 0 - 100
  activeJobsCount: number;
  totalJobsPrinted: number;
  errorCount: number;
  supportedFeatures: {
    color: boolean;
    duplex: boolean;
    autoCut: boolean;
    cashDrawerKick: boolean;
    barcode1D: boolean;
    qr2D: boolean;
  };
  lastStatusUpdate: string;
}

export type JobStatus =
  | 'queued'
  | 'spooling'
  | 'printing'
  | 'completed'
  | 'failed'
  | 'paused'
  | 'cancelled';

export type JobPriority = 'low' | 'normal' | 'high' | 'rush';

export type DocumentType = 'receipt' | 'label' | 'invoice' | 'report' | 'custom_raw';

export interface ReceiptItem {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  options?: string;
  category?: string;
}

export interface ReceiptData {
  merchantName: string;
  storeAddress: string;
  phone: string;
  taxId?: string;
  cashier: string;
  registerId: string;
  orderNumber: string;
  orderType: 'Dine-In' | 'Takeout' | 'Delivery' | 'Retail Checkout';
  date: string;
  items: ReceiptItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  paymentMethod: 'Cash' | 'Credit Card' | 'Apple Pay' | 'Store Credit' | 'Contactless Tap';
  cardLast4?: string;
  barcodeValue: string;
  qrCodeValue?: string;
  footerMessage: string;
  autoCut: boolean;
  openDrawer: boolean;
}

export interface LabelData {
  itemTitle: string;
  sku: string;
  trackingNumber: string;
  barcodeType?: 'CODE128' | 'EAN13' | 'QR';
  sender: {
    name: string;
    company?: string;
    street: string;
    cityStateZip: string;
  };
  recipient: {
    name: string;
    company?: string;
    street: string;
    cityStateZip: string;
    phone?: string;
  };
  weightLbs: number;
  packageType?: string;
  fragile: boolean;
  batchNumber?: string;
  shelfLocation?: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceData {
  invoiceNumber: string;
  clientName: string;
  clientCompany: string;
  clientEmail: string;
  billingAddress: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  taxRatePercent: number;
  taxAmount: number;
  discountAmount: number;
  grandTotal: number;
  paymentTerms: string;
  notes: string;
}

export interface ReportData {
  title: string;
  period: string;
  merchantName: string;
  summaryMetrics: { label: string; value: string; change?: string }[];
  breakdown: { category: string; count: number; volume: string }[];
  generatedAt: string;
  generatedBy: string;
}

export interface PrintJobContent {
  receiptData?: ReceiptData;
  labelData?: LabelData;
  invoiceData?: InvoiceData;
  reportData?: ReportData;
  rawEscPos?: string;
  htmlContent?: string;
  plainText?: string;
}

export interface PrintJob {
  id: string;
  jobNo: string;
  title: string;
  documentType: DocumentType;
  printerId: string;
  printerName: string;
  status: JobStatus;
  priority: JobPriority;
  copies: number;
  submittedAt: string;
  startedAt?: string;
  completedAt?: string;
  totalPages: number;
  pagesPrinted: number;
  bytesTotal: number;
  bytesSpooled: number;
  content: PrintJobContent;
  errorReason?: string;
  retryCount: number;
  maxRetries: number;
  silentPrint: boolean;
  spoolSpeedKbps: number;
  latencyMs: number;
  verificationCode?: string;
  formattedVerificationCode?: string;
  paymentStatus?: 'PENDING' | 'UPI_INITIATED' | 'UPI_SUCCESS' | 'UPI_FAILED' | 'CASH_REQUIRED' | 'CASH_COLLECTED' | 'CASH_LOCKED' | 'CANCELLED';
  isCashLocked?: boolean;
  customerName?: string;
  totalCost?: number;
}

export interface SpoolerMetrics {
  totalJobsSubmitted: number;
  totalJobsCompleted: number;
  totalJobsFailed: number;
  activeJobs: number;
  avgLatencyMs: number;
  queueBandwidthKbps?: number;
  totalBytesPrinted: number;
  uptimeSeconds: number;
  isQueuePaused: boolean;
}

export interface SpoolerLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  printerName?: string;
  jobNo?: string;
  details?: Record<string, any>;
}

export interface SpoolerEvent {
  id: string;
  timestamp: string;
  type:
    | 'job_created'
    | 'job_spooled'
    | 'job_started'
    | 'job_completed'
    | 'job_failed'
    | 'job_cancelled'
    | 'job_retried'
    | 'printer_status_change'
    | 'queue_paused'
    | 'queue_resumed'
    | 'hardware_fault'
    | 'spooler_restarted';
  jobId?: string;
  printerId?: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  details?: Record<string, any>;
}

export interface IpcBridgeInterface {
  isElectron: boolean;
  platform: 'win32' | 'darwin' | 'linux' | 'browser';
  spoolerBackend: SpoolerBackend;
  getPrinters(): Promise<PrinterDevice[]>;
  getJobs(): Promise<PrintJob[]>;
  getLogs(): Promise<SpoolerLog[]>;
  getMetrics(): Promise<SpoolerMetrics>;
  submitPrintJob(jobData: any): Promise<PrintJob>;
  cancelJob(jobId: string): Promise<boolean>;
  retryJob(jobId: string): Promise<PrintJob | null>;
  reorderQueue(jobIds: string[]): Promise<PrintJob[]>;
  pauseQueue(isPaused?: boolean): Promise<boolean>;
  purgeCompletedJobs(): Promise<boolean>;
  setPrinterStatus(printerId: string, status: PrinterStatus, faultDetails?: { paperLevel?: number; tonerLevel?: number }): Promise<boolean>;
  triggerTestPrint(printerId: string, testType: 'diagnostic' | 'alignment' | 'density' | 'receipt'): Promise<PrintJob>;
  benchmarkIpcLatency(): Promise<number>;
  clearLogs(): Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI?: {
      getPrinters: () => Promise<PrinterDevice[]>;
      getJobs: () => Promise<PrintJob[]>;
      getMetrics: () => Promise<SpoolerMetrics>;
      submitJob: (jobData: any) => Promise<PrintJob>;
      cancelJob: (jobId: string) => Promise<boolean>;
      retryJob: (jobId: string) => Promise<boolean>;
      reorderQueue: (jobIds: string[]) => Promise<boolean>;
      pauseQueue: () => Promise<boolean>;
      resumeQueue: () => Promise<boolean>;
      purgeCompleted: () => Promise<boolean>;
      setPrinterStatus: (printerId: string, status: PrinterStatus) => Promise<boolean>;
      triggerTestPrint: (printerId: string, testType: string) => Promise<PrintJob>;
      executeNativePrint: (htmlContent: string, options: any) => Promise<boolean>;
      on: (channel: string, callback: (...args: any[]) => void) => () => void;
      platform: 'win32' | 'darwin' | 'linux';
      isElectron: true;
    };
  }
}
