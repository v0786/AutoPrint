# AutoPrint / QRPrint — Production Readiness & Reorganization Report

**Document Date**: September 2, 2026  
**System Version**: v2.0.0 Production  
**Repository Architecture**: Unified Workspace with Dedicated Datastore & Windows Installer  

---

## 1. Original Structure Summary
Prior to reorganization, the repository contained a mix of active source code, legacy standalone frontend clones, historical snapshots, and root startup scripts:
* `AutoPrint full app/` (Active integrated application workspace)
* `customer web interface/` (Legacy standalone customer kiosk repo)
* `merchant-desktop-print-job-manager/` (Legacy standalone merchant desk repo)
* `AUTOPRINT fixed/` (Historical development snapshot)
* `shared/` & root `.bat`/`.vbs` scripts

Persistent data was stored in an ad-hoc fashion, and file paths had mixed hardcoded Windows path assumptions.

---

## 2. Final Architecture & Structure
The codebase has been reorganized into a modular, production-safe structure separating source code, runtime data, connectors, installer, assets, and documentation:

```
E:\Project\AutoPrint\
├── apps\                          # Active Application Code
│   ├── backend\                   # Persistent SQLite REST API Engine (Port 4100)
│   ├── customer-web\              # Customer Kiosk React/Vite Interface (Port 3000 / 8085)
│   └── merchant-desktop\          # Merchant Desktop Print Manager (Port 3001 / 5000)
│
├── datastore\                     # Dedicated Persistent Runtime Data
│   ├── customer\
│   │   ├── uploads\               # Raw uploaded customer documents
│   │   └── documents\             # Watermarked, stamped PDF documents
│   ├── merchant\
│   │   ├── jobs\                  # Job metadata & batch logs
│   │   ├── transactions\          # Transaction archives
│   │   └── cash\                  # Cash collection records
│   ├── backend\
│   │   ├── database\              # SQLite Database (autoprint.db WAL mode)
│   │   ├── audit\                 # Append-only compliance audit logs
│   │   └── logs\                  # Server diagnostics & access logs
│   ├── connectors\                # Spool queue cache & connector state
│   ├── backups\                   # Automated installer & system backups
│   └── temp\                      # Scratch space for multipart uploads
│
├── connectors\                    # Modular Hardware & Service Connectors
│   ├── printer\                   # Windows Spooler & thermal ESC/POS adapter
│   ├── payment\                   # UPI 2.0 Intent & dynamic QR generator
│   └── storage\                   # Datastore filesystem & boundary guard
│
├── installer\                     # Production-Safe Windows CMD Installer Wizard
│   ├── install.cmd                # Main interactive wizard (7 modes + dry-run)
│   ├── uninstall.cmd              # Safe uninstaller (preserves datastore by default)
│   ├── repair.cmd                 # Verification & rebuild script
│   ├── backup.cmd                 # Standalone datastore backup script
│   ├── restore.cmd                # Backup restoration utility
│   ├── migrate.cmd                # Directory validation script
│   ├── lib\                       # Modular CMD routines (checks, logging, common UI)
│   ├── config\                    # Installer defaults (installer-defaults.json)
│   └── logs\                      # Timestamped installer audit logs
│
├── assets\                        # Application Branding
│   ├── app-icon.png               # High-resolution printer logo
│   └── logo.png                   # Header branding logo
│
├── docs\                          # Comprehensive System Documentation
│   ├── ARCHITECTURE.md
│   ├── PROJECT_STRUCTURE.md
│   ├── INSTALLATION.md
│   ├── CONFIGURATION.md
│   ├── DATASTORE.md
│   ├── BACKUP_AND_RECOVERY.md
│   ├── TROUBLESHOOTING.md
│   ├── CONNECTORS.md
│   └── PRODUCTION_READINESS_REPORT.md
│
├── scripts\                       # Operational Scripts (start-all, stop-all, health-check)
├── unused files\                  # Safely Archived Legacy Files (100% Data Preservation)
├── .env.example                   # Centralized environment template
├── package.json                   # Root workspace orchestrator
└── README.md
```

---

## 3. Files Moved & Archived
* `customer web interface` $\rightarrow$ `unused files/old-standalone-repos/customer-web-legacy`
* `merchant-desktop-print-job-manager` $\rightarrow$ `unused files/old-standalone-repos/merchant-desktop-legacy`
* `AUTOPRINT fixed` $\rightarrow$ `unused files/old-snapshots/AUTOPRINT-fixed`
* `shared` $\rightarrow$ `unused files/duplicate-files/shared`
* Legacy `.bat`/`.vbs` $\rightarrow$ `unused files/old-scripts/`
* Complete migration index recorded in `unused files/migration-manifest.json` and documented in `unused files/README.md`.

---

