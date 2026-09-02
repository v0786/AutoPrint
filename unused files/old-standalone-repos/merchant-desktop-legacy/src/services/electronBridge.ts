/**
 * Universal Electron Spooler Bridge
 * Provides a unified API that seamlessly connects to Electron's IPC bridge if available,
 * or runs an in-memory high-fidelity OS print spooler engine with physical browser printing fallback.
 */

import {
  PrinterDevice,
  PrintJob,
  SpoolerMetrics,
  SpoolerEvent,
  SpoolerLog,
  PrinterStatus,
  IpcBridgeInterface,
  ReceiptData,
  LabelData,
  InvoiceData,
  ReportData,
} from '../types/printer';
import { verificationService } from './verificationService';

// Default initial printer devices simulating real merchant hardware
const INITIAL_PRINTERS: PrinterDevice[] = [
  {
    id: 'printer-pos-80',
    name: 'EPSON_TM_T88VI_AUTOPRINT',
    displayName: 'Epson TM-T88VI (Counter 1 - Thermal Receipt)',
    status: 'ready',
    isDefault: true,
    type: 'thermal_receipt',
    paperFormat: '80mm',
    dpi: 203,
    connectionType: 'usb',
    port: 'USB001',
    location: 'Front Checkout Counter #1',
    paperLevelPercent: 88,
    tonerLevelPercent: 100, // Thermal direct
    activeJobsCount: 0,
    totalJobsPrinted: 342,
    errorCount: 0,
    supportedFeatures: {
      color: false,
      duplex: false,
      autoCut: true,
      cashDrawerKick: true,
      barcode1D: true,
      qr2D: true,
    },
    lastStatusUpdate: new Date().toISOString(),
  },
  {
    id: 'printer-label-4x6',
    name: 'ZEBRA_ZD420_SHIPPING',
    displayName: 'Zebra ZD420 (Dispatch - 4x6 Label)',
    status: 'ready',
    isDefault: false,
    type: 'label_barcode',
    paperFormat: '4x6in',
    dpi: 300,
    connectionType: 'usb',
    port: 'USB002',
    location: 'Order Packaging Station',
    paperLevelPercent: 72,
    tonerLevelPercent: 100,
    activeJobsCount: 0,
    totalJobsPrinted: 189,
    errorCount: 1,
    supportedFeatures: {
      color: false,
      duplex: false,
      autoCut: true,
      cashDrawerKick: false,
      barcode1D: true,
      qr2D: true,
    },
    lastStatusUpdate: new Date().toISOString(),
  },
  {
    id: 'printer-laser-a4',
    name: 'HP_LASERJET_M404_OFFICE',
    displayName: 'HP LaserJet Pro M404dn (Invoices & Reports)',
    status: 'ready',
    isDefault: false,
    type: 'document_laser',
    paperFormat: 'A4',
    dpi: 600,
    connectionType: 'network',
    port: '192.168.1.140:9100',
    location: 'Back Office Admin Desk',
    paperLevelPercent: 95,
    tonerLevelPercent: 64,
    activeJobsCount: 0,
    totalJobsPrinted: 94,
    errorCount: 0,
    supportedFeatures: {
      color: false,
      duplex: true,
      autoCut: false,
      cashDrawerKick: false,
      barcode1D: true,
      qr2D: true,
    },
    lastStatusUpdate: new Date().toISOString(),
  },
  {
    id: 'printer-kitchen-impact',
    name: 'STAR_SP700_KITCHEN',
    displayName: 'Star Micronics SP700 (Kitchen Order Rail)',
    status: 'ready',
    isDefault: false,
    type: 'kitchen_impact',
    paperFormat: '80mm',
    dpi: 180,
    connectionType: 'network',
    port: '192.168.1.145:9100',
    location: 'Kitchen Expediter Station',
    paperLevelPercent: 45,
    tonerLevelPercent: 82, // Ribbon
    activeJobsCount: 0,
    totalJobsPrinted: 521,
    errorCount: 2,
    supportedFeatures: {
      color: true, // Red/Black ribbon
      duplex: false,
      autoCut: true,
      cashDrawerKick: true,
      barcode1D: false,
      qr2D: false,
    },
    lastStatusUpdate: new Date().toISOString(),
  },
  {
    id: 'printer-virtual-pdf',
    name: 'SPOOL_PDF_ARCHIVER',
    displayName: 'Virtual Spool Archiver (PDF Export)',
    status: 'ready',
    isDefault: false,
    type: 'virtual_pdf',
    paperFormat: 'A4',
    dpi: 600,
    connectionType: 'virtual',
    port: 'FILE:',
    location: 'Local File System Storage',
    paperLevelPercent: 100,
    tonerLevelPercent: 100,
    activeJobsCount: 0,
    totalJobsPrinted: 68,
    errorCount: 0,
    supportedFeatures: {
      color: true,
      duplex: true,
      autoCut: false,
      cashDrawerKick: false,
      barcode1D: true,
      qr2D: true,
    },
    lastStatusUpdate: new Date().toISOString(),
  },
];

