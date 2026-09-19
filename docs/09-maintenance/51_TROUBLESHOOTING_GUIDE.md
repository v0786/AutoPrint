# AutoPrint — Diagnostic & Troubleshooting Guide

**Document ID**: 09-51  
**Category**: Maintenance  

---

## 1. Quick Diagnostic Table

| Symptom | Probable Cause | Corrective Action |
|---|---|---|
| **Customer phone cannot connect to Kiosk URL** | Phone and PC are on different Wi-Fi networks; or Windows Firewall blocked port 7000. | 1. Ensure phone is on the shop's Wi-Fi router.<br>2. Open Windows Firewall $\rightarrow$ Inbound Rules $\rightarrow$ Allow port 7000 TCP.<br>3. Verify PC's LAN IP address in Dashboard Settings. |
| **Job stuck in "Waiting" / Not printing** | Job was submitted as "Pay Cash at Counter". | Operator must enter the customer's 8-digit Collection Code in Merchant Dashboard and click **"CASH COLLECTED"**. |
| **Printer status shows "OFFLINE"** | USB cable loose, printer powered off, or paper tray empty. | 1. Check printer power and USB connection.<br>2. Print a Windows test page from Windows Control Panel.<br>3. Click "Refresh Printers" in Merchant Dashboard. |
| **Paper Jam during printing** | Hardware jam inside printer rollers. | 1. Clear paper jam from printer.<br>2. In Dashboard, click the failed job.<br>3. Inspect output tray: if partial sheets emerged, note missing pages.<br>4. Check *"NO PRINT RECEIVED"* and click **Retry Print**. |
| **Dashboard locked and password forgotten** | Operator forgot master password. | Click "Forgot Password" on lock screen $\rightarrow$ Enter the 24-character **Emergency Recovery Code** saved during setup $\rightarrow$ Set a new password. |

---

## 2. One-Click Diagnostic Bundle Export

If contacting support:
1. Open Merchant Dashboard $\rightarrow$ Settings $\rightarrow$ **Diagnostics**.
2. Click **[Export Diagnostic Bundle]**.
3. AutoPrint automatically generates a sanitized zip file `autoprint-diagnostics-<date>.zip` containing recent application and spooler logs (with all merchant passwords and secrets completely scrubbed).
