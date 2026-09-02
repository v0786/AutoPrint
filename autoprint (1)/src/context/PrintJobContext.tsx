import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import {
  AppStep,
  FinishingOption,
  JobStatus,
  PaymentDetails,
  PaymentMethod,
  PriceBreakdown,
  PrintOrder,
  PrintSpecifications,
  ShopInfo,
  UpiAppId,
  UploadedFileDetails,
} from '../types';
import { DEFAULT_SHOP_ID, resolveShopFromUrl, SHOPS_DATABASE } from '../data/shops';
import { calculatePricing } from '../utils/pricing';
import { generateCollectionCode, generateOrderId, parseCustomPageRange } from '../utils/helpers';

interface PrintJobContextType {
  currentStep: AppStep;
  currentShop: ShopInfo | null;
  isShopOnline: boolean;
  uploadedFile: UploadedFileDetails | null;
  specs: PrintSpecifications;
  pricing: PriceBreakdown;
  paymentDetails: PaymentDetails;
  currentOrder: PrintOrder | null;
  jobStatus: JobStatus;
  isShopModalOpen: boolean;
  isQrModalOpen: boolean;
  isPreviewModalOpen: boolean;
  isHeavyWorkload: boolean;
  
  // Actions
  setStep: (step: AppStep) => void;
  switchShop: (shopId: string) => void;
  connectShop: (shopId: string) => void;
  disconnectShop: () => void;
  setUploadedFile: (file: UploadedFileDetails | null) => void;
  updateSpecs: (partial: Partial<PrintSpecifications>) => void;
  setPageRangeString: (rangeStr: string) => void;
  initiatePayment: (method: PaymentMethod, details?: Partial<PaymentDetails>) => void;
  completePayment: (paymentOverride?: Partial<PaymentDetails>) => void;
  resetJob: () => void;
  setShopModalOpen: (open: boolean) => void;
  setQrModalOpen: (open: boolean) => void;
  setPreviewModalOpen: (open: boolean) => void;
}

const DEFAULT_SPECS: PrintSpecifications = {
  colorMode: 'bw',
  duplex: 'single',
  paperSize: 'a4',
  orientation: 'portrait',
  copies: 1,
  pageRangeType: 'all',
  customPageRange: '',
  selectedPagesCount: 1,
  finishing: 'none',
};

const DEFAULT_PAYMENT: PaymentDetails = {
  method: 'razorpay',
  gateway: 'razorpay',
  upiApp: 'gpay',
  paymentVerified: false,
};

const PrintJobContext = createContext<PrintJobContextType | undefined>(undefined);