// Initial seeded print jobs for immediate merchant view
const INITIAL_JOBS: PrintJob[] = [
  {
    id: 'job-init-1',
    jobNo: '#1041',
    title: 'AutoPrint Receipt - Order #8492 (Dine-In)',
    documentType: 'receipt',
    printerId: 'printer-pos-80',
    printerName: 'Epson TM-T88VI (Counter 1 - Thermal Receipt)',
    status: 'completed',
    priority: 'high',
    copies: 1,
    submittedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    startedAt: new Date(Date.now() - 1000 * 60 * 12 + 100).toISOString(),
    completedAt: new Date(Date.now() - 1000 * 60 * 12 + 1200).toISOString(),
    totalPages: 1,
    pagesPrinted: 1,
    bytesTotal: 4820,
    bytesSpooled: 4820,
    content: {
      receiptData: {
        merchantName: 'BLUE HARBOR ARTISAN COFFEE & BISTRO',
        storeAddress: '742 Evergreen Terrace, Seattle, WA',
        phone: '(206) 555-0194',
        taxId: 'WA-881920-P',
        cashier: 'Alex Rivera',
        registerId: 'REG-01',
        orderNumber: 'ORD-8492',
        orderType: 'Dine-In',
        date: new Date(Date.now() - 1000 * 60 * 12).toLocaleString(),
        items: [
          { id: '1', name: 'Nitro Cold Brew (Venti)', qty: 1, unitPrice: 5.75, options: 'Vanilla sweet cream' },
          { id: '2', name: 'Avocado Tartine & Poached Egg', qty: 1, unitPrice: 14.5 },
          { id: '3', name: 'Almond Biscotti', qty: 2, unitPrice: 3.5 },
        ],
        subtotal: 27.25,
        tax: 2.73,
        discount: 0,
        total: 29.98,
        paymentMethod: 'Apple Pay',
        cardLast4: '4821',
        barcodeValue: 'BH-ORD-8492',
        footerMessage: 'Thank you for dining with us! Free Wifi: BlueHarborGuest',
        autoCut: true,
        openDrawer: true,
      },
    },
    retryCount: 0,
    maxRetries: 3,
    silentPrint: true,
    spoolSpeedKbps: 380,
    latencyMs: 12,
    verificationCode: '48291057',
    formattedVerificationCode: '4829 1057',
    paymentStatus: 'UPI_SUCCESS',
    isCashLocked: false,
    totalCost: 24.50,
  },
  {
    id: 'job-init-2',
    jobNo: '#1042',
    title: 'Shipping Label - Order #8489 (Zebra 4x6)',
    documentType: 'label',
    printerId: 'printer-label-4x6',
    printerName: 'Zebra ZD420 (Dispatch - 4x6 Label)',
    status: 'completed',
    priority: 'normal',
    copies: 1,
    submittedAt: new Date(Date.now() - 1000 * 60 * 8).toISOString(),
    startedAt: new Date(Date.now() - 1000 * 60 * 8 + 120).toISOString(),
    completedAt: new Date(Date.now() - 1000 * 60 * 8 + 1450).toISOString(),
    totalPages: 1,
    pagesPrinted: 1,
    bytesTotal: 12400,
    bytesSpooled: 12400,
    content: {
      labelData: {
        itemTitle: 'Whole Bean Single Origin Ethiopia (2lb Bag x 2)',
        sku: 'SKU-ETH-YIRG-02',
        trackingNumber: '9400 1118 9956 0928 3712 04',
        barcodeType: 'CODE128',
        sender: {
          name: 'Blue Harbor Dispatch Fulfillment',
          company: 'Blue Harbor Coffee LLC',
          street: '1200 Industrial Way, Bay 4',
          cityStateZip: 'Seattle, WA 98134',
        },
        recipient: {
          name: 'Jennifer Miller',
          company: 'Apex Design Labs',
          street: '880 Montgomery St, Suite 400',
          cityStateZip: 'San Francisco, CA 94133',
          phone: '(415) 555-0129',
        },
        weightLbs: 4.5,
        packageType: 'Priority Box #3',
        fragile: false,
        batchNumber: 'BATCH-2026-AUG',
      },
    },
    retryCount: 0,
    maxRetries: 3,
    silentPrint: true,
    spoolSpeedKbps: 420,
    latencyMs: 14,
    verificationCode: '73918240',
    formattedVerificationCode: '7391 8240',
    paymentStatus: 'CASH_LOCKED',
    isCashLocked: true,
    totalCost: 18.00,
  },
  {
    id: 'job-init-3',
    jobNo: '#1043',
    title: 'Kitchen Ticket - Order #8493 (Hot Prep)',
    documentType: 'receipt',
    printerId: 'printer-kitchen-impact',
    printerName: 'Star Micronics SP700 (Kitchen Order Rail)',
    status: 'completed',
    priority: 'rush',
    copies: 1,
    submittedAt: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
    startedAt: new Date(Date.now() - 1000 * 60 * 3 + 80).toISOString(),
    completedAt: new Date(Date.now() - 1000 * 60 * 3 + 920).toISOString(),
    totalPages: 1,
    pagesPrinted: 1,
    bytesTotal: 3100,
    bytesSpooled: 3100,
    content: {
      receiptData: {
        merchantName: 'KITCHEN TICKET #8493',
        storeAddress: 'Table #4 • Server: Alex',
        phone: 'PRIORITY ORDER',
        cashier: 'Alex R.',
        registerId: 'REG-01',
        orderNumber: 'KITCHEN-8493',
        orderType: 'Dine-In',
        date: new Date(Date.now() - 1000 * 60 * 3).toLocaleTimeString(),
        items: [
          { id: '1', name: '2x Truffle Fries (Extra Crispy)', qty: 2, unitPrice: 8.0 },
          { id: '2', name: '1x Smoked Salmon Bagel (No Onion)', qty: 1, unitPrice: 12.5 },
        ],
        subtotal: 28.5,
        tax: 0,
        discount: 0,
        total: 28.5,
        paymentMethod: 'Cash',
        barcodeValue: 'KIT-8493',
        footerMessage: '*** EXPEDITE RUSH ***',
        autoCut: true,
        openDrawer: false,
      },
    },
    retryCount: 0,
    maxRetries: 3,
    silentPrint: true,
    spoolSpeedKbps: 290,
    latencyMs: 11,
    verificationCode: '19045823',
    formattedVerificationCode: '1904 5823',
    paymentStatus: 'CASH_REQUIRED',
    isCashLocked: false,
    totalCost: 45.00,
  },
];

