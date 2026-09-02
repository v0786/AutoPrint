'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import type {
  PrintJob,
  UploadedFileItem,
  PrintPreferences,
  PricingBreakdown,
  CustomerInfo,
  PaymentMethod,
  PricingSettings,
  MerchantSettings,
  LocalPrinter,
  JobStatus,
} from '@/types';
import { useToast } from '@/components/common/Toast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import {
  validateCustomerInfo,
  validatePrintPreferences,
  validateUploadedFiles,
  type ValidationResult,
} from '@/lib/validation';
import { createPrintOrder, checkApiHealth } from '@/api/client';
import { ApiError, getUserFriendlyMessage } from '@/lib/apiErrors';

interface CreateJobInput {
  stationId: string;
  customer: CustomerInfo;
  files: UploadedFileItem[];
  preferences: PrintPreferences;
  pricing: PricingBreakdown;
  payment: {
    method: PaymentMethod;
    status: 'pending' | 'completed' | 'refunded' | 'failed';
    transactionId?: string;
    paidAt?: string;
    amount: number;
  };
  status: JobStatus;
  assignedPrinterId: string;
  totalPagesToPrint: number;
  estimatedWaitMinutes: number;
}

type JobActionStatus = 'idle' | 'loading' | 'success' | 'error';

interface PrintJobContextValue {
  merchantSettings: MerchantSettings;
  pricingSettings: PricingSettings;
  printers: LocalPrinter[];
  jobs: PrintJob[];
  createJobStatus: JobActionStatus;
  createJobError: string | null;
  apiHealth: { ok: boolean; latencyMs: number; lastChecked: string | null };

  createJob: (input: CreateJobInput) => Promise<PrintJob>;
  updateJobStatus: (jobId: string, status: JobStatus) => void;
  updateJobProgress: (
    jobId: string,
    progressPercent: number,
    pagesPrinted: number
  ) => void;
  getJobById: (jobId: string) => PrintJob | undefined;
  validateSubmission: (
    files: UploadedFileItem[],
    preferences: PrintPreferences,
    customer: CustomerInfo
  ) => ValidationResult;
  refreshApiHealth: () => Promise<void>;
  clearCreateJobError: () => void;
}

const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  countryCode: 'IN',
  bwPricePerPage: 2.0,
  colorPricePerPage: 10.0,
  a3Multiplier: 2.0,
  legalMultiplier: 1.2,
  duplexDiscountPercent: 10,
  paperFinishPrices: {
    standard_80gsm: 0,
    premium_100gsm: 1.0,
    glossy_photo_200gsm: 5.0,
    cardstock_250gsm: 8.0,
  },
  bindingPrices: {
    none: 0,
    staple_top_left: 5.0,
    corner_punch: 10.0,
    spiral_bound: 50.0,
    comb_bound: 40.0,
  },
  bulkDiscounts: [
    { minPages: 50, discountPercent: 5 },
    { minPages: 100, discountPercent: 10 },
    { minPages: 500, discountPercent: 15 },
  ],
  currency: '\u20B9',
  currencyCode: 'INR',
  symbolPosition: 'prefix',
  taxName: 'GST',
  taxRatePercent: 18,
};

const DEFAULT_MERCHANT_SETTINGS: MerchantSettings = {
  storeName: 'AutoPrint Store',
  storeTagline: 'Professional Printing — Zero Cloud',
  address: '123 Print Lane, Downtown',
  supportPhone: '+91 98765 43210',
  supportEmail: 'support@autoprint.local',
  operatingHours: 'Mon-Sat, 9 AM to 9 PM',
  localServerPort: 4100,
  operatingSystem: 'windows',
  autoPrintApprovedJobs: true,
  queueAutoProcess: true,
  autoShredAfterPrint: true,
  shredPassCount: 3,
  enableSmsNotifications: true,
  enableWhatsAppAlerts: true,
  requirePinForCollection: true,
  passcodeProtectedDashboard: false,
  activeStationId: 'STATION-01 (Front Counter)',
};