export const PrintJobProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStep, setStep] = useState<AppStep>('splash');
  const [currentShop, setCurrentShop] = useState<ShopInfo | null>(() => resolveShopFromUrl());
  const [uploadedFile, setUploadedFile] = useState<UploadedFileDetails | null>(null);
  const [specs, setSpecs] = useState<PrintSpecifications>(DEFAULT_SPECS);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>(DEFAULT_PAYMENT);
  const [currentOrder, setCurrentOrder] = useState<PrintOrder | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus>('queued');
  
  // Modals
  const [isShopModalOpen, setShopModalOpen] = useState(false);
  const [isQrModalOpen, setQrModalOpen] = useState(false);
  const [isPreviewModalOpen, setPreviewModalOpen] = useState(false);

  // Determine if shop is truly online and merchant configured
  const isShopOnline = Boolean(
    currentShop &&
    currentShop.status === 'online' &&
    currentShop.isMerchantConfigured
  );

  // System workload check: heavy if queue length is 5 or more
  const isHeavyWorkload = Boolean(currentShop && currentShop.queueLength >= 5);

  // Sync shop when URL parameter changes
  useEffect(() => {
    const handlePopState = () => {
      const resolved = resolveShopFromUrl();
      setCurrentShop(resolved);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Update selectedPagesCount when uploaded file totalPages changes or custom range changes
  useEffect(() => {
    if (!uploadedFile) {
      setSpecs((prev) => ({ ...prev, selectedPagesCount: 1 }));
      return;
    }

    if (specs.pageRangeType === 'all') {
      setSpecs((prev) => ({ ...prev, selectedPagesCount: uploadedFile.totalPages }));
    } else {
      const parsed = parseCustomPageRange(specs.customPageRange, uploadedFile.totalPages);
      if (parsed.valid) {
        setSpecs((prev) => ({ ...prev, selectedPagesCount: parsed.pages.length }));
      }
    }
  }, [uploadedFile, specs.pageRangeType, specs.customPageRange]);

  // Recalculate pricing
  const pricing = useMemo(() => {
    return calculatePricing(specs, currentShop);
  }, [specs, currentShop]);

  const switchShop = (shopId: string) => {
    const targetShop = SHOPS_DATABASE[shopId];
    if (targetShop) {
      setCurrentShop(targetShop);
      const url = new URL(window.location.href);
      url.searchParams.set('shop', shopId);
      window.history.pushState({}, '', url.toString());
    }
    setShopModalOpen(false);
  };

  const connectShop = (shopId: string) => {
    switchShop(shopId);
  };

  const disconnectShop = () => {
    setCurrentShop(null);
    const url = new URL(window.location.href);
    url.searchParams.set('shop', 'none');
    window.history.pushState({}, '', url.toString());
    setShopModalOpen(false);
  };

  const updateSpecs = (partial: Partial<PrintSpecifications>) => {
    setSpecs((prev) => {
      const updated = { ...prev, ...partial };
      if (partial.pageRangeType === 'all' && uploadedFile) {
        updated.selectedPagesCount = uploadedFile.totalPages;
      }
      return updated;
    });
  };

  const setPageRangeString = (rangeStr: string) => {
    const totalPages = uploadedFile?.totalPages || 1;
    const parsed = parseCustomPageRange(rangeStr, totalPages);
    setSpecs((prev) => ({
      ...prev,
      customPageRange: rangeStr,
      selectedPagesCount: parsed.valid ? parsed.pages.length : prev.selectedPagesCount,
    }));
  };

  const initiatePayment = (method: PaymentMethod, details?: Partial<PaymentDetails>) => {
    setPaymentDetails((prev) => ({
      ...prev,
      method,
      gateway: method === 'razorpay' ? 'razorpay' : method === 'juspay' ? 'juspay' : undefined,
      ...details,
      paymentVerified: false,
    }));
  };

  const completePayment = (paymentOverride?: Partial<PaymentDetails>) => {
    if (!uploadedFile) return;

    const finalPayment = {
      ...paymentDetails,
      ...paymentOverride,
      paymentVerified: true,
    };

    const collectionCode = generateCollectionCode();
    const orderId = generateOrderId();
    const now = new Date();
    const estimatedTime = new Date(now.getTime() + (currentShop?.averageWaitMins || 2) * 60000);

    const newOrder: PrintOrder = {
      orderId,
      collectionCode,
      shopId: currentShop?.id || 'unassigned',
      shopName: currentShop?.name || 'AutoPrint Express',
      kioskNumber: currentShop?.kioskNumber || 'Counter #01',
      file: uploadedFile,
      specs: { ...specs },
      pricing: { ...pricing },
      payment: {
        ...finalPayment,
        paidAt: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        transactionId: finalPayment.transactionId || finalPayment.gatewayPaymentId || `TXN${Date.now().toString().slice(-8)}`,
      },
      jobStatus: 'queued',
      createdAt: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
      estimatedCompletionTime: estimatedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
    };

    setCurrentOrder(newOrder);
    setPaymentDetails(finalPayment);
    setJobStatus('queued');
    setStep('thankyou');

    // Simulate print queue progression: queued -> printing -> ready
    setTimeout(() => {
      setJobStatus('printing');
    }, 4500);

    setTimeout(() => {
      setJobStatus('ready');
    }, 10500);
  };

  const resetJob = () => {
    setUploadedFile(null);
    setSpecs(DEFAULT_SPECS);
    setPaymentDetails(DEFAULT_PAYMENT);
    setCurrentOrder(null);
    setJobStatus('queued');
    setStep('specs');
  };

  return (
    <PrintJobContext.Provider
      value={{
        currentStep,
        currentShop,
        isShopOnline,
        uploadedFile,
        specs,
        pricing,
        paymentDetails,
        currentOrder,
        jobStatus,
        isShopModalOpen,
        isQrModalOpen,
        isPreviewModalOpen,
        isHeavyWorkload,
        setStep,
        switchShop,
        connectShop,
        disconnectShop,
        setUploadedFile,
        updateSpecs,
        setPageRangeString,
        initiatePayment,
        completePayment,
        resetJob,
        setShopModalOpen,
        setQrModalOpen,
        setPreviewModalOpen,
      }}
    >
      {children}
    </PrintJobContext.Provider>
  );
};

export function usePrintJob(): PrintJobContextType {
  const context = useContext(PrintJobContext);
  if (!context) {
    throw new Error('usePrintJob must be used within a PrintJobProvider');
  }
  return context;
}