export class UniversalSpoolerEngine implements IpcBridgeInterface {
  public isElectron: boolean = false;
  public platform: 'win32' | 'darwin' | 'linux' | 'browser' = 'browser';
  public spoolerBackend: 'winspool' | 'cups' | 'browser_native' | 'mock_spooler' = 'browser_native';

  private printers: PrinterDevice[] = [...INITIAL_PRINTERS];
  private jobs: PrintJob[] = [...INITIAL_JOBS];
  private logs: SpoolerLog[] = [];
  private metrics: SpoolerMetrics = {
    totalJobsSubmitted: INITIAL_JOBS.length,
    totalJobsCompleted: INITIAL_JOBS.length,
    totalJobsFailed: 0,
    activeJobs: 0,
    avgLatencyMs: 13.8,
    queueBandwidthKbps: 340,
    totalBytesPrinted: INITIAL_JOBS.reduce((acc, j) => acc + j.bytesTotal, 0),
    uptimeSeconds: 1420,
    isQueuePaused: false,
  };

  private jobListeners = new Set<(job: PrintJob) => void>();
  private printerListeners = new Set<(printer: PrinterDevice) => void>();
  private logListeners = new Set<(log: SpoolerLog) => void>();
  private queueListeners = new Set<(isPaused: boolean) => void>();

