/**
 * AutoPrint Merchant Desktop Application
 * Operational staff interface for verifying print orders, cash collection,
 * physical document handover, live printer discovery, and payment receiver configuration.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  PrinterDevice,
  PrintJob,
  SpoolerMetrics,
  SpoolerLog,
  DocumentType,
} from './types/printer';
import { spoolerService } from './services/electronBridge';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ActiveQueueView } from './components/ActiveQueueView';
import { StaffVerificationView } from './components/StaffVerificationView';
import { CustomerPaymentScreenModal } from './components/CustomerPaymentScreenModal';
import { PrinterFleetView } from './components/PrinterFleetView';
import { PaymentSettingsView } from './components/PaymentSettingsView';
import { SpoolerTelemetryView } from './components/SpoolerTelemetryView';
import { DocumentPreviewModal } from './components/DocumentPreviewModal';
import { QuickNewJobModal } from './components/QuickNewJobModal';
import { MerchantAuthModal } from './components/auth/MerchantAuthModal';

export default function App() {
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [isOnboarded, setIsOnboarded] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [merchantProfile, setMerchantProfile] = useState<any>(null);

  const [currentView, setCurrentView] = useState<string>('verification');
  const [printers, setPrinters] = useState<PrinterDevice[]>([]);
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [logs, setLogs] = useState<SpoolerLog[]>([]);
  const [metrics, setMetrics] = useState<SpoolerMetrics>({
    activeJobs: 0,
    totalJobsCompleted: 0,
    totalJobsFailed: 0,
    avgLatencyMs: 14,
    totalBytesPrinted: 0,
    isQueuePaused: false,
    uptimeSeconds: 0,
  });

  // Modals
  const [isQuickJobModalOpen, setIsQuickJobModalOpen] = useState<boolean>(false);
  const [previewModal, setPreviewModal] = useState<{
    isOpen: boolean;
    title: string;
    html: string;
    docType: DocumentType;
    activeJob?: PrintJob;
  }>({
    isOpen: false,
    title: '',
    html: '',
    docType: 'receipt',
  });

  // Verify auth session against backend SQLite
  const checkAuth = useCallback(async () => {
    setAuthChecking(true);
    try {
      const token = localStorage.getItem('autoprint_merchant_session_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/merchant/auth/check', { headers });
      const data = await res.json();

      if (data.ok && data.data) {
        setIsOnboarded(data.data.isOnboarded);
        setIsAuthenticated(data.data.isAuthenticated);
        if (data.data.merchant) {
          setMerchantProfile(data.data.merchant);
        }
      }
    } catch (e) {
      console.error('Failed to verify merchant session', e);
    } finally {
      setAuthChecking(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Load spooler jobs and metrics
  const refreshData = useCallback(async () => {
    try {
      const [printersList, jobsList, initialLogs, currentMetrics] = await Promise.all([
        spoolerService.getPrinters(),
        spoolerService.getJobs(),
        spoolerService.getLogs(),
        spoolerService.getMetrics(),
      ]);
      setPrinters(printersList);
      setJobs(jobsList);
      setLogs(initialLogs);
      setMetrics(currentMetrics);
    } catch (e) {
      console.error('Failed to load spooler data', e);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      refreshData();

      const unsubJob = spoolerService.onJobUpdate((updatedJob) => {
        setJobs((prevJobs) => {
          const idx = prevJobs.findIndex((j) => j.id === updatedJob.id);
          if (idx >= 0) {
            const newArr = [...prevJobs];
            newArr[idx] = updatedJob;
            return newArr;
          }
          return [updatedJob, ...prevJobs];
        });
        spoolerService.getMetrics().then(setMetrics);
      });

      const unsubLog = spoolerService.onTelemetryLog((newLog) => {
        setLogs((prev) => [newLog, ...prev.slice(0, 199)]);
      });

      return () => {
        unsubJob();
        unsubLog();
      };
    }
  }, [isAuthenticated, refreshData]);

  // Toggle Online/Offline
  const handleToggleOnline = async () => {
    if (!merchantProfile) return;
    const nextState = !merchantProfile.isOnline;
    try {
      const res = await fetch('/api/merchant/toggle-online', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isOnline: nextState }),
      });
      const data = await res.json();
      if (data.ok) {
        setMerchantProfile((prev: any) => ({ ...prev, isOnline: nextState }));
      }
    } catch (e) {
      console.error('Toggle online error', e);
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('autoprint_merchant_session_token');
    if (token) {
      fetch('/api/merchant/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      }).catch(() => {});
    }
    localStorage.removeItem('autoprint_merchant_session_token');
    setIsAuthenticated(false);
    setMerchantProfile(null);
  };

  const handleAuthenticated = (token: string, merchant: any) => {
    setIsOnboarded(true);
    setIsAuthenticated(true);
    setMerchantProfile(merchant);
  };

  if (authChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900 text-white font-sans">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-slate-300">Loading AutoPrint Merchant Desk...</p>
        </div>
      </div>
    );
  }

  // If not onboarded or not authenticated, present the Auth / Onboarding Gate
  if (!isOnboarded || !isAuthenticated) {
    return (
      <MerchantAuthModal
        isOnboarded={isOnboarded}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans text-slate-900">
      
      {/* Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        metrics={metrics}
        isOnline={Boolean(merchantProfile?.isOnline)}
        merchantName={merchantProfile?.ownerName}
        shopName={merchantProfile?.shopName}
        onToggleOnline={handleToggleOnline}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          metrics={metrics}
          onOpenNewJobModal={() => setIsQuickJobModalOpen(true)}
          defaultPrinter={printers.find((p) => p.isDefault) || printers[0]}
          onTriggerTestPrint={async (printerId, testType) => {
            return spoolerService.triggerTestJob(printerId, testType);
          }}
          onOpenOnboarding={() => {}}
        />

        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          {currentView === 'verification' && <StaffVerificationView />}

          {currentView === 'queue' && (
            <ActiveQueueView
              jobs={jobs}
              printers={printers}
              metrics={metrics}
              onCancelJob={(jobId) => spoolerService.cancelJob(jobId)}
              onRetryJob={(jobId) => spoolerService.retryJob(jobId)}
              onReorderJobs={(jobIds) => spoolerService.reorderQueue(jobIds)}
              onPauseResumeQueue={async () => {
                await spoolerService.pauseQueue(!metrics.isQueuePaused);
                setMetrics((m) => ({ ...m, isQueuePaused: !m.isQueuePaused }));
              }}
              onPurgeCompleted={() => spoolerService.purgeCompletedJobs()}
              onPreviewJobDoc={(job) => {
                setPreviewModal({
                  isOpen: true,
                  title: job.title,
                  html: `<h3>${job.title}</h3><p>Customer: ${job.customerName}</p>`,
                  docType: 'receipt',
                  activeJob: job,
                });
              }}
              onOpenNewJobModal={() => setIsQuickJobModalOpen(true)}
            />
          )}

          {currentView === 'fleet' && <PrinterFleetView />}

          {currentView === 'payment' && <PaymentSettingsView />}

          {currentView === 'telemetry' && (
            <SpoolerTelemetryView
              logs={logs}
              metrics={metrics}
              onClearLogs={() => spoolerService.clearLogs()}
            />
          )}
        </div>
      </main>

      {/* Modals */}
      <QuickNewJobModal
        isOpen={isQuickJobModalOpen}
        onClose={() => setIsQuickJobModalOpen(false)}
        printers={printers}
        onSubmitJob={async (jobData) => {
          const created = await spoolerService.submitPrintJob(jobData);
          setJobs((prev) => [created, ...prev]);
          setIsQuickJobModalOpen(false);
          return created;
        }}
      />

      <DocumentPreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal((prev) => ({ ...prev, isOpen: false }))}
        title={previewModal.title}
        html={previewModal.html}
        docType={previewModal.docType}
        activeJob={previewModal.activeJob}
      />
    </div>
  );
}
