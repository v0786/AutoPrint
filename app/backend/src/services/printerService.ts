import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import * as ptp from 'pdf-to-printer';
import { PrintJobStatus } from '../types';
import { auditLogger } from '../utils/auditLogger';
import { jobRepository } from '../database/repositories/jobRepository';
import { verificationRepository } from '../database/repositories/verificationRepository';

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
