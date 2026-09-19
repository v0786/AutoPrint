# AutoPrint — Printing Subsystem Architecture

**Document ID**: 03-19  
**Category**: Architecture  

---

## 1. Cross-Platform Printer Abstraction

AutoPrint decouples visual job dispatch from operating system hardware drivers using a unified printer management interface:

```typescript
export interface PrinterDevice {
  name: string;
  isDefault: boolean;
  status: 'READY' | 'PRINTING' | 'OFFLINE' | 'ERROR' | 'PAPER_JAM';
  portName?: string;
}

export interface PrintExecutionOptions {
  printerName: string;
  copies: number;
  colorMode: 'BW' | 'COLOR';
  duplexMode: 'SINGLE' | 'DOUBLE';
  paperSize: 'A4' | 'A3' | 'LETTER';
  pageRanges?: string;
}
```

---

## 2. Windows Print Subsystem (Win32 & SumatraPDF)

### 2.1 Printer Discovery via WMI
To ensure compatibility across Windows 7, 8, 10, and 11 without native C++ compilation, AutoPrint executes a fast PowerShell WMI query:
```powershell
Get-CimInstance -ClassName Win32_Printer | Select-Object Name, Default, PrinterStatus, WorkOffline, PortName
```
Status bitmasks map to standard status enums:
* `WorkOffline = True` $\rightarrow$ `OFFLINE`
* `PrinterStatus = 4` $\rightarrow$ `PRINTING`
* `PrinterStatus = 1 / 2` $\rightarrow$ `ERROR` / `UNKNOWN`
* Default $\rightarrow$ `READY`

### 2.2 Silent Headless Document Dispatch
When a job is authorized for printing, `PrinterService` invokes SumatraPDF directly:
```bash
tools\sumatrapdf\SumatraPDF.exe -print-to "<PrinterName>" -silent -print-settings "<copies>x,<duplex>,fit" "<filePath>"
```
* `-print-to "<PrinterName>"`: Directs output to the selected printer without displaying any print dialog.
* `-silent`: Suppresses all error dialogs and GUI windows.
* `-print-settings`: Passes hardware duplexing and page scaling parameters.

---

## 3. Linux Print Subsystem (CUPS)

For Linux systems, AutoPrint bridges to the Common Unix Printing System (CUPS):
1. **Discovery**: Executes `lpstat -p -d` to detect printers and default queues.
2. **Dispatch**: Executes `lp -d <PrinterName> -n <copies> -o sides=<two-sided-long-edge|one-sided> -o fit-to-page <filePath>`.
3. **Queue Monitoring**: Executes `lpq -P <PrinterName>` to detect paper-out or stalled jobs.

---

## 4. Fault Detection & Duplicate Print Prevention

If a printer runs out of paper, jams, or is disconnected mid-print:
1. The spooler reports a non-zero exit code or error event.
2. The job status updates to `FAILED`.
3. The Merchant Dashboard alerts the operator with an attention badge.
4. **Safety Lock**: The operator cannot blindly click "Retry". The dashboard displays:
   > *"Warning: The job may have partially printed. Confirm NO PRINT RECEIVED before retrying."*
5. Only upon checking this confirmation does AutoPrint re-queue the document.