const DEFAULT_PRINTERS: LocalPrinter[] = [
  {
    id: 'usb-01',
    name: 'Brother DCP-L2540DW',
    model: 'Brother DCP-L2540DW',
    connection: 'USB',
    status: 'online',
    supportsColor: false,
    supportsDuplex: true,
    supportedSizes: ['A4', 'Letter', 'Legal'],
    tray1Level: 85,
    blackTonerLevel: 72,
    isDefault: true,
  },
  {
    id: 'net-01',
    name: 'HP Color LaserJet Pro M454',
    model: 'HP LaserJet M454',
    connection: 'Network',
    ipAddress: '192.168.1.45',
    status: 'online',
    supportsColor: true,
    supportsDuplex: true,
    supportedSizes: ['A4', 'A3', 'Letter', 'Legal'],
    tray1Level: 60,
    tray2Level: 90,
    blackTonerLevel: 80,
    cyanTonerLevel: 65,
    magentaTonerLevel: 45,
    yellowTonerLevel: 70,
    isDefault: false,
  },
];

const STORAGE_KEY_JOBS = 'autoprint:jobs:v1';
const STORAGE_KEY_PRICING = 'autoprint:pricing:v1';
const STORAGE_KEY_MERCHANT = 'autoprint:merchant:v1';

const PrintJobContext = createContext<PrintJobContextValue | null>(null);

