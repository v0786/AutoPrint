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
  currentShop: ShopInfo;
  uploadedFile: UploadedFileDetails | null;
  specs: PrintSpecifications;
  pricing: PriceBreakdown;
  paymentDetails: PaymentDetails;
  currentOrder: PrintOrder | null;
  jobStatus: JobStatus;
  isShopModalOpen: boolean;
  isQrModalOpen: boolean;
  isPreviewModalOpen: boolean;
  
  // Actions
  setStep: (step: AppStep) => void;
  switchShop: (shopId: string) => void;
  setUploadedFile: (file: UploadedFileDetails | null) => void;
  updateSpecs: (partial: Partial<PrintSpecifications>) => void;
  setPageRangeString: (rangeStr: string) => void;
  initiatePayment: (method: PaymentMethod, upiApp?: UpiAppId) => void;
  completePayment: () => void;
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
  method: 'upi',
  upiApp: 'gpay',
  paymentVerified: false,
};

const PrintJobContext = createContext<PrintJobContextType | undefined>(undefined);

export const PrintJobProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStep, setStep] = useState<AppStep>('splash');
  const [currentShop, setCurrentShop] = useState<ShopInfo>(() => resolveShopFromUrl());
  const [uploadedFile, setUploadedFile] = useState<UploadedFileDetails | null>(null);
  const [specs, setSpecs] = useState<PrintSpecifications>(DEFAULT_SPECS);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails>(DEFAULT_PAYMENT);
  const [currentOrder, setCurrentOrder] = useState<PrintOrder | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus>('queued');
  
  // Modals
  const [isShopModalOpen, setShopModalOpen] = useState(false);
  const [isQrModalOpen, setQrModalOpen] = useState(false);
  const [isPreviewModalOpen, setPreviewModalOpen] = useState(false);

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
      // Update URL query without page reload
      const url = new URL(window.location.href);
      url.searchParams.set('shop', shopId);
      window.history.pushState({}, '', url.toString());
    }
    setShopModalOpen(false);
  };

  const updateSpecs = (partial: Partial<PrintSpecifications>) => {
    setSpecs((prev) => {
      const updated = { ...prev, ...partial };
      // If switching to all pages, reset selected count to file's total
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

  const initiatePayment = (method: PaymentMethod, upiApp?: UpiAppId) => {
    setPaymentDetails({
      method,
      upiApp: method === 'upi' ? upiApp || 'gpay' : undefined,
      paymentVerified: false,
    });
  };

  const completePayment = () => {
    if (!uploadedFile) return;

    const collectionCode = generateCollectionCode();
    const orderId = generateOrderId();
    const now = new Date();
    const estimatedTime = new Date(now.getTime() + (currentShop.averageWaitMins || 2) * 60000);

    const newOrder: PrintOrder = {
      orderId,
      collectionCode,
      shopId: currentShop.id,
      shopName: currentShop.name,
      kioskNumber: currentShop.kioskNumber,
      file: uploadedFile,
      specs: { ...specs },
      pricing: { ...pricing },
      payment: {
        ...paymentDetails,
        paymentVerified: true,
        paidAt: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        transactionId: paymentDetails.method === 'upi' ? `TXN${Date.now().toString().slice(-8)}` : undefined,
      },
      jobStatus: 'queued',
      createdAt: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
      estimatedCompletionTime: estimatedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
    };

    setCurrentOrder(newOrder);
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
        uploadedFile,
        specs,
        pricing,
        paymentDetails,
        currentOrder,
        jobStatus,
        isShopModalOpen,
        isQrModalOpen,
        isPreviewModalOpen,
        setStep,
        switchShop,
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