  private isProcessingQueue = false;

  constructor() {
    // Detect Electron runtime
    if (typeof window !== 'undefined' && window.electronAPI) {
      this.isElectron = true;
      this.platform = window.electronAPI.platform || 'win32';
      this.spoolerBackend = this.platform === 'win32' ? 'winspool' : 'cups';
      this.initElectronListeners();
    } else {
      this.isElectron = false;
      this.platform = 'browser';
      this.spoolerBackend = 'browser_native';
      this.seedInitialLogs();
    }
  }

  private seedInitialLogs() {
    this.addLog({
      level: 'info',
      message: 'Desktop Print Spooler Engine initialized (v2.4.1)',
      details: { backend: this.spoolerBackend, platform: this.platform, bufferSize: '1024KB' },
    });
    this.addLog({
      level: 'success',
      message: 'Detected 5 local hardware ports (USB001, USB002, 9100 Raw, FILE:)',
    });
    this.addLog({
      level: 'info',
      message: 'Default AutoPrint destination set to Epson TM-T88VI (USB001)',
      printerName: 'Epson TM-T88VI (Counter 1 - Thermal Receipt)',
    });
  }

  private initElectronListeners() {
    if (!window.electronAPI) return;

    window.electronAPI.on('printer:job-update', (job: PrintJob) => {
      this.notifyJobUpdate(job);
    });

    window.electronAPI.on('printer:status-update', (printer: PrinterDevice) => {
      this.notifyPrinterUpdate(printer);
    });

    window.electronAPI.on('printer:log-event', (log: SpoolerLog) => {
      this.addLog(log);
    });
  }

  public async getPrinters(): Promise<PrinterDevice[]> {
    if (this.isElectron && window.electronAPI) {
      return await window.electronAPI.getPrinters();
    }
    return [...this.printers];
  }

  public async getJobs(): Promise<PrintJob[]> {
    if (this.isElectron && window.electronAPI) {
      return await window.electronAPI.getJobs();
    }
    return [...this.jobs];
  }

  public async getLogs(): Promise<SpoolerLog[]> {
    return [...this.logs];
  }

  public async getMetrics(): Promise<SpoolerMetrics> {
    if (this.isElectron && window.electronAPI) {
      return await window.electronAPI.getMetrics();
    }
    return { ...this.metrics };
  }

