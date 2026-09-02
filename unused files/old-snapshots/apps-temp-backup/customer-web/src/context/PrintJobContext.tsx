/**
 * Print Job Context
 * Global state management for the customer kiosk workflow.
 * Integrated with the persistent AutoPrint backend API.
 */

import React, { createContext, useContext, useEffect, useMemo, useState, useRef } from 'react';
import {
  AppStep,
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
import { parseCustomPageRange } from '../utils/helpers';
import { CustomerApiClient } from '../services/apiClient';

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
  isSubmitting: boolean;
  submissionError: string | null;

  // Actions
  setStep: (step: AppStep) => void;
  switchShop: (shopId: string) => void;
  setUploadedFile: (file: UploadedFileDetails | null) => void;
  updateSpecs: (partial: Partial<PrintSpecifications>) => void;
  setPageRangeString: (rangeStr: string) => void;
  initiatePayment: (method: PaymentMethod, upiApp?: UpiAppId) => void;
  completePayment: () => Promise<void>;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

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
      const url = new URL(window.location.href);
      url.searchParams.set('shop', shopId);
      window.history.pushState({}, '', url.toString());
    }
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

  const initiatePayment = (method: PaymentMethod, upiApp?: UpiAppId) => {
    setPaymentDetails({
      method,
      upiApp: method === 'upi' ? upiApp || 'gpay' : undefined,
      paymentVerified: false,
    });
  };

  const completePayment = async () => {
    if (!uploadedFile) return;

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const amountMinorUnits = Math.round(pricing.totalAmount * 100);
      const backendPaymentMethod = paymentDetails.method === 'cash' ? 'CASH' : 'UPI';

      // 1. Submit actual file and print specifications to backend API
      const backendJob = await CustomerApiClient.submitPrintJob({
        file: uploadedFile.rawFile || null,
        fileName: uploadedFile.name,
        customerName: 'Kiosk Customer',
        specs,
        paymentMethod: backendPaymentMethod,
        amountMinorUnits,
        currency: 'INR',
        printerName: currentShop.activePrinters[0],
      });

      const now = new Date();
      const estimatedTime = new Date(now.getTime() + (currentShop.averageWaitMins || 2) * 60000);

      // 2. If UPI payment, record payment attempt
      let upiTxnId: string | undefined;
      if (backendPaymentMethod === 'UPI') {
        upiTxnId = `UPI/2026/${Date.now().toString().slice(-8)}`;
        await CustomerApiClient.recordDigitalAttempt({
          verificationCode: backendJob.verification.verificationCode,
          status: 'SUCCESS',
          gatewayRef: upiTxnId,
          vpa: currentShop.upiDetails.vpa,
        }).catch((e) => console.warn('Digital attempt registration:', e));
      }

      const initialJobStatus: JobStatus =
        backendJob.status === 'PRINTED' || backendJob.status === 'READY_FOR_HANDOVER'
          ? 'ready'
          : backendJob.status === 'PRINTING'
          ? 'printing'
          : 'queued';

      const newOrder: PrintOrder = {
        orderId: backendJob.id,
        collectionCode: backendJob.verification.formattedCode,
        shopId: currentShop.id,
        shopName: currentShop.name,
        kioskNumber: currentShop.kioskNumber,
        file: uploadedFile,
        specs: { ...specs },
        pricing: { ...pricing },
        payment: {
          ...paymentDetails,
          paymentVerified: backendPaymentMethod === 'UPI',
          paidAt: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
          transactionId: upiTxnId,
        },
        jobStatus: initialJobStatus,
        createdAt: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
        estimatedCompletionTime: estimatedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
      };

      setCurrentOrder(newOrder);
      setJobStatus(initialJobStatus);
      setStep('thankyou');

      // 3. Poll real job status from backend
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(async () => {
        const fresh = await CustomerApiClient.getJobById(backendJob.id);
        if (fresh) {
          if (fresh.status === 'PRINTED' || fresh.status === 'READY_FOR_HANDOVER') {
            setJobStatus('ready');
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          } else if (fresh.status === 'PRINTING') {
            setJobStatus('printing');
          }
        }
      }, 3000);
    } catch (err: any) {
      console.error('Job submission failed:', err);
      setSubmissionError(err.message || 'Failed to connect to print server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetJob = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setUploadedFile(null);
    setSpecs(DEFAULT_SPECS);
    setPaymentDetails(DEFAULT_PAYMENT);
    setCurrentOrder(null);
    setJobStatus('queued');
    setSubmissionError(null);
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
        isSubmitting,
        submissionError,
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
