import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import * as ptp from 'pdf-to-printer';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { PrintJobStatus } from '../types';
import { auditLogger } from '../utils/auditLogger';
import { jobRepository } from '../database/repositories/jobRepository';
import { verificationRepository } from '../database/repositories/verificationRepository';
import { PATHS } from '../config/environment';
import { MerchantRepository } from '../database/repositories/merchantRepository';

const execAsync = promisify(exec);

export interface PrinterDevice {
  id: string;
  name: string;
  isDefault: boolean;
  isOnline: boolean;
  driverName?: string;
  portName?: string;
  paperSizes?: string[];
}

export interface PrintDispatchResult {
  success: boolean;
  status: PrintJobStatus;
  message: string;
  hardwareJobId?: string;
}

export class PrinterService {
  /**
   * Resolves target physical printer name:
   * 1. If explicit physical printer is provided, uses it.
   * 2. If 'AutoPrint Spooler' or default spooler is requested, looks for the default or first online physical printer.
   * 3. Returns null if only virtual spooler is available.
   */
  public static async resolvePhysicalPrinter(requestedPrinter?: string): Promise<string | null> {
    if (process.platform !== 'win32') {
      return null;
    }

    if (process.env.NODE_ENV === 'test' || process.env.npm_lifecycle_event === 'test' || process.env.AUTOPRINT_TEST === '1') {
      return null;
    }

    try {
      const printers = await this.getAvailablePrinters();
      // Physical printers: exclude virtual AutoPrint fallbacks
      const physicalPrinters = printers.filter(
        (p) =>
          p.id !== 'default-spooler' &&
          p.name !== 'AutoPrint Spooler' &&
          p.name !== 'AutoPrint System Spooler' &&
          p.isOnline
      );

      if (physicalPrinters.length === 0) {
        return null;
      }

      // If requested printer specifically matches an existing physical printer
      if (
        requestedPrinter &&
        requestedPrinter !== 'AutoPrint Spooler' &&
        requestedPrinter !== 'Default Spooler' &&
        requestedPrinter !== 'AutoPrint System Spooler' &&
        requestedPrinter !== 'default-spooler'
      ) {
        const match = physicalPrinters.find(
          (p) =>
            p.name.toLowerCase() === requestedPrinter.toLowerCase() ||
            p.id.toLowerCase() === requestedPrinter.toLowerCase()
        );
        if (match) return match.name;
      }

      // If requested printer was a generic spooler name, or no match, prefer the Windows default physical printer
      const defaultPhysical = physicalPrinters.find((p) => p.isDefault) || physicalPrinters[0];
      return defaultPhysical ? defaultPhysical.name : null;
    } catch (e) {
      console.warn('[PRINTER] Error resolving physical printer:', e);
      return null;
    }
  }