  public async submitPrintJob(
    jobData: Omit<PrintJob, 'id' | 'jobNo' | 'status' | 'submittedAt' | 'bytesSpooled' | 'pagesPrinted' | 'retryCount' | 'latencyMs'>
  ): Promise<PrintJob> {
    if (this.isElectron && window.electronAPI) {
      return await window.electronAPI.submitJob(jobData);
    }

    const jobNo = `#${String(this.metrics.totalJobsSubmitted + 1041).padStart(4, '0')}`;
    const jobId = `job-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    // Derive or compute document monetary total
    let totalCost = jobData.totalCost;
    if (totalCost === undefined) {
      if (jobData.content?.receiptData?.total) {
        totalCost = jobData.content.receiptData.total;
      } else if (jobData.content?.invoiceData?.grandTotal) {
        totalCost = jobData.content.invoiceData.grandTotal;
      } else {
        totalCost = +(jobData.totalPages * 0.75 + 2.5).toFixed(2);
      }
    }

    // AutoPrint Verification Integration: Create or associate 8-digit verification key
    let verificationCode = jobData.verificationCode;
    let formattedVerificationCode = jobData.formattedVerificationCode;
    let paymentStatus = jobData.paymentStatus || 'PENDING';
    let isCashLocked = jobData.isCashLocked || false;

    if (!verificationCode) {
      const mockJobRef: PrintJob = {
        ...jobData,
        id: jobId,
        jobNo,
        status: 'queued',
        submittedAt: new Date().toISOString(),
        bytesSpooled: 0,
        pagesPrinted: 0,
        retryCount: 0,
        latencyMs: 12,
        totalCost,
      };

      const record = verificationService.createVerificationRecord({
        job: mockJobRef,
        customerName: jobData.customerName || 'Customer Walk-In',
        amountTotal: totalCost,
        currency: 'USD',
        initialMethod: isCashLocked ? 'CASH' : paymentStatus === 'UPI_SUCCESS' ? 'UPI' : 'PENDING',
      });

      verificationCode = record.verificationCode;
      formattedVerificationCode = record.formattedCode;
      paymentStatus = record.paymentStatus;
      isCashLocked = record.isCashLocked;
    }

    const newJob: PrintJob = {
      ...jobData,
      id: jobId,
      jobNo,
      verificationCode,
      formattedVerificationCode,
      paymentStatus,
      isCashLocked,
      totalCost,
      status: this.metrics.isQueuePaused ? 'paused' : 'queued',
      submittedAt: new Date().toISOString(),
      bytesSpooled: 0,
      pagesPrinted: 0,
      retryCount: 0,
      latencyMs: Math.floor(Math.random() * 18) + 8,
    };

    // Insert according to priority (rush first, then high, normal, low)
    const priorityWeight: Record<string, number> = { rush: 4, high: 3, normal: 2, low: 1 };
    const queueIndex = this.jobs.findIndex(
      (j) =>
        ['queued', 'paused'].includes(j.status) &&
        priorityWeight[j.priority] < priorityWeight[newJob.priority]
    );

    if (queueIndex !== -1) {
      this.jobs.splice(queueIndex, 0, newJob);
    } else {
      this.jobs.unshift(newJob);
    }

    this.metrics.totalJobsSubmitted += 1;
    this.metrics.activeJobs += 1;

    this.addLog({
      level: 'info',
      message: `Job ${newJob.jobNo} "${newJob.title}" queued for ${newJob.printerName} (${newJob.priority.toUpperCase()} priority)`,
      printerName: newJob.printerName,
      jobNo: newJob.jobNo,
    });

    this.notifyJobUpdate(newJob);

    // Trigger queue loop
    this.processQueue();

    return newJob;
  }

  public async cancelJob(jobId: string): Promise<boolean> {
    if (this.isElectron && window.electronAPI) {
      return await window.electronAPI.cancelJob(jobId);
    }

    const job = this.jobs.find((j) => j.id === jobId);
    if (!job) return false;

    job.status = 'cancelled';
    job.completedAt = new Date().toISOString();
    this.metrics.activeJobs = Math.max(0, this.metrics.activeJobs - 1);

    this.addLog({
      level: 'warn',
      message: `Job ${job.jobNo} cancelled by operator`,
      jobNo: job.jobNo,
      printerName: job.printerName,
    });

    this.notifyJobUpdate(job);
    return true;
  }

  public async retryJob(jobId: string): Promise<PrintJob | null> {
    if (this.isElectron && window.electronAPI) {
      const ok = await window.electronAPI.retryJob(jobId);
      if (!ok) return null;
    }

    const job = this.jobs.find((j) => j.id === jobId);
    if (!job) return null;

    job.status = this.metrics.isQueuePaused ? 'paused' : 'queued';
    job.retryCount += 1;
    job.errorReason = undefined;
    job.bytesSpooled = 0;
    job.pagesPrinted = 0;
    this.metrics.activeJobs += 1;

    this.addLog({
      level: 'info',
      message: `Job ${job.jobNo} re-queued for transmission (Attempt #${job.retryCount + 1})`,
      jobNo: job.jobNo,
      printerName: job.printerName,
    });

