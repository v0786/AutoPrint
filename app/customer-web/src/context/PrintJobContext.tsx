/**
 * Print Job Context
 * Global state management for the customer kiosk workflow.
 * Directly integrated with the real AutoPrint backend, live merchant status,
 * dynamic printer capacity workload calculations, and multilingual translations.
 */

import React, { createContext, useContext, useEffect, useMemo, useState, useRef, useCallback } from 'react';
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
import { calculatePricing } from '../utils/pricing';
import { parseCustomPageRange } from '../utils/helpers';
import { CustomerApiClient } from '../services/apiClient';
import { DEFAULT_OFFLINE_SHOP } from '../data/shops';

interface PrintJobContextType {
  currentStep: AppStep;
  currentShop: ShopInfo | null;
  isShopOnline: boolean;
  shopStatusMessage: string;
  isHeavyWorkload: boolean;
  queueWorkloadMessage: string | null;
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
  connectShop: (shopId: string) => void;
  disconnectShop: () => void;
  setUploadedFile: (file: UploadedFileDetails | null) => void;
  handleFileUpload: (file: File) => Promise<void>;
  updateUploadedFilePageCount: (count: number) => void;
  updateSpecs: (partial: Partial<PrintSpecifications>) => void;
  setPageRangeString: (rangeStr: string) => void;
  initiatePayment: (method: PaymentMethod, details?: Partial<PaymentDetails>) => void;
  completePayment: (paymentOverride?: Partial<PaymentDetails>) => Promise<void>;
  resetJob: () => void;
  setShopModalOpen: (open: boolean) => void;
  setQrModalOpen: (open: boolean) => void;
  setPreviewModalOpen: (open: boolean) => void;
  refreshShopStatus: () => Promise<void>;
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
  gateway: 'razorpay',
  upiApp: 'gpay',
  paymentVerified: false,
};

const PrintJobContext = createContext<PrintJobContextType | undefined>(undefined);

