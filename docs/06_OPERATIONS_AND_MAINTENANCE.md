# AutoPrint — SDLC Phase 6: Operations, Maintenance & User Manual

**Document Reference**: SDLC-DOC-06  
**Phase**: 6 — System Operation, Routine Maintenance, Troubleshooting & Roadmap  
**Product**: AutoPrint  
**Version**: 2.0.0 (Production Release)  

---

## 1. Merchant Operations Manual

### 1.1 Daily Counter Workflows
* **Starting the Shop**: Power on the computer. `AutoPrint.exe` launches automatically in the Windows system tray. Open `http://localhost:8000` in Google Chrome or Microsoft Edge.
* **Cash Collection Workflow**:
  1. Customer arrives at the counter and states their **8-digit Collection Code** (e.g. `4829 1039`).
  2. Operator enters `48291039` into the Dashboard Search Bar.
  3. Job details appear: Customer Name, Document Name, Page Count, Copies, Color Mode, and Amount.
  4. Operator accepts cash and clicks **[Cash Collected]**.
  5. The document spools silently to the printer.
* **Document Handover & Purge**:
  1. Once the physical sheets emerge from the printer, verify page counts.
  2. Hand sheets to the customer.
  3. Click **[Collected]** on the job row.
  4. AutoPrint marks the job complete and **permanently wipes the customer's uploaded file from disk**.
* **Modification Requests**:
  1. If a job displays a blue badge reading **"MODIFICATION REQUIRED"**:
  2. Click **[Download Document]** to save the file locally.
  3. Edit in Word/Photoshop, print via standard Windows dialog, and mark **[Collected]**.

### 1.2 Inactivity Lockout Management
* If no keyboard or mouse activity occurs for 10 minutes, the dashboard locks automatically.
* Background queue processing, customer uploads, and active printing **continue working** while locked.
* To unlock, enter the merchant master password or emergency recovery key.

---

## 2. Duplicate Print Prevention & Failure Recovery

If a printer runs out of paper or jams mid-print:
1. Clear the paper jam on the printer hardware.
2. In the Merchant Dashboard, click the red **FAILED** job row.
3. Check the physical output tray to verify if any pages printed.
4. Check the mandatory safety box:
   > *"I confirm that NO PRINT was received from the printer"*
5. Click **[Retry Print]** or choose an alternative printer from the dropdown and click **[Reroute & Print]**.

---

## 3. Logging, Monitoring & Audit Subsystems

### 3.1 Domain Log Channels (`C:\ProgramData\AutoPrint\logs\`)
| Log File | Retained Events |
|---|---|
| `application.log` | Server bootstrapper, HTTP requests, port bindings, runtime errors. |
| `printer.log` | WMI discovery polls, printer status bitmasks, SumatraPDF CLI execution events. |
| `security.log` | Login attempts, password changes, rate-limiting triggers, token validations. |
| `audit.log` | Permanent compliance records (cash collected, document downloaded, price changed). |

### 3.2 Log Rotation & Scrubbing
* **Rotation**: Log files rotate automatically upon reaching 10 MB (up to 5 historical archives).
* **Retention**: Archives older than 30 days are automatically deleted.
* **Sanitization Guarantee**: Secrets, passwords, API tokens, and payment credentials are automatically redacted by a regex scrubber before being written to disk.

---

## 4. Backup, Recovery & Disaster Recovery Plan

### 4.1 Automated SQLite Backups
* AutoPrint executes a non-locking online snapshot (`VACUUM INTO`) daily at 02:00 local time.
* Stored in `C:\ProgramData\AutoPrint\datastore\backups\`.
* Keeps the 7 most recent daily snapshots. Excludes temporary customer files to conserve space and protect privacy.

### 4.2 Power Outage Recovery
If the computer shuts down abruptly during printing:
1. Turn on the PC; `AutoPrint.exe` restarts automatically.
2. Backend inspects `autoprint.db`. Jobs caught in `SPOOLING` are marked with a warning flag: *"PC restarted mid-print. Please verify output before retrying."*

---

## 5. Diagnostic & Troubleshooting Quick Reference

| Symptom | Probable Cause | Corrective Action |
|---|---|---|
| **Customer cannot open Kiosk URL** | Phone is not on the shop Wi-Fi; or firewall blocked port 7000. | Ensure phone is on shop Wi-Fi. Verify Windows Firewall allows port 7000 TCP inbound. |
| **Job stuck in "Waiting"** | Customer selected "Pay Cash at Counter". | Operator must search 8-digit code and click **"Cash Collected"**. |
| **Printer shows "OFFLINE"** | USB cable disconnected, printer off, paper tray empty. | Check cables and power. Print Windows test page. Click "Refresh Printers" in dashboard. |
| **Forgotten master password** | Operator forgot login credentials. | Click "Forgot Password" on lock screen $\rightarrow$ Enter the 24-character **Emergency Recovery Code** saved during setup $\rightarrow$ Set a new password. |

### One-Click Diagnostic Export
To export logs for technical assistance:
1. Go to **Settings** $\rightarrow$ **Diagnostics**.
2. Click **[Export Diagnostic Bundle]**.
3. Generates a sanitized ZIP file `autoprint-diagnostics-<date>.zip` with all sensitive credentials automatically redacted.

---

## 6. Product Roadmap & Future Milestones

* **v2.0.0 (Current Release)**: Native Windows system tray supervisor (.NET 4.5.2), dual React 19 frontends, SQLite WAL, SumatraPDF silent spooling, Inno Setup single-EXE installer.
* **v2.1.0 (Q4 2026)**: Native Linux CUPS packaging (`.deb`), 58mm/80mm ESC/POS counter receipt printer integration, multi-language kiosk expansion (Tamil, Telugu, Marathi, Bengali).
* **v2.2.0 (Q1 2027)**: Dedicated touchscreen kiosk fullscreen mode, serial coin/note acceptor hardware interface for unattended self-service print kiosks.
