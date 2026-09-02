/**
 * Print Job Context
 * Global state management for the customer kiosk workflow.
 * Directly integrated with the real AutoPrint backend and live merchant status.
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
import { calculatePricing } from '../utils/pricing';
import { parseCustomPageRange } from '../utils/helpers';
import { CustomerApiClient } from '../services/apiClient';

interface PrintJobContextType {
  currentStep: AppStep;
  currentShop: ShopInfo;
  isShopOnline: boolean;
  shopStatusMessage: string;
  queueMessage: string | null;
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
  setUploadedFile: (file: UploadedFileDetails | null) => void;
  handleFileUpload: (file: File) => Promise<void>;
  updateSpecs: (partial: Partial<PrintSpecifications>) => void;
  setPageRangeString: (rangeStr: string) => void;
  initiatePayment: (method: PaymentMethod, upiApp?: UpiAppId) => void;
  completePayment: () => Promise<void>;
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
  upiApp: 'gpay',
  paymentVerified: false,
};

const DEFAULT_OFFLINE_SHOP: ShopInfo = {
  id: 'offline',
  name: 'No shop is selected',
  branch: 'Offline Counter',
  address: 'Shop is currently offline or unconfigured.',
  kioskNumber: 'Counter #00',
  status: 'maintenance',
  activePrinters: [],
  queueLength: 0,
  averageWaitMins: 0,
  rates: {
    bwSingle: 2.0,
    bwDoublePerSide: 1.5,
    colorSingle: 10.0,
    colorDoublePerSide: 8.0,
    photoGlossy: 25.0,
    a3Multiplier: 2.0,
    legalMultiplier: 1.25,
    letterMultiplier: 1.0,
    finishing: {
      staple: 5.0,
      spiral: 40.0,
      hardcover: 150.0,
      laminationPerSheet: 20.0,
    },
  },
  upiDetails: {
    vpa: '',
    payeeName: '',
  },
};

const PrintJobContext = createContext<PrintJobContextType | undefined>(undefined);

export const PrintJobProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStep, setStep] = useState<AppStep>('splash');
  const [currentShop, setCurrentShop] = useState<ShopInfo>(DEFAULT_OFFLINE_SHOP);
  const [isShopOnline, setIsShopOnline] = useState<boolean>(false);
  const [shopStatusMessage, setShopStatusMessage] = useState<string>('Checking shop status...');
  const [queueMessage, setQueueMessage] = useState<string | null>(null);

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

  // Fetch real merchant online profile & system workload
  const refreshShopStatus = async () => {
    try {
      const res = await fetch('/api/merchant/public-profile');
      if (res.ok) {
        const json = await res.json();
        if (json.ok && json.isAvailable && json.data) {
          const profile = json.data;
          setIsShopOnline(true);
          setShopStatusMessage('Online');
          setCurrentShop({
            id: profile.id,
            name: profile.name,
            branch: profile.branch || 'Main Counter',
            address: profile.address || 'Verified Shop Counter',
            kioskNumber: profile.kioskNumber || 'Counter #01',
            status: 'online',
            activePrinters: profile.selectedPrinter ? [profile.selectedPrinter] : ['AutoPrint Spooler'],
            queueLength: 0,
            averageWaitMins: 2,
            rates: {
              ...DEFAULT_OFFLINE_SHOP.rates,
              bwSingle: profile.rates?.bwSingle || 2.0,
              colorSingle: profile.rates?.colorSingle || 10.0,
            },
            upiDetails: {
              vpa: profile.upiDetails?.vpa || profile.paymentConfig?.upiId || '',
              payeeName: profile.upiDetails?.payeeName || profile.name,
            },
          });
        } else {
          setIsShopOnline(false);
          setShopStatusMessage('No shop is selected');
          setCurrentShop(DEFAULT_OFFLINE_SHOP);
        }
      } else {
        setIsShopOnline(false);
        setShopStatusMessage('No shop is selected');
        setCurrentShop(DEFAULT_OFFLINE_SHOP);
      }

      // Check system workload
      const workloadRes = await fetch('/api/system/workload').catch(() => null);
      if (workloadRes && workloadRes.ok) {
        const wJson = await workloadRes.json();
        if (wJson.ok && wJson.data?.queueMessage) {
          setQueueMessage(wJson.data.queueMessage);
        } else {
          setQueueMessage(null);
        }
      }
    } catch {
      setIsShopOnline(false);
      setShopStatusMessage('No shop is selected');
      setCurrentShop(DEFAULT_OFFLINE_SHOP);
    }
  };

  useEffect(() => {
    refreshShopStatus();
    const interval = setInterval(refreshShopStatus, 8000);
    return () => clearInterval(interval);
  }, []);

  // Handle Real File Upload with Object URL generation
  const handleFileUpload = async (file: File) => {
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/');
    const previewUrl = URL.createObjectURL(file);

    // Approximate page count
    let estimatedPages = 1;
    if (isPdf) {
      estimatedPages = Math.max(1, Math.ceil(file.size / (120 * 1024)));
    }

    const uploaded: UploadedFileDetails = {
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      totalPages: estimatedPages,
      rawFile: file,
      previewUrl,
      isPdf,
      isImage,
      uploadTimestamp: Date.now(),
    };

    setUploadedFile(uploaded);
    setSpecs((prev) => ({
      ...prev,
      selectedPagesCount: estimatedPages,
      orientation: 'portrait',
    }));
  };

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
    return calculatePricing(specs, currentShop);
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
        printerName: currentShop.activePrinters[0] || 'AutoPrint Spooler',
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
        queueMessage,
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
        setUploadedFile,
        handleFileUpload,
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