export const PrintJobProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStep, setStep] = useState<AppStep>('splash');
  const [currentShop, setCurrentShop] = useState<ShopInfo | null>(null);
  const [isShopOnline, setIsShopOnline] = useState<boolean>(false);
  const [shopStatusMessage, setShopStatusMessage] = useState<string>('Checking shop status...');
  const [isHeavyWorkload, setIsHeavyWorkload] = useState<boolean>(false);
  const [queueWorkloadMessage, setQueueWorkloadMessage] = useState<string | null>(null);

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

  // Fetch real merchant online profile & dynamic printer-capacity workload from backend
  const refreshShopStatus = async () => {
    try {
      const [res, workloadRes] = await Promise.all([
        fetch('/api/merchant/public-profile').catch(() => null),
        fetch('/api/system/workload').catch(() => null),
      ]);

      let workloadData: any = null;
      if (workloadRes && workloadRes.ok) {
        const wJson = await workloadRes.json().catch(() => null);
        if (wJson?.ok && wJson.data) {
          workloadData = wJson.data;
          setIsHeavyWorkload(Boolean(wJson.data.isHighWorkload));
          setQueueWorkloadMessage(wJson.data.queueMessage || null);
        }
      }

      if (res && res.ok) {
        const json = await res.json();
        if (json.ok && json.isAvailable && json.data) {
          const profile = json.data;
          const activeJobsCount = workloadData?.activeJobs ?? workloadData?.pendingJobs ?? 0;
          const waitMins = workloadData?.estimatedWaitMinutes ?? 2;

          setIsShopOnline(true);
          setShopStatusMessage('Online');
          setCurrentShop({
            id: profile.id,
            name: profile.name,
            branch: profile.branch || 'Main Counter',
            address: profile.address || 'Verified Shop Counter',
            kioskNumber: profile.kioskNumber || 'Counter #01',
            status: 'online',
            isMerchantConfigured: true,
            activePrinters: profile.selectedPrinter ? [profile.selectedPrinter] : ['AutoPrint Spooler'],
            queueLength: activeJobsCount,
            averageWaitMins: waitMins,
            rates: {
              bwSingle: profile.rates?.bwSingle ?? 2.0,
              bwDoublePerSide: profile.rates?.bwDoublePerSide ?? 1.5,
              colorSingle: profile.rates?.colorSingle ?? 10.0,
              colorDoublePerSide: profile.rates?.colorDoublePerSide ?? 8.0,
              photoGlossy: profile.rates?.photoGlossy ?? 25.0,
              a3Multiplier: profile.rates?.a3Multiplier ?? 2.0,
              legalMultiplier: profile.rates?.legalMultiplier ?? 1.25,
              letterMultiplier: profile.rates?.letterMultiplier ?? 1.0,
              finishing: {
                staple: profile.rates?.finishing?.staple ?? 5.0,
                spiral: profile.rates?.finishing?.spiral ?? 40.0,
                hardcover: profile.rates?.finishing?.hardcover ?? 150.0,
                laminationPerSheet: profile.rates?.finishing?.laminationPerSheet ?? 20.0,
              },
            },
            upiDetails: {
              vpa: profile.upiDetails?.vpa || profile.paymentConfig?.upiId || '',
              payeeName: profile.upiDetails?.payeeName || profile.name,
              qrDataUrl: profile.upiDetails?.qrDataUrl || profile.paymentConfig?.upiQrDataUrl || null,
            },
            paymentGateways: {
              razorpayEnabled: Boolean(profile.paymentConfig?.razorpayKeyId || profile.paymentConfig?.hasRazorpay),
              razorpayKeyId: profile.paymentConfig?.razorpayKeyId,
              juspayEnabled: false,
            },
          });
        } else {
          setIsShopOnline(false);
          setShopStatusMessage('No shop is selected');
          setCurrentShop(null);
        }
      } else {
        setIsShopOnline(false);
        setShopStatusMessage('No shop is selected');
        setCurrentShop(null);
      }
    } catch {
      setIsShopOnline(false);
      setShopStatusMessage('No shop is selected');
      setCurrentShop(null);
    }
  };

  useEffect(() => {
    refreshShopStatus();
    const interval = setInterval(refreshShopStatus, 6000);
    return () => clearInterval(interval);
  }, []);

  // Handle Real File Upload with Object URL generation & metadata extraction
  const handleFileUpload = async (file: File) => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/');
    const isDoc = file.name.endsWith('.docx') || file.name.endsWith('.doc') || file.name.endsWith('.pptx');
    const isText = file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md');
    const isSpreadsheet = file.name.endsWith('.xlsx') || file.name.endsWith('.csv');

    const previewUrl = URL.createObjectURL(file);
    let textContent: string | undefined;

    if (isText) {
      try {
        textContent = await file.text();
      } catch {}
    }

    let estimatedPages = 1;
    if (isPdf) {
      estimatedPages = Math.max(1, Math.ceil(file.size / (120 * 1024)));
    } else if (isDoc) {
      estimatedPages = Math.max(1, Math.ceil(file.size / (180 * 1024)));
    }

    const fileCategory = isPdf ? 'pdf' : isImage ? 'image' : isDoc ? 'doc' : isText ? 'text' : isSpreadsheet ? 'spreadsheet' : 'pdf';

    const uploaded: UploadedFileDetails = {
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      totalPages: estimatedPages,
      previewUrl,
      textContent,
      fileCategory,
      uploadTimestamp: Date.now(),
    };

    (uploaded as any).rawFile = file;

    setUploadedFile(uploaded);
    setSpecs((prev) => ({
      ...prev,
      selectedPagesCount: estimatedPages,
      orientation: 'portrait',
    }));
  };

  const updateUploadedFilePageCount = useCallback((num: number) => {
    if (!num || num < 1) return;
    setUploadedFile((prev) => {
      if (!prev || prev.totalPages === num) return prev;
      return { ...prev, totalPages: num };
    });
    setSpecs((prev) => {
      if (prev.pageRangeType === 'all') {
        return { ...prev, selectedPagesCount: num };
      }
      return prev;
    });
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

  // Recalculate pricing based on real merchant rates
  const pricing = useMemo(() => {
    return calculatePricing(specs, currentShop || DEFAULT_OFFLINE_SHOP);
  }, [specs, currentShop]);

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

  const switchShop = (_shopId: string) => {
    refreshShopStatus();
    setShopModalOpen(false);
  };

  const connectShop = (_shopId: string) => {
    refreshShopStatus();
  };

  const disconnectShop = () => {
    setIsShopOnline(false);
    setCurrentShop(null);
    setShopStatusMessage('No shop is selected');
  };

  const initiatePayment = (method: PaymentMethod, details?: Partial<PaymentDetails>) => {
    setPaymentDetails((prev) => ({
      ...prev,
      method,
      ...details,
      paymentVerified: false,
    }));
  };

  const completePayment = async (paymentOverride?: Partial<PaymentDetails>) => {
    if (!uploadedFile) return;

    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      const finalPayment = { ...paymentDetails, ...paymentOverride };
      const amountMinorUnits = Math.round(pricing.totalAmount * 100);
      const backendPaymentMethod = finalPayment.method === 'cash' ? 'CASH' : 'UPI';
      const rawFile = (uploadedFile as any).rawFile || null;

      // 1. Submit actual file and print specifications to backend API
      const backendJob = await CustomerApiClient.submitPrintJob({
        file: rawFile,
        fileName: uploadedFile.name,
        customerName: 'Kiosk Customer',
        customerPhone: finalPayment.payerContact?.phone,
        specs,
        paymentMethod: backendPaymentMethod,
        amountMinorUnits,
        currency: 'INR',
        printerName: currentShop?.activePrinters[0] || 'AutoPrint Spooler',
      });

      const now = new Date();
      const waitMins = currentShop?.averageWaitMins || 2;
      const estimatedTime = new Date(now.getTime() + waitMins * 60000);

      // 2. If UPI or Razorpay payment, record payment attempt
      let upiTxnId = finalPayment.gatewayPaymentId || finalPayment.transactionId;
      if (backendPaymentMethod === 'UPI') {
        upiTxnId = upiTxnId || `UPI/2026/${Date.now().toString().slice(-8)}`;
        await CustomerApiClient.recordDigitalAttempt({
          verificationCode: backendJob.verification.verificationCode,
          status: 'SUCCESS',
          gatewayRef: upiTxnId,
          vpa: currentShop?.upiDetails.vpa,
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
        shopId: currentShop?.id || 'AP-01',
        shopName: currentShop?.name || 'AutoPrint Station',
        kioskNumber: currentShop?.kioskNumber || 'Counter #01',
        file: uploadedFile,
        specs: { ...specs },
        pricing: { ...pricing },
        payment: {
          ...finalPayment,
          paymentVerified: backendPaymentMethod === 'UPI' || Boolean(finalPayment.paymentVerified),
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
    if (uploadedFile?.previewUrl) {
      try {
        URL.revokeObjectURL(uploadedFile.previewUrl);
      } catch {}
    }
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
        isShopOnline,
        shopStatusMessage,
        isHeavyWorkload,
        queueWorkloadMessage,
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
        connectShop,
        disconnectShop,
        setUploadedFile,
        handleFileUpload,
        updateUploadedFilePageCount,
        updateSpecs,
        setPageRangeString,
        initiatePayment,
        completePayment,
        resetJob,
        setShopModalOpen,
        setQrModalOpen,
        setPreviewModalOpen,
        refreshShopStatus,
      }}
    >
      {children}
    </PrintJobContext.Provider>
  );
};

export const usePrintJob = () => {
  const context = useContext(PrintJobContext);
  if (!context) throw new Error('usePrintJob must be used within a PrintJobProvider');
  return context;
};
