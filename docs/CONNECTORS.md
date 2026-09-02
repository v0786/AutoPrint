# AutoPrint / QRPrint — Connectors Manual

The `connectors/` layer bridges the AutoPrint backend with hardware printers, UPI gateways, and filesystem/cloud storage.

## 1. Printer Connector (`connectors/printer/windowsSpoolerConnector.ts`)
* **Purpose**: Dispatches print jobs to Windows Spooler (`winspool`) or ESC/POS thermal printers.
* **API**:
  ```ts
  WindowsSpoolerConnector.getInstalledPrinters(): Promise<PrinterDevice[]>
  WindowsSpoolerConnector.dispatchPrint(filePath: string, printerName?: string): Promise<PrintJobDispatchResult>
  ```
* **Fallback**: When running in virtual/headless mode, gracefully queues jobs with `READY_IN_TRAY` status.

---

## 2. Payment Connector (`connectors/payment/upiIntentConnector.ts`)
* **Purpose**: Generates standard NPCI UPI 2.0 intent deep links and dynamic QR payloads.
* **API**:
  ```ts
  UpiIntentConnector.generateIntent(config: UpiSessionConfig): UpiIntentResult
  ```

---

## 3. Storage Connector (`connectors/storage/datastoreStorageConnector.ts`)
* **Purpose**: Safely streams and persists customer documents in the `datastore/` hierarchy with traversal assertions.
* **API**:
  ```ts
  DatastoreStorageConnector.saveFile(subDir: string, fileName: string, buffer: Buffer): string
  DatastoreStorageConnector.readFile(filePath: string): Buffer
  DatastoreStorageConnector.fileExists(filePath: string): boolean
  ```
