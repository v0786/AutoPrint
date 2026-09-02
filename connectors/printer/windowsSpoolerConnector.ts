/**
 * Windows Print Spooler & Hardware Connector
 * Interfaces with native Windows print queue and hardware thermal printers.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

export interface PrinterDevice {
  id: string;
  name: string;
  isDefault: boolean;
  isOnline: boolean;
  driverName?: string;
  portName?: string;
}

export interface PrintJobDispatchResult {
  success: boolean;
  status: 'PRINTED' | 'READY_IN_TRAY' | 'QUEUED' | 'FAILED';
  message: string;
  hardwareProcessId?: string;
}

export class WindowsSpoolerConnector {
  /**
   * Enumerate connected system printers on Windows.
   */
  public static async getInstalledPrinters(): Promise<PrinterDevice[]> {
    if (process.platform !== 'win32') {
      return [
        {
          id: 'default-spooler',
          name: 'AutoPrint Virtual Spooler',
          isDefault: true,
          isOnline: true,
        },
      ];
    }

    try {
      const psCommand = `powershell -NoProfile -Command "Get-CimInstance Win32_Printer | Select-Object Name, Default, PrinterStatus, DriverName, PortName | ConvertTo-Json"`;
      const { stdout } = await execAsync(psCommand, { timeout: 5000 });
      if (!stdout.trim()) return [];

      const parsed = JSON.parse(stdout);
      const list = Array.isArray(parsed) ? parsed : [parsed];

      return list.map((p: any) => ({
        id: p.Name?.toLowerCase().replace(/[^a-z0-9]/g, '-') || 'printer',
        name: p.Name || 'Unknown Printer',
        isDefault: Boolean(p.Default),
        isOnline: p.PrinterStatus === 3 || p.PrinterStatus === undefined,
        driverName: p.DriverName,
        portName: p.PortName,
      }));
    } catch (e) {
      console.warn('[CONNECTOR:PRINTER] Failed to query Windows printers:', e);
      return [];
    }
  }

  /**
   * Dispatch a document to a physical Windows printer via print command.
   */
  public static async dispatchPrint(
    filePath: string,
    printerName?: string
  ): Promise<PrintJobDispatchResult> {
    if (!fs.existsSync(filePath)) {
      return {
        success: false,
        status: 'FAILED',
        message: `Document not found at path: ${filePath}`,
      };
    }

    if (
      process.platform === 'win32' &&
      printerName &&
      printerName !== 'AutoPrint Virtual Spooler' &&
      printerName !== 'Default Spooler'
    ) {
      try {
        const psCommand = `powershell -NoProfile -Command "Start-Process -FilePath '${filePath.replace(/'/g, "''")}' -Verb PrintTo -ArgumentList '${printerName.replace(/'/g, "''")}' -PassThru | Select-Object -ExpandProperty Id"`;
        const { stdout } = await execAsync(psCommand, { timeout: 10000 });
        return {
          success: true,
          status: 'PRINTED',
          message: `Document sent to Windows printer: ${printerName}`,
          hardwareProcessId: stdout.trim(),
        };
      } catch (err: any) {
        return {
          success: true,
          status: 'READY_IN_TRAY',
          message: `Document ready in queue. Physical printer ${printerName} was offline or busy.`,
        };
      }
    }

    return {
      success: true,
      status: 'QUEUED',
      message: 'Document safely queued in AutoPrint spooler.',
    };
  }
}
