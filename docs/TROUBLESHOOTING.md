# AutoPrint / QRPrint — Troubleshooting & Diagnostics Guide

## Common Diagnostics & Solutions

### 1. Port 4100 / 3000 / 3001 Already in Use
* **Symptom**: `EADDRINUSE: address already in use :::4100` on server startup.
* **Resolution**:
  ```cmd
  scripts\stop-all.cmd
  ```
  Or find and terminate the process holding the port:
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 4100).OwningProcess | Stop-Process -Force
  ```

---

### 2. Physical Printer Shows "Ready in Tray" Instead of Hardware Print
* **Cause**: No physical printer driver is installed or selected in Windows, or the printer is offline.
* **Behavior**: AutoPrint's `PrinterService` fails safely by queuing the watermarked PDF in `datastore/customer/documents/` and marking the status as `READY_FOR_HANDOVER` / `READY_IN_TRAY` without crashing.

---

### 3. Customer Locked in "Cash Collection Required"
* **Cause**: 3 consecutive digital/UPI attempts failed or timed out, triggering the 3-strike fail-safe lockout.
* **Resolution**:
  1. Staff opens Merchant Desktop Manager (`http://localhost:3001` or `5000`).
  2. Enters the customer's 8-digit verification code.
  3. Collects cash from the customer and confirms change calculation.
  4. System transitions to `CASH_COLLECTED` and permits document handover.

---

### 4. Health Check Fails
* **Test**:
  ```cmd
  scripts\health-check.cmd
  ```
* **Verify**: Ensure the backend Node service is running (`apps\backend`) and `datastore/backend/database/autoprint.db` has write permissions.