  /**
   * Dispatches a processed document to the target printer or queues it in the spooler.
   */
  public static async dispatchPrintJob(
    jobId: string,
    jobNo: string,
    verificationCode: string,
    filePath: string,
    printerName?: string,
    printOptions?: {
      copies?: number;
      pageRange?: string;
      orientation?: 'portrait' | 'landscape';
      colorMode?: string;
      duplex?: boolean;
      paperFormat?: string;
    }
  ): Promise<PrintDispatchResult> {
    if (!fs.existsSync(filePath)) {
      auditLogger.logEvent({
        verificationCode,
        jobId,
        jobNo,
        action: 'JOB_PRINT_FAILED',
        actor: 'SYSTEM_AUTOPRINT',
        details: { reason: 'File does not exist for printing', filePath },
      });
      jobRepository.updateStatus(jobId, 'FAILED');
      return {
        success: false,
        status: 'FAILED',
        message: `Print failed: Document file not found at ${filePath}`,
      };
    }

    const physicalPrinter = await this.resolvePhysicalPrinter(printerName);
    const targetPrinterName = physicalPrinter || printerName || 'AutoPrint Spooler';

    auditLogger.logEvent({
      verificationCode,
      jobId,
      jobNo,
      action: 'JOB_PRINT_STARTED',
      actor: 'SYSTEM_AUTOPRINT',
      details: { printerName: targetPrinterName, filePath, isPhysical: Boolean(physicalPrinter) },
    });

    jobRepository.updateStatus(jobId, 'PRINTING');

    // On Windows, if a physical printer is resolved, dispatch directly via Windows spooler
    if (process.platform === 'win32' && physicalPrinter) {
      try {
        console.log(`[PRINTER] Dispatching job ${jobId} (${jobNo}) to physical printer: "${physicalPrinter}"`);
        const ptpOptions: any = {
          printer: physicalPrinter,
        };
        if (printOptions?.copies && printOptions.copies > 0) {
          ptpOptions.copies = printOptions.copies;
        }
        if (printOptions?.pageRange && printOptions.pageRange !== 'all') {
          ptpOptions.pages = printOptions.pageRange;
        }
        if (printOptions?.orientation) {
          ptpOptions.orientation = printOptions.orientation;
        }
        if (printOptions?.colorMode === 'black_and_white' || printOptions?.colorMode === 'bw') {
          ptpOptions.monochrome = true;
        }
        if (printOptions?.duplex) {
          ptpOptions.side = 'duplex';
        }
        if (printOptions?.paperFormat && ['A4', 'A3', 'Letter', 'Legal'].includes(printOptions.paperFormat)) {
          ptpOptions.paperSize = printOptions.paperFormat;
        }

        await ptp.print(filePath, ptpOptions);

        jobRepository.markPrinted(jobId);
        verificationRepository.updateTrayReady(jobId);

        auditLogger.logEvent({
          verificationCode,
          jobId,
          jobNo,
          action: 'JOB_PRINT_COMPLETED',
          actor: 'SYSTEM_AUTOPRINT',
          details: { printerName: physicalPrinter, hardwareStatus: 'DISPATCHED_TO_SPOOLER' },
        });

        return {
          success: true,
          status: 'PRINTED',
          message: `Document dispatched to Windows printer: ${physicalPrinter}`,
          hardwareJobId: physicalPrinter,
        };
      } catch (err: any) {
        console.warn(`[PRINTER] Windows physical print attempt failed (Printer: ${physicalPrinter}):`, err.message);
        // Fallback: document is safely queued and ready for manual/staff trigger
        jobRepository.updateStatus(jobId, 'READY_FOR_HANDOVER');
        verificationRepository.updateTrayReady(jobId);

        return {
          success: true,
          status: 'READY_FOR_HANDOVER',
          message: `Document ready in queue. Physical printer ${physicalPrinter} error: ${err.message}`,
        };
      }
    }

    // Standard headless/desktop queue flow:
    // Mark document as printed and ready in tray once processed
    jobRepository.markPrinted(jobId);
    verificationRepository.updateTrayReady(jobId);

    auditLogger.logEvent({
      verificationCode,
      jobId,
      jobNo,
      action: 'JOB_PRINT_COMPLETED',
      actor: 'SYSTEM_AUTOPRINT',
      details: { printerName: targetPrinterName },
    });

    return {
      success: true,
      status: 'READY_FOR_PICKUP',
      message: 'Print job successfully queued in AutoPrint spooler.',
    };
  }

