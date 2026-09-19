# AutoPrint — Troubleshooting & Diagnostics

Quick reference guide for common operational questions and errors.

---

## 1. Common Operational Issues

### Issue 1: Customer Phone Cannot Open Kiosk URL
* **Cause**: Phone and PC are not on the same Wi-Fi router; or Windows Firewall blocked port 7000.
* **Fix**:
  1. Verify the phone is connected to the shop's Wi-Fi network.
  2. Open Windows Firewall $\rightarrow$ Advanced Settings $\rightarrow$ Inbound Rules $\rightarrow$ Add rule allowing TCP port 7000.
  3. Verify the PC's IP address displayed in AutoPrint Settings matches the Wi-Fi router range (`192.168.x.x`).

### Issue 2: Job Stuck in "Waiting" / Not Printing
* **Cause**: The customer chose "Pay Cash at Counter", so AutoPrint holds the job until cash is received.
* **Fix**: Ask the customer for their 8-digit Collection Code $\rightarrow$ Type code in search $\rightarrow$ Click **"Cash Collected"**.

### Issue 3: Printer Shows "OFFLINE"
* **Cause**: USB cable disconnected, printer turned off, or paper tray empty.
* **Fix**:
  1. Check printer power and USB connection.
  2. Print a Windows test page from Windows Control Panel.
  3. Click **"Refresh Printers"** in AutoPrint Merchant Dashboard.

### Issue 4: Paper Jam / Duplicate Print Prevention
* **Cause**: Physical paper jam.
* **Fix**: Clear the paper jam. In the dashboard, select the failed job, check the confirmation *"NO PRINT RECEIVED"*, and click **"Retry Print"**.

---

## 2. One-Click Diagnostic Export
To share system health with technical support:
1. Go to **Settings** $\rightarrow$ **Diagnostics**.
2. Click **[Export Diagnostic Bundle]**.
3. All diagnostic logs are exported into a sanitized zip file with passwords and secrets automatically redacted.

For full technical recovery steps, see:  
👉 [**docs/09-maintenance/51_TROUBLESHOOTING_GUIDE.md**](docs/09-maintenance/51_TROUBLESHOOTING_GUIDE.md)
