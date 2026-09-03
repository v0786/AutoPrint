/**
 * AutoPrint Merchant Desktop Application
 * Operational print shop console for pickup verification, cash collection,
 * physical document handover, live printer discovery, queue management, and diagnostics.
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
import { verificationService } from './services/verificationService';
import { CollectionVerificationRecord } from './types/verification';

// Core Navigation & Layout
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';

// Primary Operational Views
import { DashboardView } from './components/DashboardView';
import { StaffVerificationView } from './components/StaffVerificationView';
import { ActiveQueueView } from './components/ActiveQueueView';
import { PrinterFleetView } from './components/PrinterFleetView';
import { ActivityHistoryView } from './components/ActivityHistoryView';
import { SystemDiagnosticsView } from './components/SystemDiagnosticsView';
import { SettingsView } from './components/SettingsView';

// Modals & Auth
import { DocumentPreviewModal } from './components/DocumentPreviewModal';
import { QuickNewJobModal } from './components/QuickNewJobModal';
import { MerchantAuthModal } from './components/auth/MerchantAuthModal';
import { apiFetch } from './utils/api';

export default function App() {
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [isOnboarded, setIsOnboarded] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [merchantProfile, setMerchantProfile] = useState<any>(null);

  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [printers, setPrinters] = useState<PrinterDevice[]>([]);
  const [jobs, setJobs] = useState<PrintJob[]>([]);
  const [logs, setLogs] = useState<SpoolerLog[]>([]);
  const [verificationRecords, setVerificationRecords] = useState<CollectionVerificationRecord[]>([]);
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

      const res = await apiFetch('/api/merchant/auth/check', { headers });
      const data = await res.json();

      if (data.ok && data.data) {
        setIsOnboarded(Boolean(data.data.isOnboarded));
        setIsAuthenticated(Boolean(data.data.isAuthenticated));
        if (data.data.merchant) {
          setMerchantProfile(data.data.merchant);
        }
      } else {
        setIsOnboarded(true);
        setIsAuthenticated(false);
      }
    } catch (e) {
      console.warn('Backend session check returned fallback:', e);
      setIsOnboarded(true);
      setIsAuthenticated(false);
    } finally {
      setAuthChecking(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Load spooler jobs and metrics with defensive fallbacks
  const refreshData = useCallback(async () => {
    try {
      const [printersList, jobsList, initialLogs, currentMetrics] = await Promise.all([
        spoolerService.getPrinters().catch(() => []),
        spoolerService.getJobs().catch(() => []),
        spoolerService.getLogs().catch(() => []),
        spoolerService.getMetrics().catch(() => ({
          activeJobs: 0,
          totalJobsCompleted: 0,
          totalJobsFailed: 0,
          avgLatencyMs: 14,
          totalBytesPrinted: 0,
          isQueuePaused: false,
          uptimeSeconds: 0,
        })),
      ]);
      setPrinters(printersList || []);
      setJobs(jobsList || []);
      setLogs(initialLogs || []);
      if (currentMetrics) setMetrics(currentMetrics);
      try {
        setVerificationRecords(verificationService.getAllRecords() || []);
      } catch {
        setVerificationRecords([]);
      }
    } catch (e) {
      console.warn('Failed to load spooler data:', e);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      refreshData();

      const unsubJob = spoolerService.onJobUpdate((updatedJob) => {
        if (!updatedJob) return;
        setJobs((prevJobs) => {
          const idx = prevJobs.findIndex((j) => j.id === updatedJob.id);
          if (idx >= 0) {
            const newArr = [...prevJobs];
            newArr[idx] = updatedJob;
            return newArr;
          }
          return [updatedJob, ...prevJobs];
        });
        spoolerService.getMetrics().then((m) => m && setMetrics(m)).catch(() => {});
      });

      const unsubLog = spoolerService.onTelemetryLog((newLog) => {
        if (newLog) {
          setLogs((prev) => [newLog, ...prev.slice(0, 199)]);
        }
      });

      const unsubVerification = verificationService.subscribe((records) => {
        if (Array.isArray(records)) {
          setVerificationRecords(records);
        }
      });

      return () => {
        try {
          unsubJob();
          unsubLog();
          unsubVerification();
        } catch {}
      };
    }
  }, [isAuthenticated, refreshData]);

  // Toggle Online/Offline
  const handleToggleOnline = async () => {
    if (!merchantProfile) return;
    const nextState = !merchantProfile.isOnline;
    try {
      const res = await apiFetch('/api/merchant/toggle-online', {
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

  const handlePauseResumeQueue = async () => {
    try {
      await spoolerService.pauseQueue(!metrics.isQueuePaused);
      setMetrics((m) => ({ ...m, isQueuePaused: !m.isQueuePaused }));
    } catch (e) {
      console.error('Pause/resume queue error', e);
    }
  };

  const handleLogout = async () => {
    const token = localStorage.getItem('autoprint_merchant_session_token');
    if (token) {
      apiFetch('/api/merchant/auth/logout', {
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
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0e] text-white font-sans">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-zinc-300">Loading AutoPrint Merchant Station...</p>
        </div>
      </div>
    );
  }

  // If not onboarded or not authenticated, present the Auth Gate
  if (!isOnboarded || !isAuthenticated) {
    return (
      <MerchantAuthModal
        isOnboarded={isOnboarded}
        onAuthenticated={handleAuthenticated}
      />
    );
  }

  return (
    <div className="flex h-screen bg-[#0d0e12] overflow-hidden font-sans text-white">
      {/* Sidebar Primary Navigation */}
      <Sidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        metrics={metrics}
        isOnline={Boolean(merchantProfile?.isOnline)}
        merchantName={merchantProfile?.ownerName}
        username={merchantProfile?.username}
        userRole={merchantProfile?.role || 'staff'}
        shopName={merchantProfile?.shopName}
        onToggleOnline={handleToggleOnline}
        onLogout={handleLogout}
      />

      {/* Main Operational Stage */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#0d0e12]">
        {/* Global Operational Header */}
        <Header
          currentView={currentView}
          isOnline={Boolean(merchantProfile?.isOnline)}
          userRole={merchantProfile?.role || 'staff'}
          username={merchantProfile?.username}
          ownerName={merchantProfile?.ownerName}
          shopName={merchantProfile?.shopName}
          printers={printers}
          metrics={metrics}
          onToggleOnline={handleToggleOnline}
          onLogout={handleLogout}
          onSelectView={setCurrentView}
        />

        {/* Scrollable View Container */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8">
          {/* VIEW 1: Dashboard Overview */}
          {currentView === 'dashboard' && (
            <DashboardView
              metrics={metrics}
              jobs={jobs}
              printers={printers}
              verificationRecords={verificationRecords}
              isOnline={Boolean(merchantProfile?.isOnline)}
              onSelectView={setCurrentView}
              onToggleOnline={handleToggleOnline}
              onPauseResumeQueue={handlePauseResumeQueue}
            />
          )}

          {/* VIEW 2: Verification Desk */}
          {currentView === 'verification' && (
            <StaffVerificationView
              staffName={merchantProfile?.ownerName || 'Staff Operator'}
            />
          )}

          {/* VIEW 3: Active Print Queue */}
          {currentView === 'queue' && (
            <ActiveQueueView
              jobs={jobs}
              printers={printers}
              metrics={metrics}
              onCancelJob={(jobId) => spoolerService.cancelJob(jobId)}
              onRetryJob={(jobId) => spoolerService.retryJob(jobId)}
              onReorderJobs={(jobIds) => spoolerService.reorderQueue(jobIds)}
              onPauseResumeQueue={handlePauseResumeQueue}
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

          {/* VIEW 4: Printers Fleet */}
          {currentView === 'fleet' && <PrinterFleetView />}

          {/* VIEW 5: Activity & History */}
          {currentView === 'history' && <ActivityHistoryView />}

          {/* VIEW 6: System Diagnostics */}
          {currentView === 'diagnostics' && (
            <SystemDiagnosticsView
              logs={logs}
              metrics={metrics}
              printers={printers}
              onClearLogs={() => spoolerService.clearLogs()}
            />
          )}

          {/* VIEW 7: Consolidated Settings */}
          {currentView === 'settings' && (
            <SettingsView
              userRole={merchantProfile?.role || 'staff'}
              currentUserId={merchantProfile?.id}
              isOnline={Boolean(merchantProfile?.isOnline)}
              onToggleOnline={handleToggleOnline}
              onProfileUpdated={(updated) => {
                setMerchantProfile((prev: any) => ({ ...prev, ...updated }));
              }}
            />
          )}
        </div>
      </main>

      {/* Quick Job Submission Modal */}
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

      {/* Document Preview Modal */}
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
