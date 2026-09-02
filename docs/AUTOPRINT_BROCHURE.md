# AUTOPRINT
### Secure Print Management & Customer Verification System

---

## 🌟 Executive Overview
**AutoPrint** is an automated kiosk and print shop desktop management platform engineered for document submission, cryptographic verification watermarking, fail-safe 3-strike payment reconciliation, and staff-governed document handover.

Designed for self-service print kiosks, university libraries, copy centers, and commercial print shops, AutoPrint eliminates unpaid printouts, prevents document mix-ups, and streamlines counter operations.

---

## 🔄 Complete System Workflow

### 1. Customer Kiosk Workflow
```
Customer Uploads Document ──► Selects Print Specs ──► Dynamic Pricing Calculated
                                                               │
                                                               ▼
Document Stamped with Watermark ◄── 8-Digit Verification Code Generated
           │
           ▼
Digital Payment (UPI/QR) ──► Verified by Server ──► Sent to Print Spooler
```
1. **Document Upload**: Customers upload PDF, DOCX, or image files at the kiosk screen.
2. **Specification Selection**: Choose color mode (B&W/Color), paper size (A4/Letter), simplex/duplex, and page ranges.
3. **8-Digit Verification Code**: The server generates a unique, cryptographically random 8-digit collection code.
4. **Physical Verification Watermark**: An OCR-ready verification stamp is automatically embedded on the bottom of the final page of the actual printable document.
5. **Payment Processing**: Customers scan a dynamic UPI QR code or pay cash at the staff counter.

---

### 2. Merchant Counter Workflow
```
Customer Presents Code ──► Staff Looks Up 8-Digit Code ──► Verifies Payment Status
                                                                   │
                                                                   ▼
Document Handed Over ◄── Physical Code Verified ◄── Cash Collected (If Required)
          │
          ▼
Transaction Logged in Immutable Audit Ledger
```
1. **Instant Code Lookup**: The cashier enters the customer's 8-digit verification code.
2. **Job Verification**: The portal displays the customer name, job number, page count, and payment state.
3. **Cash Collection & Change**: If cash is required, the cashier enters the tendered amount; the system calculates exact change and records the transaction.
4. **Handover Confirmation**: The cashier matches the 8-digit code on the printed sheet with the screen and confirms handover.

---

## 🛡️ Fail-Safe 3-Strike Digital Payment Protection

To prevent kiosk abandonment and banking gateway disputes, AutoPrint enforces a strict server-side state machine:

```
[Attempt 1: Fails/Times Out] ──► Recorded in audit log; customer prompted to retry.
[Attempt 2: Fails/Times Out] ──► Warning displayed; final digital attempt.
[Attempt 3: Fails/Times Out] ──► CASH LOCKOUT ACTIVATED:
                                 - Digital payment gateway disabled.
                                 - Job status locked to CASH_LOCKED.
                                 - Customer directed to staff counter.
                                 - 4th digital attempt is rejected by server.
```

---

## 🔒 Multi-Layer Verification Security

| Feature | Technical Implementation | Benefit |
| :--- | :--- | :--- |
| **8-Digit Code** | Rejection-sampled cryptographic random generation | Unbiased, collision-safe, human-readable code. |
| **HMAC Checksum** | Server-side `HMAC-SHA256` with timing-safe verification | Guarantees document authenticity and detects counterfeiting. |
| **Document Watermark** | Binary PDF modification on final page (`pdf-lib`) | Physical proof of payment and ownership on printout. |
| **Handover Guards** | Server-enforced prerequisite state verification | Prevents handing over unpaid jobs or duplicate collections. |
| **Persistent Audit** | Append-only database ledger with timestamps & actor IDs | Complete transaction traceability and dispute resolution. |

---

## 🖨️ Hardware & Print Management
* **Native Windows Spooler Integration**: Interacts directly with physical print queues (`winspool`) and thermal receipt printers.
* **Virtual Spooler Fallback**: If a printer is offline, jobs remain safely buffered with `READY_IN_TRAY` status without crashing the kiosk.

---

## 💾 Persistent Datastore & Disaster Recovery
* **SQLite 3 Engine**: Zero-configuration, ACID-compliant database with Write-Ahead Logging (`WAL`).
* **Clean Data Isolation**: User uploads, stamped documents, logs, and database records reside in `datastore/` completely separate from application binaries.
* **Automated Safety Backups**: Automated timestamped snapshots before any upgrade or repair.

---

## 🚀 Easy Deployment & One-Line Installer
AutoPrint deploys on any standard Windows 10/11 workstation with a single PowerShell command:

```powershell
irm https://raw.githubusercontent.com/v0786/AutoPrint/main/installer/bootstrap.ps1 | iex
```

### Standard Port Allocation:
* **Backend REST API Engine**: Port `5000`
* **Merchant Desktop Desk**: Port `6000`
* **Customer Kiosk Web**: Port `7000`
*(Fully configurable between 1024 and 65535 with automated port conflict detection)*

---

## 💼 Business Benefits
* **Zero Unpaid Prints**: Verification watermark and state machine prevent printouts from being released before payment.
* **Reduced Staff Workload**: Customers self-serve document uploads and specifications at the kiosk.
* **Clear Cash Accountability**: Exact change arithmetic and cashier ID logging eliminate cash drawer discrepancies.
* **Tamper-Proof Audit Trail**: Full dispute resolution records with millisecond-precision timestamps.