## 4. Backend Enhancements
* **Database Persistence**: Integrated `better-sqlite3` in WAL journal mode with automatic migrations in `datastore/backend/database/autoprint.db`.
* **HMAC-SHA256 Security**: Replaced fake hashes with genuine `crypto.createHmac('sha256', secret)` with `timingSafeEqual` comparison over canonical payloads `CODE:JOB_ID:AMOUNT_MINOR_UNITS`.
* **8-Digit Verification Codes**: Rejection-sampled cryptographic randomness eliminating modulo bias with collision retries.
* **Real PDF Watermarking**: `PdfOverlayService` applies physical OCR stamps to the final page of actual PDF files using `pdf-lib`.
* **Integer Minor-Unit Money**: All financial arithmetic uses integer minor units (paise/cents).
* **3-Strike Fail-Safe Lockout**: Strikes 1 & 2 log digital failure; Strike 3 triggers `CASH_LOCKED`; Strike 4 is rejected with HTTP 403.
* **Defensive Error Handling**: Centralized error middleware mapping unhandled exceptions to HTTP 500 while concealing internal stack traces in production.

---

## 5. Frontend & Connector Integration
* **Customer Kiosk**: Full multipart file streaming to `POST /api/jobs`, authentic server-generated verification code display, and real-time polling of backend print status.
* **Merchant Desktop**: Live 8-digit verification code lookup via `GET /api/verification/lookup/:code`, atomic cash collection dialog, physical handover confirmation, and audit trail inspection.
* **Branding**: Integrated high-resolution user-uploaded printer logo into `assets/app-icon.png`, customer web favicon/headers, and merchant desktop interface.

---

## 6. Datastore Lifecycle & Backup Management
* Persistent data cleanly isolated in `datastore/`.
* Automated timestamped backups created prior to every installation, upgrade, or repair in `datastore/backups/backup-YYYYMMDD-HHMMSS/`.
* Safe uninstaller prompts the operator and retains `datastore/` by default.

---

## 7. Windows Installer Wizard
* Full interactive Windows Command Prompt (CMD) wizard (`installer/install.cmd`).
* Checks Windows environment, Node.js runtime ($\ge$ v18), npm, port availability (4100, 3000, 3001), and write permissions.
* 7 Operation modes: Fresh Install, Upgrade, Repair, Reorganize, Backup, Uninstall, and Dry-Run Preview.
* Prompts for explicit user confirmation before every disk modification and logs all events to `installer/logs/`.

---

## 8. Test Execution & Verification Results

```
▶ === AUTOPRINT BACKEND TEST SUITE ===
  ✔ 1. Job Creation and Retrieval (114.5ms)
  ✔ 2. Verification Code Generation & Lookup (15.5ms)
  ✔ 3. HMAC Checksum Validation (0.9ms)
  ✔ 4. Fail-Safe 3-Strike Digital Payment Lockout & Rejection of 4th Attempt (44.9ms)
  ✔ 5. Successful UPI Payment Flow and Prevention of Duplicate Payment (15.4ms)
  ✔ 6. Cash Collection Validation, Change Calculation, & Duplicate Prevention (13.9ms)
  ✔ 7. Handover Workflow & Duplicate Handover Prevention (15.8ms)
  ✔ 8. Real PDF Watermarking Stamp Verification (29.4ms)
  ✔ 9. Persistent Audit Logging (13.1ms)
  ✔ 10. Persistence Across Simulated Reconnection (1.4ms)
✔ === AUTOPRINT BACKEND TEST SUITE === (268.8ms)

ℹ tests 11, pass 11, fail 0
```

* **Build Results**:
  - `apps/backend`: TypeScript compilation passed.
  - `apps/customer-web`: Vite production build passed (dist/ assets generated).
  - `apps/merchant-desktop`: Vite production build passed (dist/ assets generated).

---

## 9. Production Readiness Evaluation

| Subsystem | Readiness Status | Operational Notes |
| :--- | :--- | :--- |
| **Backend Service** | `READY` | SQLite persistence, Zod validation, HMAC security, error shielding. |
| **Customer Frontend** | `READY` | Real document upload, live polling, authentic code rendering. |
| **Merchant Desktop** | `READY` | Real-time code lookup, cash collection, handover, audit trails. |
| **Database** | `READY` | SQLite WAL mode, schema migrations, foreign keys. |
| **Datastore** | `READY` | Clear separation between persistent data and application code. |
| **Installer** | `READY` | Interactive CMD wizard with dry-run, backups, checks, and logs. |
| **Security** | `READY` | True HMAC-SHA256, integer minor units, input validation, CORS whitelist. |
| **Printing** | `READY WITH CAVEATS` | Spooler queue ready; requires physical printer driver for hardware output. |
| **Payment Gateway** | `READY WITH CAVEATS` | 3-strike logic & cash collection ready; external UPI bank gateway webhook credentials needed for automated settlement. |

---

## 10. Operational Instructions

### Start Services
```powershell
scripts\start-all.cmd
```

### Stop Services
```powershell
scripts\stop-all.cmd
```

### Run Health Check
```powershell
scripts\health-check.cmd
```

### Launch Installer Wizard
```cmd
installer\install.cmd
```
