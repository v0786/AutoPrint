export type ColorMode = 'bw' | 'color' | 'photo';
export type DuplexMode = 'single' | 'double';
export type PaperSize = 'a4' | 'a3' | 'legal' | 'letter' | 'photo_4x6';
export type Orientation = 'portrait' | 'landscape';
export type FinishingOption = 'none' | 'staple' | 'spiral' | 'hardcover' | 'lamination';
export type PaymentMethod = 'upi' | 'cash';
export type UpiAppId = 'gpay' | 'phonepe' | 'paytm' | 'cred' | 'bhim' | 'generic';
export type JobStatus = 'queued' | 'printing' | 'ready' | 'collected';
export type AppStep = 'splash' | 'specs' | 'payment' | 'thankyou';

export interface ShopInfo {
  id: string;
  name: string;
  branch: string;
  address: string;
  kioskNumber: string;
  status: 'online' | 'busy' | 'maintenance';
  activePrinters: string[];
  queueLength: number;
  averageWaitMins: number;
  rates: {
    bwSingle: number; // e.g. ₹2
    bwDoublePerSide: number; // e.g. ₹1.5
    colorSingle: number; // e.g. ₹10
    colorDoublePerSide: number; // e.g. ₹8
    photoGlossy: number; // e.g. ₹25
    a3Multiplier: number; // e.g. 2x
    legalMultiplier: number; // e.g. 1.2x
    letterMultiplier: number; // e.g. 1.0x
    finishing: {
      staple: number; // ₹5
      spiral: number; // ₹40
      hardcover: number; // ₹140
      laminationPerSheet: number; // ₹20
    };
  };
  upiDetails: {
    vpa: string;
    payeeName: string;
  };
}

export interface UploadedFileDetails {
  name: string;
  size: number;
  type: string;
  totalPages: number;
  rawFile?: File;
  mockThumbnails?: string[];
  uploadTimestamp: number;
}

export interface PrintSpecifications {
  colorMode: ColorMode;
  duplex: DuplexMode;
  paperSize: PaperSize;
  orientation: Orientation;
  copies: number;
  pageRangeType: 'all' | 'custom';
  customPageRange: string;
  selectedPagesCount: number;
  finishing: FinishingOption;
}

export interface PriceBreakdown {
  ratePerPage: number;
  effectiveSheets: number;
  pageTotalCost: number;
  paperSizeSurcharge: number;
  finishingCost: number;
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
}

export interface PaymentDetails {
  method: PaymentMethod;
  upiApp?: UpiAppId;
  transactionId?: string;
  paidAt?: string;
  paymentVerified: boolean;
}

export interface PrintOrder {
  orderId: string;
  collectionCode: string; // 8-digit formatted code e.g. "8492-1057"
  shopId: string;
  shopName: string;
  kioskNumber: string;
  file: UploadedFileDetails;
  specs: PrintSpecifications;
  pricing: PriceBreakdown;
  payment: PaymentDetails;
  jobStatus: JobStatus;
  createdAt: string;
  estimatedCompletionTime: string;
}