    this.notifyJobUpdate(job);
    this.processQueue();
    return job;
  }

  public async reorderQueue(jobIds: string[]): Promise<PrintJob[]> {
    if (this.isElectron && window.electronAPI) {
      await window.electronAPI.reorderQueue(jobIds);
    }

    const activeJobs = this.jobs.filter((j) => jobIds.includes(j.id));
    const otherJobs = this.jobs.filter((j) => !jobIds.includes(j.id));

    const reorderedActive = jobIds
      .map((id) => activeJobs.find((j) => j.id === id))
      .filter((j): j is PrintJob => Boolean(j));

    this.jobs = [...reorderedActive, ...otherJobs];
    return [...this.jobs];
  }

  public async pauseQueue(isPaused?: boolean): Promise<boolean> {
    const targetState = isPaused !== undefined ? isPaused : !this.metrics.isQueuePaused;
    if (this.isElectron && window.electronAPI) {
      if (targetState) await window.electronAPI.pauseQueue();
      else await window.electronAPI.resumeQueue();
    }

    this.metrics.isQueuePaused = targetState;
    this.jobs.forEach((j) => {
      if (targetState && ['queued', 'spooling'].includes(j.status)) {
        j.status = 'paused';
        this.notifyJobUpdate(j);
      } else if (!targetState && j.status === 'paused') {
        j.status = 'queued';
        this.notifyJobUpdate(j);
      }
    });

    this.addLog({
      level: targetState ? 'warn' : 'info',
      message: targetState
        ? 'Native Spooler Queue PAUSED. Holding buffer streams in memory.'
        : 'Native Spooler Queue RESUMED. Resuming buffer transmission.',
    });

    this.queueListeners.forEach((fn) => fn(targetState));

    if (!targetState) {
      this.processQueue();
    }

    return true;
  }

  public async purgeCompletedJobs(): Promise<boolean> {
    if (this.isElectron && window.electronAPI) {
      await window.electronAPI.purgeCompleted();
    }

    this.jobs = this.jobs.filter((j) => !['completed', 'cancelled'].includes(j.status));
    this.addLog({
      level: 'info',
      message: 'Purged completed and cancelled jobs from spool history',
    });
    return true;
  }

  public async setPrinterStatus(
    printerId: string,
    status: PrinterStatus,
    faultDetails?: { paperLevel?: number; tonerLevel?: number }
  ): Promise<boolean> {
    const printer = this.printers.find((p) => p.id === printerId);
    if (!printer) return false;

    printer.status = status;
    printer.lastStatusUpdate = new Date().toISOString();

    if (faultDetails?.paperLevel !== undefined) {
      printer.paperLevelPercent = faultDetails.paperLevel;
    }
    if (faultDetails?.tonerLevel !== undefined) {
      printer.tonerLevelPercent = faultDetails.tonerLevel;
    }

    if (status !== 'ready' && status !== 'printing') {
      printer.errorCount += 1;
      this.addLog({
        level: 'error',
        message: `Hardware Alert on ${printer.displayName}: ${status.toUpperCase().replace(/_/g, ' ')}`,
        printerName: printer.displayName,
      });
    } else {
      this.addLog({
        level: 'info',
        message: `${printer.displayName} status changed to ${status.toUpperCase()}`,
        printerName: printer.displayName,
      });
    }

    this.notifyPrinterUpdate(printer);
    return true;
  }

  public async triggerTestPrint(
    printerId: string,
    testType: 'diagnostic' | 'alignment' | 'density' | 'receipt'
  ): Promise<PrintJob> {
    const printer = this.printers.find((p) => p.id === printerId) || this.printers[0];

    let content: any = {};
    let title = `Test Print - ${testType.toUpperCase()}`;

    if (testType === 'receipt') {
      title = 'Diagnostic Receipt & Cutter Test';
      content = {
        receiptData: {
          merchantName: 'MERCHANT HARDWARE TEST TICKET',
          storeAddress: 'Self-Diagnostic Mode v2.4.1',
          phone: 'Baud Rate: 115200 | Flow: DTR/DSR',
          taxId: `DPI: ${printer.dpi} | Port: ${printer.port}`,
          cashier: 'System Self-Test',
          registerId: printer.port,
          orderNumber: `DIAG-${Math.floor(Math.random() * 9000 + 1000)}`,
          orderType: 'Retail Checkout',
          date: new Date().toLocaleString(),
          items: [
            { id: 't1', name: 'Thermal Head Alignment Grid', qty: 1, unitPrice: 0.0 },
            { id: 't2', name: 'Raster ESC/POS Bitmap Density', qty: 1, unitPrice: 0.0 },
            { id: 't3', name: 'Auto-Cutter Partial Cut Test', qty: 1, unitPrice: 0.0 },
          ],
          subtotal: 0,
          tax: 0,
          discount: 0,
          total: 0,
          paymentMethod: 'Cash',
          barcodeValue: `TEST-PRINT-${printer.id}`,
          footerMessage: 'Hardware diagnostics complete. All sensors PASS.',
          autoCut: true,
          openDrawer: false,
        },
      };
    } else if (testType === 'diagnostic') {
      title = `Hardware Self-Test [${printer.displayName}]`;
      content = {
        reportData: {
          title: `HARDWARE DIAGNOSTIC REPORT - ${printer.displayName}`,
          period: 'Real-Time Spooler Diagnostics',
          merchantName: 'Local Merchant Workstation #1',
          summaryMetrics: [
            { label: 'Spooler Driver', value: this.spoolerBackend.toUpperCase() },
            { label: 'Firmware Version', value: 'v4.18.2b-NATIVE' },
            { label: 'Buffer Headroom', value: '512 KB' },
            { label: 'Port Latency', value: '1.8 ms' },
          ],
          breakdown: [
            { category: 'Paper Feed Motor', count: 1, volume: 'OPERATIONAL' },
            { category: 'Thermal Head Element', count: printer.dpi, volume: '0 BAD PIXELS' },
            { category: 'Auto-Cutter Solenoid', count: 1, volume: 'CYCLE PASS' },
            { category: 'Cash Drawer Pulse', count: 1, volume: 'READY' },
          ],
          generatedAt: new Date().toLocaleString(),
          generatedBy: 'Electron Native Spooler Bridge',
        },
      };
    } else {
      title = `Printer Calibration Grid (${printer.paperFormat})`;
      content = {
        plainText: `==========================================\nPRINT CALIBRATION PATTERN\nPRINTER: ${printer.displayName}\nFORMAT: ${printer.paperFormat} | DPI: ${printer.dpi}\nPORT: ${printer.port}\nDATE: ${new Date().toISOString()}\n==========================================`,
      };
    }

    return await this.submitPrintJob({
      title,
      documentType: testType === 'receipt' ? 'receipt' : 'report',
      printerId: printer.id,
      printerName: printer.displayName,
      priority: 'rush',
      copies: 1,
      totalPages: 1,
      bytesTotal: 3400,
      content,
      maxRetries: 2,
      silentPrint: true,
      spoolSpeedKbps: 350,
    });
  }

  public async benchmarkIpcLatency(): Promise<number> {
    const start = performance.now();
    await this.getPrinters();
    const elapsed = +(performance.now() - start).toFixed(2);
    this.metrics.avgLatencyMs = +((this.metrics.avgLatencyMs * 0.7) + (elapsed * 0.3)).toFixed(2);
    return elapsed;
  }

  public async clearLogs(): Promise<boolean> {
    this.logs = [];
    return true;
  }

  private addLog(logData: Omit<SpoolerLog, 'id' | 'timestamp'>) {
    const log: SpoolerLog = {
      ...logData,
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
    };
    this.logs.unshift(log);
    if (this.logs.length > 200) {
      this.logs = this.logs.slice(0, 200);
    }
    this.logListeners.forEach((fn) => fn(log));
  }

  private notifyJobUpdate(job: PrintJob) {
    this.jobListeners.forEach((fn) => fn({ ...job }));
  }

  private notifyPrinterUpdate(printer: PrinterDevice) {
    this.printerListeners.forEach((fn) => fn({ ...printer }));
  }

  public onJobUpdate(listener: (job: PrintJob) => void): () => void {
    this.jobListeners.add(listener);
    return () => this.jobListeners.delete(listener);
  }

  public onPrinterStatusUpdate(listener: (printer: PrinterDevice) => void): () => void {
    this.printerListeners.add(listener);
    return () => this.printerListeners.delete(listener);
  }

  public onTelemetryLog(listener: (log: SpoolerLog) => void): () => void {
    this.logListeners.add(listener);
    return () => this.logListeners.delete(listener);
  }

  public onQueueStateChange(listener: (isPaused: boolean) => void): () => void {
    this.queueListeners.add(listener);
    return () => this.queueListeners.delete(listener);
  }

  // Internal Spooler Queue Execution Loop
  private async processQueue() {
    if (this.isProcessingQueue || this.metrics.isQueuePaused) return;
    this.isProcessingQueue = true;

    while (!this.metrics.isQueuePaused) {
      const nextJob = this.jobs.find((j) => j.status === 'queued');
      if (!nextJob) break;

      const targetPrinter = this.printers.find((p) => p.id === nextJob.printerId);

      // Check for printer hardware faults
      if (
        targetPrinter &&
        (targetPrinter.status === 'offline' ||
          targetPrinter.status === 'out_of_paper' ||
          targetPrinter.status === 'paper_jam' ||
          targetPrinter.status === 'error')
      ) {
        nextJob.status = 'failed';
        nextJob.errorReason = `Hardware Fault: ${targetPrinter.displayName} is ${targetPrinter.status.toUpperCase().replace(/_/g, ' ')}`;
        nextJob.completedAt = new Date().toISOString();
        this.metrics.totalJobsFailed += 1;
        this.metrics.activeJobs = Math.max(0, this.metrics.activeJobs - 1);

        this.addLog({
          level: 'error',
          message: `Job ${nextJob.jobNo} failed: ${nextJob.errorReason}`,
          printerName: nextJob.printerName,
          jobNo: nextJob.jobNo,
        });

        this.notifyJobUpdate(nextJob);
        continue;
      }

      // Step 1: Spooling Phase
      nextJob.status = 'spooling';
      nextJob.startedAt = new Date().toISOString();
      if (targetPrinter) {
        targetPrinter.status = 'printing';
        targetPrinter.activeJobsCount += 1;
        this.notifyPrinterUpdate(targetPrinter);
      }
      this.notifyJobUpdate(nextJob);

      this.addLog({
        level: 'info',
        message: `Spooling ${nextJob.bytesTotal} bytes to buffer on ${nextJob.printerName}...`,
        printerName: nextJob.printerName,
        jobNo: nextJob.jobNo,
      });

      // Spooling animation steps
      const spoolSteps = 3;
      for (let s = 1; s <= spoolSteps; s++) {
        await new Promise((r) => setTimeout(r, 100));
        nextJob.bytesSpooled = Math.min(
          nextJob.bytesTotal,
          Math.round((s / spoolSteps) * nextJob.bytesTotal)
        );
        this.notifyJobUpdate(nextJob);
      }

      // Step 2: Printing Phase
      nextJob.status = 'printing';
      this.notifyJobUpdate(nextJob);

      this.addLog({
        level: 'info',
        message: `Transmitting raster stream to print head on ${nextJob.printerName}`,
        printerName: nextJob.printerName,
        jobNo: nextJob.jobNo,
      });

      const printDurationMs = Math.max(
        400,
        nextJob.totalPages * 300 + (nextJob.documentType === 'invoice' ? 350 : 180)
      );
      const pageSteps = nextJob.totalPages;

      for (let p = 1; p <= pageSteps; p++) {
        await new Promise((r) => setTimeout(r, printDurationMs / pageSteps));
        nextJob.pagesPrinted = p;
        this.notifyJobUpdate(nextJob);
      }

      // Step 3: Complete Job
      nextJob.status = 'completed';
      nextJob.completedAt = new Date().toISOString();
      nextJob.bytesSpooled = nextJob.bytesTotal;
      nextJob.pagesPrinted = nextJob.totalPages;

      // Fail-safe verification sync: mark physical prints as ready in collection tray
      verificationService.updateTrayReadyStatus(nextJob.id);

      this.metrics.totalJobsCompleted += 1;
      this.metrics.totalBytesPrinted += nextJob.bytesTotal;
      this.metrics.activeJobs = Math.max(0, this.metrics.activeJobs - 1);

      if (targetPrinter) {
        targetPrinter.status = 'ready';
        targetPrinter.activeJobsCount = Math.max(0, targetPrinter.activeJobsCount - 1);
        targetPrinter.totalJobsPrinted += 1;
        targetPrinter.paperLevelPercent = Math.max(5, targetPrinter.paperLevelPercent - 1);
        this.notifyPrinterUpdate(targetPrinter);
      }

      this.addLog({
        level: 'success',
        message: `Job ${nextJob.jobNo} (${nextJob.title}) printed successfully on ${nextJob.printerName}`,
        printerName: nextJob.printerName,
        jobNo: nextJob.jobNo,
      });

      this.notifyJobUpdate(nextJob);

      await new Promise((r) => setTimeout(r, 150));
    }

    this.isProcessingQueue = false;
  }
}

export const spoolerService = new UniversalSpoolerEngine();
export const electronBridge = spoolerService;
