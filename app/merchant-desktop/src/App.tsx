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
import { PaymentReconciliationView } from './components/PaymentReconciliationView';
import { RefundManagementView } from './components/RefundManagementView';
import { HelpSupportView } from './components/HelpSupportView';
import { FeedbackIntelligenceView } from './components/FeedbackIntelligenceView';

// Modals & Auth
import { DocumentPreviewModal } from './components/DocumentPreviewModal';
import { QuickNewJobModal } from './components/QuickNewJobModal';
import { MerchantAuthModal } from './components/auth/MerchantAuthModal';
import { FirstRunOnboarding } from './components/auth/FirstRunOnboarding';
import { apiFetch } from './utils/api';
import { useAuth } from './context/AuthContext';

export default function App() {
  const auth = useAuth();
  const [authChecking, setAuthChecking] = useState<boolean>(true);
  const [hasUsers, setHasUsers] = useState<boolean>(true);
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
  const [cloudStatus, setCloudStatus] = useState<'ONLINE' | 'OFFLINE' | 'CONNECTING'>('OFFLINE');
  const [isLocalOperational, setIsLocalOperational] = useState<boolean>(true);

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

  // Synchronize Cloud Auth State when Supabase is enabled
  useEffect(() => {
    if (auth.isCloudAuthEnabled) {
      if (auth.isAuthenticated && auth.user) {
        setIsAuthenticated(true);
        setIsOnboarded(true);
        setMerchantProfile({
          ownerName: auth.profile?.full_name || auth.user.email?.split('@')[0] || 'Merchant Owner',
          username: auth.user.email || 'merchant',
          role: auth.memberRole || 'merchant_owner',
          shopName: auth.activeStore?.name || auth.activeMerchant?.business_name || 'AutoPrint Cloud Station',
          isOnline: true,
        });
        setCloudStatus('ONLINE');
      } else if (!auth.isLoading) {
        setIsAuthenticated(false);
        setMerchantProfile(null);
        setCloudStatus('OFFLINE');
      }
    }
  }, [
    auth.isCloudAuthEnabled,
    auth.isAuthenticated,
    auth.isLoading,
    auth.user,
    auth.profile,
    auth.activeMerchant,
    auth.activeStore,
    auth.memberRole,
  ]);

  // Verify auth session against backend SQLite (when Cloud Auth is disabled)
  const checkAuth = useCallback(async () => {
    if (auth.isCloudAuthEnabled) {
      setAuthChecking(false);
      return;
    }
    setAuthChecking(true);
    try {
      // 1. Authoritative check: Does SQLite have at least one merchant user?
      let systemHasUsers = true;
      try {
        const setupRes = await apiFetch('/api/setup/status');
        if (setupRes.ok) {
          const setupData = await setupRes.json();
          systemHasUsers = Boolean(setupData.hasUsers);
        }
      } catch (err) {
        console.warn('Setup status check unreachable, assuming existing users:', err);
      }
      setHasUsers(systemHasUsers);

      // If this is a fresh installation with zero users, present First-Run Onboarding
      if (!systemHasUsers) {
        setIsOnboarded(false);
        setIsAuthenticated(false);
        return;
      }

      // 2. Normal Flow: Verify existing session token if available
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
  }, [auth.isCloudAuthEnabled]);

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

      // Check cloud & local health status independently
      apiFetch('/api/cloud/status')
        .then((res) => res.json())
        .then((data) => {
          if (data && data.ok) {
            if (data.status === 'ONLINE' || data.mode === 'HYBRID') {
              setCloudStatus('ONLINE');
            } else if (data.status === 'CONNECTING') {
              setCloudStatus('CONNECTING');
            } else {
              setCloudStatus('OFFLINE');
            }
          } else {
            setCloudStatus('OFFLINE');
          }
        })
        .catch(() => setCloudStatus('OFFLINE'));

      apiFetch('/api/health')
        .then((res) => res.json())
        .then((data) => {
          setIsLocalOperational(Boolean(data && data.ok));
        })
        .catch(() => setIsLocalOperational(false));
    } catch (e) {
      console.warn('Failed to load spooler data:', e);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      refreshData();

      // Real-time 2-second polling to ensure all newly paid jobs & state changes appear immediately
      const pollTimer = setInterval(() => {
        refreshData();
      }, 2000);

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
        clearInterval(pollTimer);
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
    if (auth.isCloudAuthEnabled) {
      await auth.signOut();
    }
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

  if (auth.isCloudAuthEnabled ? auth.isLoading : authChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0e] text-white font-sans">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-bold text-zinc-300">Loading AutoPrint Merchant Station...</p>
        </div>
      </div>
    );
  }

  // 1. Fresh Installation: Present First-Run Onboarding Wizard (only for local SQLite mode)
  if (!auth.isCloudAuthEnabled && !hasUsers) {
    return (
      <FirstRunOnboarding
        onSetupComplete={(token, merchant) => {
          localStorage.setItem('autoprint_merchant_session_token', token);
          setHasUsers(true);
          setIsOnboarded(true);
          setIsAuthenticated(true);
          setMerchantProfile(merchant);
        }}
        onGoToLogin={() => {
          setHasUsers(true);
          checkAuth();
        }}
      />
    );
  }

  // 2. Normal Flow: Present Authentication Modal if not authenticated
  if (!isAuthenticated) {
    return (
      <MerchantAuthModal
        isOnboarded={true}
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
          cloudStatus={cloudStatus}
          isLocalOperational={isLocalOperational}
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
              onRefreshQueue={refreshData}
            />
          )}

          {/* VIEW 4: Payment Reconciliation */}
          {currentView === 'reconciliation' && (
            <PaymentReconciliationView
              jobs={jobs}
              onRefresh={refreshData}
              onNavigateToSupport={() => setCurrentView('support')}
              onNavigateToRefunds={() => setCurrentView('refunds')}
            />
          )}

          {/* VIEW 5: Refund Management */}
          {currentView === 'refunds' && (
            <RefundManagementView
              jobs={jobs}
              onRefreshJobs={refreshData}
            />
          )}

          {/* VIEW 6: Feedback Intelligence */}
          {currentView === 'feedback' && (
            <FeedbackIntelligenceView />
          )}

          {/* VIEW 7: Help & Support */}
          {currentView === 'support' && (
            <HelpSupportView />
          )}

          {/* VIEW 8: Printers Fleet */}
          {currentView === 'fleet' && <PrinterFleetView />}

          {/* VIEW 9: Activity & History */}
          {currentView === 'history' && <ActivityHistoryView />}

          {/* VIEW 10: System Diagnostics */}
          {currentView === 'diagnostics' && (
            <SystemDiagnosticsView
              logs={logs}
              metrics={metrics}
              printers={printers}
              onClearLogs={() => spoolerService.clearLogs()}
            />
          )}

          {/* VIEW 11: Consolidated Settings */}
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