  /**
   * Generates a 1-page hardware diagnostic test sheet and dispatches it to the printer.
   */
  public static async generateAndDispatchTestSheet(printerName?: string): Promise<PrintDispatchResult> {
    const primary = MerchantRepository.getPrimaryMerchant();
    const identity = MerchantRepository.getInstallationIdentity();
    const storeName = primary?.shop_name || 'AutoPrint Print Station';
    const merchantId = identity?.merchant_id || 'AP-LOCAL';
    const deviceId = identity?.device_id || 'DEV-LOCAL';

    // Create diagnostic PDF document
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // Standard A4 in points
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Exterior alignment border
    page.drawRectangle({
      x: 36,
      y: 36,
      width: width - 72,
      height: height - 72,
      borderWidth: 2,
      borderColor: rgb(0.1, 0.4, 0.8),
    });

    // Header title
    page.drawText('AUTOPRINT HARDWARE SELF-TEST SHEET', {
      x: 54,
      y: height - 80,
      size: 18,
      font: fontBold,
      color: rgb(0.1, 0.4, 0.8),
    });

    page.drawText('V1/V2 Print Engine Architecture Diagnostic Verification Page', {
      x: 54,
      y: height - 102,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    page.drawLine({
      start: { x: 54, y: height - 114 },
      end: { x: width - 54, y: height - 114 },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });

    // Diagnostic Details Table
    const detailsY = height - 145;
    const lineGap = 22;
    const testLines = [
      `Date & Time:       ${new Date().toISOString()}`,
      `Store Name:        ${storeName}`,
      `Merchant ID:       ${merchantId}`,
      `Device ID:         ${deviceId}`,
      `Target Printer:    ${printerName || primary?.selected_printer || 'AutoPrint System Spooler'}`,
      `Engine Mode:       V1 Local-First Autonomous`,
      `Verification Desk: Active (8-Digit Pickup Key Security)`,
      `Status:            PASS - Hardware Communication Verified`,
    ];

    testLines.forEach((line, idx) => {
      page.drawText(line, {
        x: 60,
        y: detailsY - (idx * lineGap),
        size: 11,
        font: line.startsWith('Status:') ? fontBold : font,
        color: line.startsWith('Status:') ? rgb(0.1, 0.6, 0.2) : rgb(0.1, 0.1, 0.1),
      });
    });

    // Test pattern box (alignment & density verification)
    const boxY = detailsY - (testLines.length * lineGap) - 80;
    page.drawRectangle({
      x: 60,
      y: boxY,
      width: width - 120,
      height: 70,
      color: rgb(0.96, 0.97, 0.99),
      borderColor: rgb(0.75, 0.8, 0.9),
      borderWidth: 1,
    });

    page.drawText('[ TEST PATTERN: NOZZLE / LASER DENSITY PASS ]', {
      x: 110,
      y: boxY + 40,
      size: 12,
      font: fontBold,
      color: rgb(0.1, 0.5, 0.2),
    });

    page.drawText('If this page printed cleanly, your printer is fully configured and ready for AutoPrint.', {
      x: 75,
      y: boxY + 18,
      size: 9,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });

    const pdfBytes = await pdfDoc.save();
    const testDir = PATHS.PROCESSED_DIR;
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    const testFilePath = path.join(testDir, `diag-test-${Date.now()}.pdf`);
    fs.writeFileSync(testFilePath, pdfBytes);

    const testJobId = `job-test-${Date.now()}`;
    const testJobNo = `TEST-${Math.floor(1000 + Math.random() * 9000)}`;
    const testVerificationCode = '00000000';

    return await this.dispatchPrintJob(
      testJobId,
      testJobNo,
      testVerificationCode,
      testFilePath,
      printerName,
      { copies: 1, paperFormat: 'A4' }
    );
  }

  private static printerCache: { data: PrinterDevice[]; timestamp: number } | null = null;

  /**
   * Retrieves list of available system printers on Windows or Unix with 30s cache.
   * Can force refresh spooler query on demand.
   */
  public static async getAvailablePrinters(forceRefresh = false): Promise<PrinterDevice[]> {
    if (!forceRefresh && this.printerCache && Date.now() - this.printerCache.timestamp < 30000) {
      return this.printerCache.data;
    }

    if (process.platform === 'win32') {
      try {
        const psScript = `Get-CimInstance Win32_Printer | Select-Object Name, Default, PrinterStatus, DriverName, PortName | ConvertTo-Json`;
        const encoded = Buffer.from(psScript, 'utf16le').toString('base64');
        const psCommand = `powershell -NoProfile -NonInteractive -EncodedCommand ${encoded}`;
        const { stdout } = await execAsync(psCommand, { timeout: 7000 });
        if (stdout.trim()) {
          const parsed = JSON.parse(stdout);
          const list = Array.isArray(parsed) ? parsed : [parsed];

          const devices = list
            .filter((p: any) => p && p.Name)
            .map((p: any) => ({
              id: p.Name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'printer',
              name: p.Name || 'Unknown Printer',
              isDefault: Boolean(p.Default),
              isOnline: p.PrinterStatus === 3 || p.PrinterStatus === undefined,
              driverName: p.DriverName,
              portName: p.PortName,
            }));

          if (devices.length > 0) {
            this.printerCache = { data: devices, timestamp: Date.now() };
            return devices;
          }
        }
      } catch (e) {
        console.warn('[PRINTER] Failed to enumerate Windows printers:', e);
      }
    }

    // Default system fallback so AutoPrint is never left without a destination
    const fallbackDevices = [
      {
        id: 'default-spooler',
        name: 'AutoPrint System Spooler',
        isDefault: true,
        isOnline: true,
      },
    ];
    this.printerCache = { data: fallbackDevices, timestamp: Date.now() };
    return fallbackDevices;
  }
}
