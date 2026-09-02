'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { usePrintJob } from '@/context/PrintJobContext';
import { FileUploadArea } from './FileUploadArea';
import { PrintPreferencesForm } from './PrintPreferencesForm';
import { PriceBreakdownCard } from './PriceBreakdownCard';
import { PaymentModal } from './PaymentModal';
import { JobTrackerCard } from './JobTrackerCard';
import { Header } from '@/components/common/Header';
import { Button } from '@/components/common/Button';
import { Badge } from '@/components/common/Badge';
import { AlertCircle, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { calculatePricing } from '@/utils/pricingCalculator';
import type {
  UploadedFileItem,
  PrintPreferences,
  CustomerInfo,
  PaymentMethod,
} from '@/types';

const DEFAULT_PREFERENCES: PrintPreferences = {
  colorMode: 'bw',
  paperSize: 'A4',
  sidedness: 'double_long',
  orientation: 'portrait',
  pageRange: 'All',
  copies: 1,
  paperFinish: 'standard_80gsm',
  binding: 'none',
  customNotes: '',
};

const STEP_LABELS = [
  { id: 1, label: 'Upload Documents' },
  { id: 2, label: 'Print Configuration' },
  { id: 3, label: 'Review & Checkout' },
];

export const CustomerView: React.FC = () => {
  const {
    merchantSettings,
    pricingSettings,
    printers,
    jobs,
    createJob,
    createJobStatus,
    createJobError,
    apiHealth,
    refreshApiHealth,
    clearCreateJobError,
  } = usePrintJob();

  const [selectedStation, setSelectedStation] = useState(
    merchantSettings.activeStationId
  );
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFileItem[]>([]);
  const [preferences, setPreferences] = useState<PrintPreferences>(
    DEFAULT_PREFERENCES
  );
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  useEffect(() => {
    void refreshApiHealth();
    const interval = setInterval(() => {
      void refreshApiHealth();
    }, 30000);
    return () => clearInterval(interval);
  }, [refreshApiHealth]);

  useEffect(() => {
    if (createJobError) {
      const timer = setTimeout(clearCreateJobError, 8000);
      return () => clearTimeout(timer);
    }
  }, [createJobError, clearCreateJobError]);

  const totalOriginalPages = useMemo(
    () => uploadedFiles.reduce((acc, f) => acc + f.pageCount, 0),
    [uploadedFiles]
  );

  const pricing = useMemo(
    () =>
      calculatePricing(
        Math.max(1, totalOriginalPages || 1),
        preferences,
        pricingSettings
      ),
    [totalOriginalPages, preferences, pricingSettings]
  );

  const currentActiveJob = useMemo(
    () => (activeJobId ? jobs.find((j) => j.id === activeJobId) ?? null : null),
    [activeJobId, jobs]
  );

  const currentStep = useMemo(() => {
    if (uploadedFiles.length === 0) return 1;
    return 2;
  }, [uploadedFiles]);

  const handlePaymentSuccess = useCallback(
    async (
      customer: CustomerInfo,
      paymentMethod: PaymentMethod,
      txnId: string
    ) => {
      setIsCheckoutOpen(false);

      const defaultPrinter =
        printers.find((p) => p.isDefault) ?? printers[0];

      try {
        const newJob = await createJob({
          stationId: selectedStation,
          customer,
          files: uploadedFiles,
          preferences,
          pricing,
          payment: {
            method: paymentMethod,
            status: 'completed',
            transactionId: txnId,
            paidAt: new Date().toISOString(),
            amount: pricing.total,
          },
          status: 'received_local',
          assignedPrinterId: defaultPrinter?.id ?? 'prn-01',
          totalPagesToPrint: pricing.totalPages,
          estimatedWaitMinutes: Math.max(
            1,
            Math.ceil(pricing.totalPages / 20)
          ),
        });

        setActiveJobId(newJob.id);
      } catch {
        setIsCheckoutOpen(true);
      }
    },
    [
      printers,
      selectedStation,
      uploadedFiles,
      preferences,
      pricing,
      createJob,
    ]
  );

  const handleResetForNewJob = useCallback(() => {
    setActiveJobId(null);
    setUploadedFiles([]);
    setPreferences(DEFAULT_PREFERENCES);
    clearCreateJobError();
  }, [clearCreateJobError]);

  if (currentActiveJob) {
    return (
      <main
        id="main-content"
        className="py-6 px-4 sm:px-6 lg:px-8 min-h-screen"
      >
        <div className="max-w-xl mx-auto">
          <JobTrackerCard job={currentActiveJob} onReset={handleResetForNewJob} />
        </div>
      </main>
    );
  }

  return (
    <main
      id="main-content"
      className="py-6 px-4 sm:px-6 lg:px-8 min-h-screen"
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <nav
          aria-label="Connection status"
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            {apiHealth.ok ? (
              <Badge variant="success" size="sm" className="gap-1.5">
                <Wifi className="w-3 h-3" aria-hidden="true" />
                <span>Store PC Connected</span>
                {apiHealth.lastChecked && (
                  <span className="text-[9px] opacity-70">
                    ({apiHealth.latencyMs}ms)
                  </span>
                )}
              </Badge>
            ) : (
              <Badge variant="warning" size="sm" className="gap-1.5">
                <WifiOff className="w-3 h-3" aria-hidden="true" />
                <span>Offline Mode — Files stored locally</span>
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void refreshApiHealth()}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            aria-label="Refresh connection status"
          >
            Refresh
          </Button>
        </nav>

        <Header
          merchantSettings={merchantSettings}
          activeStationId={selectedStation}
          onStationChange={setSelectedStation}
        />

        <nav aria-label="Print workflow progress" className="mt-4">
          <ol
            role="list"
            className="flex items-center justify-between gap-2 bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700"
          >
            {STEP_LABELS.map((step, idx) => {
              const isActive = step.id <= currentStep;
              const isCurrent = step.id === currentStep;
              return (
                <li key={step.id} className="flex items-center gap-2 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      aria-hidden="true"
                      className={[
                        'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors',
                        isCurrent
                          ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-900/50'
                          : isActive
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400',
                      ].join(' ')}
                    >
                      {step.id}
                    </span>
                    <span
                      className={[
                        'text-xs font-semibold truncate',
                        isActive
                          ? 'text-slate-800 dark:text-slate-100'
                          : 'text-slate-400 dark:text-slate-500',
                      ].join(' ')}
                    >
                      {step.label}
                    </span>
                  </div>
                  {idx < STEP_LABELS.length - 1 && (
                    <div
                      className="flex-1 h-0.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-2 hidden sm:block"
                      aria-hidden="true"
                    />
                  )}
                </li>
              );
            })}
          </ol>
        </nav>

        {createJobError && (
          <div
            role="alert"
            className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 rounded-xl"
          >
            <AlertCircle
              className="w-5 h-5 text-red-500 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-red-800 dark:text-red-200">
                Could not submit print order
              </p>
              <p className="text-xs text-red-600 dark:text-red-300 mt-0.5">
                {createJobError}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearCreateJobError}
              aria-label="Dismiss error"
            >
              Dismiss
            </Button>
          </div>
        )}

        <section aria-labelledby="upload-heading" className="space-y-2">
          <div className="flex items-center justify-between">
            <h2
              id="upload-heading"
              className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"
            >
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">
                1
              </span>
              <span>Upload Document(s)</span>
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              PDF, Word, Images up to 100MB
            </span>
          </div>

          <FileUploadArea
            files={uploadedFiles}
            onFilesChange={setUploadedFiles}
            maxFiles={5}
            ariaDescribedBy="upload-heading"
          />
        </section>

        {uploadedFiles.length > 0 && (
          <section
            aria-labelledby="preferences-heading"
            className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300"
          >
            <h2
              id="preferences-heading"
              className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"
            >
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">
                2
              </span>
              <span>Configure Print Preferences</span>
            </h2>

            <PrintPreferencesForm
              preferences={preferences}
              onChange={setPreferences}
              pricingSettings={pricingSettings}
              totalOriginalPages={totalOriginalPages}
            />
          </section>
        )}

        {uploadedFiles.length > 0 && (
          <section
            aria-labelledby="review-heading"
            className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300"
          >
            <h2
              id="review-heading"
              className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2"
            >
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">
                3
              </span>
              <span>Review Quote &amp; Submit</span>
            </h2>

            <PriceBreakdownCard
              pricing={pricing}
              pricingSettings={pricingSettings}
              onProceedToCheckout={() => setIsCheckoutOpen(true)}
              disabled={uploadedFiles.length === 0 || createJobStatus === 'loading'}
              isLoading={createJobStatus === 'loading'}
            />
          </section>
        )}

        <footer className="pt-4 pb-8 text-center">
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {merchantSettings.storeName} &middot; {merchantSettings.address}
            {' '}&middot; {merchantSettings.supportPhone}
          </p>
          <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-1">
            All files transferred via encrypted direct connection. Never stored in the cloud.
          </p>
        </footer>
      </div>

      <PaymentModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        pricing={pricing}
        files={uploadedFiles}
        onPaymentSuccess={handlePaymentSuccess}
      />
    </main>
  );
};
