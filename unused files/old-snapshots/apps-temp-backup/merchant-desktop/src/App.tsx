/**
 * AutoPrint Merchant Desktop Application
 *
 * Purpose:
 *   Staff interface for verifying print orders, handling payment,
 *   and confirming document handover to customers.
 *   Runs as Electron app on Windows for desktop usage.
 *
 * Key Views:
 *   1. Active Queue
 *      ├─ List all pending print jobs
 *      └─ Shows job details, customer name, amount
 *
 *   2. Staff Verification (PRIMARY VIEW)
 *      ├─ Search by 8-digit code
 *      ├─ Display payment status (UPI_SUCCESS, CASH_REQUIRED, CASH_LOCKED)
 *      ├─ Open cash collection dialog if needed
 *      ├─ Calculate change due
 *      └─ Confirm handover
 *
 *   3. Printer Fleet
 *      ├─ View connected printers
 *      └─ Printer status & metrics
 *
 *   4. Telemetry
 *      ├─ Queue metrics
 *      └─ System performance
 *
 *   5. Job Dispatch Studio
 *      └─ Advanced job management
 *
 * Workflow (Staff Perspective):
 *   1. Customer arrives with printed document
 *   2. Customer shows 8-digit verification code
 *   3. Staff enters code in "Staff Verification" view
 *   4. System displays:
 *      ├─ Job details (document, amount, color mode, copies)
 *      └─ Payment status
 *   5. If UPI_SUCCESS:
 *      └─ Click "Confirm Handover" → prints released
 *   6. If CASH_REQUIRED or CASH_LOCKED:
 *      ├─ Cash dialog opens
 *      ├─ Staff enters cash tendered amount
 *      ├─ System calculates change
 *      └─ Click "Confirm Handover" → prints released
 *
 * Data Flow:
 *   1. Staff enters code → GET /api/verification/lookup/:code
 *   2. Display record details from response
 *   3. If cash needed → POST /api/verification/collect-cash
 *   4. Confirm handover → POST /api/verification/handover
 *   5. View audit logs → GET /api/verification/audit-logs?code=...
 *
 * Technology:
 *   - Electron (desktop app runtime)
 *   - React 19 + TypeScript
 *   - Vite
 *   - TailwindCSS
 *
 * Environment:
 *   API Target: http://localhost:5000
 *   Port: 5000 (Electron app + frontend server)
 *
 * Build:
 *   npm run dev      # Development
 *   npm run build    # Production Electron build
 *
 * State Management:
 *   - Local React state for UI
 *   - HTTP calls to backend for persistent data
 *   - Real-time subscriptions via verificationService
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  PrinterDevice,
  PrintJob,
  SpoolerMetrics,
  SpoolerLog,
  DocumentType,
  PrinterStatus,
} from './types/printer';
import { spoolerService } from './services/electronBridge';
import {
  renderReceiptHtml,
  renderLabelHtml,
  renderInvoiceHtml,
  renderReportHtml,
} from './utils/documentTemplates';

import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ActiveQueueView } from './components/ActiveQueueView';
import { JobDispatchStudio } from './components/JobDispatchStudio';
import { StaffVerificationView } from './components/StaffVerificationView';
import { CustomerPaymentScreenModal } from './components/CustomerPaymentScreenModal';
import { PrinterFleetView } from './components/PrinterFleetView';
import { SpoolerTelemetryView } from './components/SpoolerTelemetryView';
import { ArchitectureInspectorView } from './components/ArchitectureInspectorView';
import { DocumentPreviewModal } from './components/DocumentPreviewModal';
import { QuickNewJobModal } from './components/QuickNewJobModal';
import { OnboardingWizard } from './components/onboarding/OnboardingWizard';
import { localPersistenceService } from './services/localPersistenceService';
import { verificationService } from './services/verificationService';
import { CollectionVerificationRecord } from './types/verification';

export default function App() {
  const [isOnboardingActive, setIsOnboardingActive] = useState<boolean>(() => {
    // Check if onboarding was previously completed in local storage
    return !localPersistenceService.isOnboardingCompleted();
  });

  const [currentView, setCurrentView] = useState<string>('queue');
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

  // Modal states
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

  // Load initial printer and job state
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
    refreshData();

    // Subscribe to Spooler Event Stream
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

      // Update metrics
      spoolerService.getMetrics().then(setMetrics);
    });

    const unsubPrinter = spoolerService.onPrinterStatusUpdate((updatedPrinter) => {
      setPrinters((prev) =>
        prev.map((p) => (p.id === updatedPrinter.id ? updatedPrinter : p))
      );
    });

    const unsubLog = spoolerService.onTelemetryLog((newLog) => {
      setLogs((prev) => [newLog, ...prev.slice(0, 199)]);
    });

    const unsubQueue = spoolerService.onQueueStateChange((isPaused) => {
      setMetrics((m) => ({ ...m, isQueuePaused: isPaused }));
    });

    return () => {
      unsubJob();
      unsubPrinter();
      unsubLog();
      unsubQueue();
    };
  }, [refreshData]);

  // Handler: Toggle pause/resume queue
  const handleTogglePause = async () => {
    const newPausedState = !metrics.isQueuePaused;
    await spoolerService.pauseQueue(newPausedState);
    setMetrics((m) => ({ ...m, isQueuePaused: newPausedState }));
  };

  // Handler: Cancel / Delete Job
  const handleCancelJob = async (jobId: string) => {
    await spoolerService.cancelJob(jobId);
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
    const newMetrics = await spoolerService.getMetrics();
    setMetrics(newMetrics);
  };

  // Handler: Retry Failed Job
  const handleRetryJob = async (jobId: string) => {
    const updated = await spoolerService.retryJob(jobId);
    if (updated) {
      setJobs((prev) => prev.map((j) => (j.id === jobId ? updated : j)));
    }
  };

  // Handler: Reorder Queue
  const handleReorderJobs = async (jobIds: string[]) => {
    const reordered = await spoolerService.reorderQueue(jobIds);
    setJobs(reordered);
  };

  // Handler: Purge Completed / Failed History
  const handlePurgeCompleted = async () => {
    await spoolerService.purgeCompletedJobs();
    const currentJobs = await spoolerService.getJobs();
    setJobs(currentJobs);
  };

  // Handler: Submit new Job from Studio or Modal
  const handleSubmitJob = async (jobData: any): Promise<PrintJob> => {
    const createdJob = await spoolerService.submitPrintJob(jobData);
    setJobs((prev) => [createdJob, ...prev]);
    const newMetrics = await spoolerService.getMetrics();
    setMetrics(newMetrics);
    return createdJob;
  };

  // Handler: Instant Fast AutoPrint Receipt (1-click merchant test)
  const handleTriggerFastReceipt = async () => {
    const defaultPrinter = printers.find((p) => p.isDefault) || printers[0];
    const orderNo = `ORD-${Math.floor(Math.random() * 9000 + 1000)}`;
    const fastReceiptData = {
      merchantName: 'BLUE HARBOR ARTISAN ROASTERY',
      storeAddress: '742 Evergreen Terrace, Seattle, WA',
      phone: '(206) 555-0194',
      taxId: 'WA-992019-A',
      cashier: 'Quick Station (Register 1)',
      registerId: 'REG-01',
      orderNumber: orderNo,
      orderType: 'Takeout',
      date: new Date().toLocaleString(),
      items: [
        { id: '1', name: 'Nitro Cold Brew (Venti)', qty: 1, unitPrice: 5.75, options: 'Sweet cream cap' },
        { id: '2', name: 'Fresh Blueberry Danish', qty: 1, unitPrice: 4.25 },
      ],
      subtotal: 10.0,
      tax: 1.0,
      discount: 0,
      total: 11.0,
      paymentMethod: 'Apple Pay Contactless',
      cardLast4: '7102',
      barcodeValue: `BH-${orderNo}`,
      footerMessage: 'Thank you for your visit! Follow us @blueharbor',
      autoCut: true,
      openDrawer: true,
    };

    await handleSubmitJob({
      title: `Quick AutoPrint Receipt - ${orderNo}`,
      documentType: 'receipt',
      printerId: defaultPrinter ? defaultPrinter.id : 'printer-pos-80',
      printerName: defaultPrinter ? defaultPrinter.displayName : 'Thermal Receipt 80mm',
      priority: 'rush',
      copies: 1,
      totalPages: 1,
      bytesTotal: 3800,
      content: { receiptData: fastReceiptData },
      silentPrint: true,
    });
  };

  // Handler: Diagnostic Self-Print
  const handleTriggerTestPrint = async (
    printerId: string,
    testType: 'diagnostic' | 'alignment' | 'density' | 'receipt'
  ): Promise<PrintJob> => {
    const job = await spoolerService.triggerTestPrint(printerId, testType);
    setJobs((prev) => [job, ...prev]);
    return job;
  };

  // Handler: Set Printer Status & Fault simulation
  const handleSetPrinterStatus = async (
    printerId: string,
    status: PrinterStatus,
    faultDetails?: { paperLevel?: number; tonerLevel?: number }
  ) => {
    const ok = await spoolerService.setPrinterStatus(printerId, status, faultDetails);
    const updatedPrinters = await spoolerService.getPrinters();
    setPrinters(updatedPrinters);
    return ok;
  };

  // Handler: Render and open preview for existing job
  const handlePreviewDocument = (job: PrintJob) => {
    let html = '';
    if (job.content?.receiptData) {
      html = renderReceiptHtml(job.content.receiptData);
    } else if (job.content?.labelData) {
      html = renderLabelHtml(job.content.labelData);
    } else if (job.content?.invoiceData) {
      html = renderInvoiceHtml(job.content.invoiceData);
    } else if (job.content?.reportData) {
      html = renderReportHtml(job.content.reportData);
    } else if (job.content?.rawEscPos) {
      html = `<pre style="font-family: monospace; padding: 20px; white-space: pre-wrap;">${job.content.rawEscPos}</pre>`;
    } else {
      html = `<div style="padding: 30px; font-family: sans-serif;"><h2>${job.title}</h2><p>Job #${job.jobNo} • ${job.printerName}</p></div>`;
    }

    setPreviewModal({
      isOpen: true,
      title: job.title,
      html,
      docType: job.documentType,
      activeJob: job,
    });
  };

  // Handler: Open custom HTML preview from Studio
  const handlePreviewHtml = (title: string, html: string, docType: DocumentType) => {
    setPreviewModal({
      isOpen: true,
      title,
      html,
      docType,
    });
  };

  // Handler: Physical OS print popup
  const handleExecutePhysicalPrint = (job?: PrintJob) => {
    const targetJob = job || previewModal.activeJob;
    let html = previewModal.html;

    if (targetJob && !html) {
      if (targetJob.content?.receiptData) {
        html = renderReceiptHtml(targetJob.content.receiptData);
      } else if (targetJob.content?.labelData) {
        html = renderLabelHtml(targetJob.content.labelData);
      } else if (targetJob.content?.invoiceData) {
        html = renderInvoiceHtml(targetJob.content.invoiceData);
      }
    }

    const printWin = window.open('', '_blank', 'width=700,height=900');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(html || '<h3>Document Ready for Print</h3>');
      printWin.document.close();
      setTimeout(() => {
        printWin.focus();
        printWin.print();
      }, 300);
    }
  };

  const defaultPrinter = printers.find((p) => p.isDefault) || printers[0];

  // If onboarding is active (first run or triggered by user), render the full-screen onboarding wizard
  if (isOnboardingActive) {
    return (
      <OnboardingWizard
        onComplete={() => {
          setIsOnboardingActive(false);
          refreshData();
        }}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen bg-[#F0F5FA] text-slate-800 font-sans overflow-hidden antialiased selection:bg-blue-200 selection:text-blue-950">
      {/* Left Navigation Sidebar */}
      <Sidebar
        currentView={currentView}
        onSelectView={setCurrentView}
        metrics={metrics}
        defaultPrinter={defaultPrinter}
        onPauseResumeQueue={handleTogglePause}
        onPurgeCompleted={handlePurgeCompleted}
        onOpenNewJobModal={() => setIsQuickJobModalOpen(true)}
        onOpenOnboarding={() => setIsOnboardingActive(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto h-screen p-6 sm:p-8">
        <div className="max-w-7xl w-full mx-auto pb-12">
          {/* Header Bar */}
          <Header
            currentView={currentView}
            metrics={metrics}
            onPauseResume={handleTogglePause}
            onOpenNewJobModal={() => setIsQuickJobModalOpen(true)}
            onTriggerFastReceipt={handleTriggerFastReceipt}
            defaultPrinter={defaultPrinter}
          />

          {/* Dynamic Main View */}
          {currentView === 'verification' && (
            <StaffVerificationView
              onOpenDocumentPreview={(jobId) => {
                const targetJob = jobs.find((j) => j.id === jobId);
                if (targetJob) handlePreviewDocument(targetJob);
              }}
            />
          )}

          {currentView === 'queue' && (
            <ActiveQueueView
              jobs={jobs}
              printers={printers}
              onCancelJob={handleCancelJob}
              onRetryJob={handleRetryJob}
              onReorderJobs={handleReorderJobs}
              onPreviewDocument={handlePreviewDocument}
              onExecutePhysicalPrint={(job) => {
                handlePreviewDocument(job);
                setTimeout(() => handleExecutePhysicalPrint(job), 100);
              }}
              onOpenNewJobModal={() => setIsQuickJobModalOpen(true)}
            />
          )}

          {currentView === 'dispatch' && (
            <JobDispatchStudio
              printers={printers}
              onSubmitJob={handleSubmitJob}
              onPreviewHtml={handlePreviewHtml}
              defaultPrinterId={defaultPrinter?.id}
            />
          )}

          {currentView === 'fleet' && (
            <PrinterFleetView
              printers={printers}
              onTriggerTestPrint={handleTriggerTestPrint}
              onSetPrinterStatus={handleSetPrinterStatus}
              onRefreshPrinters={refreshData}
            />
          )}

          {currentView === 'telemetry' && (
            <SpoolerTelemetryView
              logs={logs}
              metrics={metrics}
              onClearLogs={() => spoolerService.clearLogs().then(() => setLogs([]))}
            />
          )}

          {currentView === 'architecture' && (
            <ArchitectureInspectorView
              metrics={metrics}
              onBenchmarkIpc={() => spoolerService.benchmarkIpcLatency()}
            />
          )}
        </div>
      </main>

      {/* Document Full-Fidelity Preview Modal */}
      <DocumentPreviewModal
        isOpen={previewModal.isOpen}
        onClose={() => setPreviewModal((prev) => ({ ...prev, isOpen: false }))}
        title={previewModal.title}
        htmlContent={previewModal.html}
        docType={previewModal.docType}
        onExecutePhysicalPrint={() => handleExecutePhysicalPrint()}
      />

      {/* Quick Print Job Modal */}
      <QuickNewJobModal
        isOpen={isQuickJobModalOpen}
        onClose={() => setIsQuickJobModalOpen(false)}
        printers={printers}
        onSubmitJob={handleSubmitJob}
      />
    </div>
  );
}