export function PrintJobProvider({ children }: { children: ReactNode }) {
  const { addToast } = useToast();

  const [persistedJobs, setPersistedJobs] = useLocalStorage<PrintJob[]>(
    STORAGE_KEY_JOBS,
    []
  );
  const [merchantSettings] = useLocalStorage<MerchantSettings>(
    STORAGE_KEY_MERCHANT,
    DEFAULT_MERCHANT_SETTINGS
  );
  const [pricingSettings] = useLocalStorage<PricingSettings>(
    STORAGE_KEY_PRICING,
    DEFAULT_PRICING_SETTINGS
  );
  const [printers] = useState<LocalPrinter[]>(DEFAULT_PRINTERS);

  const [jobs, setJobs] = useState<PrintJob[]>(persistedJobs);
  const [createJobStatus, setCreateJobStatus] = useState<JobActionStatus>('idle');
  const [createJobError, setCreateJobError] = useState<string | null>(null);
  const [apiHealth, setApiHealth] = useState<{
    ok: boolean;
    latencyMs: number;
    lastChecked: string | null;
  }>({
    ok: true,
    latencyMs: 0,
    lastChecked: null,
  });

  const refreshApiHealth = useCallback(async () => {
    const health = await checkApiHealth();
    setApiHealth({
      ok: health.ok,
      latencyMs: health.latencyMs,
      lastChecked: new Date().toISOString(),
    });
  }, []);

  const clearCreateJobError = useCallback(() => {
    setCreateJobError(null);
    setCreateJobStatus('idle');
  }, []);

  const validateSubmission = useCallback(
    (
      files: UploadedFileItem[],
      preferences: PrintPreferences,
      customer: CustomerInfo
    ): ValidationResult => {
      const fileResult = validateUploadedFiles(files);
      const prefResult = validatePrintPreferences(preferences);
      const custResult = validateCustomerInfo(customer);

      const combinedErrors: Record<string, string> = {
        ...fileResult.errors,
        ...prefResult.errors,
        ...custResult.errors,
      };

      return {
        valid: Object.keys(combinedErrors).length === 0,
        errors: combinedErrors,
      };
    },
    []
  );

  const createJob = useCallback(
    async (input: CreateJobInput): Promise<PrintJob> => {
      setCreateJobStatus('loading');
      setCreateJobError(null);

      try {
        const validation = validateSubmission(
          input.files,
          input.preferences,
          input.customer
        );
        if (!validation.valid) {
          const firstError = Object.values(validation.errors)[0];
          throw new Error(firstError || 'Invalid submission');
        }

        const firstFile = input.files[0];
        if (firstFile) {
          try {
            await createPrintOrder({
              fileName: firstFile.name,
              mimeType: firstFile.mimeType,
              colorMode: input.preferences.colorMode,
              copies: input.preferences.copies,
              pageRange: input.preferences.pageRange,
              paymentMethod:
                input.payment.method === 'cash_counter' ||
                input.payment.method === 'card' ||
                input.payment.method === 'upi_qr' ||
                input.payment.method === 'apple_google_pay'
                  ? input.payment.method === 'cash_counter'
                    ? 'cash'
                    : 'upi'
                  : 'cash',
              customerName: input.customer.name,
            });
          } catch (apiErr) {
            if (apiErr instanceof ApiError) {
              const userMsg = getUserFriendlyMessage(apiErr);
              setCreateJobError(userMsg);
              addToast({
                type: 'error',
                title: 'Server Connection Issue',
                message: userMsg,
                details: apiErr.details.length
                  ? apiErr.details.map((d) => d.message).join('; ')
                  : undefined,
              });
            } else {
              throw apiErr;
            }
          }
        }

        const now = new Date().toISOString();
        const jobId = `PJ-${Math.floor(1000 + Math.random() * 9000)}`;
        const pin = `${Math.floor(1000 + Math.random() * 9000)}`;

        const job: PrintJob = {
          id: jobId,
          collectionPin: pin,
          stationId: input.stationId,
          createdAt: now,
          updatedAt: now,
          customer: input.customer,
          files: input.files,
          preferences: input.preferences,
          pricing: input.pricing,
          payment: input.payment,
          status: input.status,
          assignedPrinterId: input.assignedPrinterId,
          progressPercent: 0,
          pagesPrinted: 0,
          totalPagesToPrint: input.totalPagesToPrint,
          estimatedWaitMinutes: input.estimatedWaitMinutes,
          shredStatus: {
            isShredded: false,
            passes: merchantSettings.shredPassCount,
          },
        };

        setJobs((prev) => {
          const next = [...prev, job];
          setPersistedJobs(next);
          return next;
        });

        setCreateJobStatus('success');

        addToast({
          type: 'job_completed',
          title: 'Print Job Created',
          message: `Order ${jobId} added to print queue. Collection PIN: ${pin}`,
          jobId,
          customerName: input.customer.name,
          fileCount: input.files.length,
          duration: 6000,
        });

        return job;
      } catch (err) {
        setCreateJobStatus('error');
        const message =
          err instanceof Error
            ? err.message
            : 'Failed to create print job. Please try again.';
        setCreateJobError(message);
        addToast({
          type: 'error',
          title: 'Job Creation Failed',
          message,
        });
        throw err instanceof Error ? err : new Error(message);
      }
    },
    [
      merchantSettings.shredPassCount,
      validateSubmission,
      setPersistedJobs,
      addToast,
    ]
  );

  const updateJobStatus = useCallback(
    (jobId: string, status: JobStatus) => {
      const now = new Date().toISOString();
      setJobs((prev) => {
        const next = prev.map((j) =>
          j.id === jobId
            ? {
                ...j,
                status,
                updatedAt: now,
                shredStatus:
                  status === 'completed' && merchantSettings.autoShredAfterPrint
                    ? {
                        ...j.shredStatus,
                        isShredded: true,
                        shreddedAt: now,
                      }
                    : j.shredStatus,
              }
            : j
        );
        setPersistedJobs(next);
        return next;
      });

      if (status === 'completed') {
        addToast({
          type: 'shred_success',
          title: 'Job Completed & Shredded',
          message:
            'Your prints are ready for collection. Temporary files have been securely destroyed.',
          jobId,
          passes: merchantSettings.shredPassCount,
        });
      }
    },
    [merchantSettings.autoShredAfterPrint, merchantSettings.shredPassCount, setPersistedJobs, addToast]
  );

  const updateJobProgress = useCallback(
    (jobId: string, progressPercent: number, pagesPrinted: number) => {
      setJobs((prev) => {
        const next = prev.map((j) =>
          j.id === jobId
            ? {
                ...j,
                progressPercent: Math.max(0, Math.min(100, progressPercent)),
                pagesPrinted: Math.max(0, pagesPrinted),
                updatedAt: new Date().toISOString(),
              }
            : j
        );
        setPersistedJobs(next);
        return next;
      });
    },
    [setPersistedJobs]
  );

  const getJobById = useCallback(
    (jobId: string): PrintJob | undefined => {
      return jobs.find((j) => j.id === jobId);
    },
    [jobs]
  );

  const value = useMemo<PrintJobContextValue>(
    () => ({
      merchantSettings,
      pricingSettings,
      printers,
      jobs,
      createJobStatus,
      createJobError,
      apiHealth,
      createJob,
      updateJobStatus,
      updateJobProgress,
      getJobById,
      validateSubmission,
      refreshApiHealth,
      clearCreateJobError,
    }),
    [
      merchantSettings,
      pricingSettings,
      printers,
      jobs,
      createJobStatus,
      createJobError,
      apiHealth,
      createJob,
      updateJobStatus,
      updateJobProgress,
      getJobById,
      validateSubmission,
      refreshApiHealth,
      clearCreateJobError,
    ]
  );

  return (
    <PrintJobContext.Provider value={value}>{children}</PrintJobContext.Provider>
  );
}

export function usePrintJob() {
  const ctx = useContext(PrintJobContext);
  if (!ctx) {
    throw new Error('usePrintJob must be used within PrintJobProvider');
  }
  return ctx;
}
