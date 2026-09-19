# QRPrint — Comprehensive Codebase Audit & Purpose Matrix

**Audit Date**: September 2026  
**Auditor**: Senior Software Architect & Lead Systems Engineer  
**Target Product**: QRPrint — Offline Windows Kiosk & Print Shop Management System  
**Supported Platforms**: Windows 7 (SP1 64-bit), Windows 10, Windows 11  

---

## 1. Architecture Assessment

### 1.1 Classification: Category C (Mixture of Offline QRPrint & Online AutoPrint Remnants)
Upon auditing the repository, the codebase was identified as **Category C (Mixture of both)**:
- **Offline QRPrint Core**:
  - Native Windows .NET 4.5.2 launcher (`AutoPrint.exe`) managing child services silently in the Windows system tray.
  - Local embedded SQLite 3 database operating in Write-Ahead Logging (`WAL`) mode located at `C:\ProgramData\AutoPrint\datastore\backend\database\autoprint.db`.
  - Windows Print Spooler (`winspool.drv`), WMI (`win32_printer`), and silent direct PDF printing via SumatraPDF CLI.
  - Customer Kiosk Web interface served over local LAN HTTP (`:7000`) and Merchant Dashboard (`:8000`).
  - Local dynamic QR code generation encoding the shop's LAN IP or station URL.
- **Online AutoPrint Remnants Identified & Addressed**:
  - `app/backend/src/services/cloudSyncService.ts`: Background worker executing every 30 seconds attempting to deliver support/diagnostic events to external cloud webhooks (`AUTOPRINT_SUPPORT_WEBHOOK_URL` / `GOOGLE_CLOUD_SUPPORT_ENDPOINT`).
  - **Remediation**: `cloudSyncService.ts` was proven obsolete for 100% offline operations. The background worker was unhooked from `app/backend/src/server.ts` and the file safely removed. Support tickets and diagnostics now persist safely and strictly in local SQLite.

---

## 2. Complete Codebase Inventory

### 2.1 Backend Services & Repositories (`app/backend`)
| Unit Name | Type | Purpose | Consumers | Requirement |
|---|---|---|---|---|
| `server.ts` | Entrypoint | Boots Express HTTP server on port 5000, initializes database, registers API routes, serves production frontends. | Windows launcher, Browsers | Req 10, 11 |
| `config/environment.ts` | Configuration | Defines environment defaults, ports (5000, 7000, 8000), directory paths in ProgramData, CORS origins. | Entire backend | Req 9, 10 |
| `database/db.ts` | Database Core | Manages SQLite connection via `better-sqlite3`, executes idempotent schema migrations, enables WAL mode. | Repositories | Req 9, 13 |
| `database/repositories/autoprintRepository.ts` | Repository | CRUD queries for print jobs, status transitions (`QUEUED`, `PRINTED`, `FAILED`, `COLLECTED`), paper format options. | `autoprintService.ts` | Req 5, 6, 9 |
| `database/repositories/feedbackRepository.ts` | Repository | Stores customer ratings and reviews; enforces pickup gating rules. | `feedbackController.ts` | Req 9 |
| `database/repositories/refundRepository.ts` | Repository | Records merchant refund requests with required operator explanations. | `refundController.ts` | Req 8, 9 |
| `database/repositories/setupRepository.ts` | Repository | Stores first-time merchant onboarding preferences, paper rates, shop credentials. | `setupController.ts` | Req 8, 9 |
| `database/repositories/supportRepository.ts` | Repository | Local support ticket storage, ticket history, diagnostic log snapshots. | `supportController.ts` | Req 9, 13 |
| `services/autoprintService.ts` | Service | Business logic for job creation, 8-digit verification code generation, pricing calculation, state flow. | `autoprintController.ts` | Req 1, 5, 6, 8 |
| `services/printerService.ts` | Service | Windows spooler integration via PowerShell/WMI, printer discovery, status check, direct SumatraPDF dispatch. | `autoprintController.ts`, `server.ts` | Req 2, 3, 4 |
| `services/pricingService.ts` | Service | Local pricing calculations for A4/A3/Letter, B&W vs Color, Single/Double sided printing. | `autoprintService.ts` | Req 8 |
| `services/qrCodeService.ts` | Service | Generates PNG Data URLs and SVG QR codes for customer onboarding and counter standees. | `tunnelService.ts`, `server.ts` | Req 7 |
| `services/tunnelService.ts` | Service | Discovers local LAN IPv4 address (`192.168.x.x`) to construct customer kiosk URLs; handles optional PageKite connector. | `server.ts` | Req 7, 10, 14 |
| `connectors/pagekiteConnector.ts` | Connector | Optional reverse proxy subprocess wrapper for operators who explicitly enable remote access. | `tunnelService.ts` | Req 14 |
| `middleware/auth.ts` | Middleware | Validates Bearer authentication tokens, enforces role-based access control (`merchant` / `admin`). | API routes | Req 10, 13 |
| `middleware/rateLimiter.ts` | Middleware | Sliding-window in-memory rate limiting preventing brute-force verification and DoS attacks. | API routes | Req 10, 13 |

---

### 2.2 Customer Web Kiosk (`app/customer-web`)
| Component / Module | Type | Purpose | Consumers | Requirement |
|---|---|---|---|---|
| `App.tsx` | Root Component | Main customer wizard layout: file upload, print configuration, price estimate, verification code display. | `main.tsx` | Req 1, 12 |
| `components/FileUploadModal.tsx` | UI Component | Drag-and-drop file upload with validation (PDF, DOCX, Images <= 50MB). | `App.tsx` | Req 1, 12 |
| `components/ConfigurationModal.tsx` | UI Component | Selection of copies, color/B&W, simplex/duplex, page ranges, and paper formats. | `App.tsx` | Req 1, 8 |
| `components/PaymentModal.tsx` | UI Component | Displays dynamic UPI QR code, cash pay-at-counter instructions, and job summary. | `App.tsx` | Req 7, 8 |
| `components/SuccessModal.tsx` | UI Component | Displays big 8-digit verification code, pickup instructions, and confetti celebration. | `App.tsx` | Req 5, 12 |
| `components/StatusModal.tsx` | UI Component | Live status tracker polling backend for spooler progress. | `App.tsx` | Req 5, 6 |
| `components/motion-primitives/` | Motion UI | Smooth, accessible animation primitives (`AnimatedGroup`, `InView`, `TextEffect`, `Disclosure`). | Customer modals | Req 12, 13 |
| `services/documentProcessor.ts` | Service | Client-side page count extraction using PDF.js and DOCX preview renderers. | `App.tsx` | Req 1, 8 |
| `utils/costCalculator.ts` | Utility | Real-time client price calculation matching backend rates. | `ConfigurationModal.tsx` | Req 8 |

---

### 2.3 Merchant Management Desktop (`app/merchant-desktop`)
| Component / Module | Type | Purpose | Consumers | Requirement |
|---|---|---|---|---|
| `App.tsx` | Root Component | Merchant dashboard displaying print queue, fleet status, revenue metrics, and operator controls. | `main.tsx` | Req 5, 6, 12 |
| `components/PrintQueue.tsx` | UI Component | Real-time table of active and completed jobs with verification code lookup and manual print trigger. | `App.tsx` | Req 5, 6 |
| `components/PrinterStatusModal.tsx` | UI Component | List of connected Windows printers with active hardware status (Idle, Printing, Paper Jam, Offline). | `App.tsx` | Req 2, 3 |
| `components/QRCodeDisplay.tsx` | UI Component | Display and printing of counter standee QR code with shop branding for customer mobile scanning. | `App.tsx` | Req 7 |
| `components/SettingsModal.tsx` | UI Component | Configuration of per-page rates, currency symbol, UPI VPA ID, default printer, and auto-print toggle. | `App.tsx` | Req 8 |
| `components/DiagnosticViewerModal.tsx` | UI Component | Operator diagnostic log inspection, system health, and one-click sanitized log exports. | `App.tsx` | Req 10, 13 |
| `components/RefundManagementModal.tsx`| UI Component | Handles operator refund workflows with required audit logging. | `App.tsx` | Req 8, 13 |
| `components/motion-primitives/` | Motion UI | Accessible Motion Primitives enhancing queue transitions, metric reveals, and accordion disclosures. | Merchant modals | Req 12, 13 |

---

### 2.4 Native Windows Integration (`src-launcher` & `installer`)
| File / Script | Type | Purpose | Requirement |
|---|---|---|---|
| `src-launcher/Program.cs` | Native C# App | Native .NET 4.5.2 system tray manager. Starts Node backend, monitors processes, provides tray menu. | Req 10, 11 |
| `installer/QRPrint.iss` | Inno Setup Script | Professional Windows setup compiler. Installs files, sets permissions on `C:\ProgramData\AutoPrint`, creates shortcuts. | Req 10, 11 |
| `tools/sumatrapdf/SumatraPDF.exe` | Binary Tool | Ultra-lightweight Win32 PDF printing engine for silent, fast document spooling without Adobe dependencies. | Req 1, 4 |
| `scripts/build.ps1` | Build Script | Automated build script compiling frontend Vite apps, backend TypeScript, C# launcher, and Inno Setup installer. | Req 11 |

---

## 3. Code Purpose Matrix

| Source File | Current Purpose | Dependencies | Consumers | QRPrint Req | Decision | Reason & Justification | Risk | Verification Method |
|---|---|---|---|---|---|---|---|---|
| `app/backend/src/server.ts` | HTTP API & static server | Express, CORS, Controllers | Launcher, Web UIs | 10, 11 | **MODIFY** | Removed cloud sync worker; verified local hosting of Vite dist assets. | Low | `npm run test:backend`, `npm run build:all` |
| `app/backend/src/services/cloudSyncService.ts` | Remote Google Cloud webhook sync | `supportRepository`, `fetch` | None | None | **DELETE** | Cloud sync violates 100% offline requirement. Local SQLite suffices. | None | Code search, test suite passes |
| `app/backend/src/services/autoprintService.ts` | Job lifecycle, verification codes | `autoprintRepository`, `printerService` | `autoprintController` | 1, 5, 6 | **KEEP** | Core printing engine logic; critical for verification and queueing. | High if modified | `npm test` (34 tests pass) |
| `app/backend/src/services/printerService.ts` | Windows printer discovery & spooling | PowerShell, SumatraPDF, `child_process` | `autoprintService`, API | 2, 3, 4 | **KEEP** | Essential hardware abstraction layer for Windows printing. | High if modified | Printer discovery API test |
| `app/backend/src/services/qrCodeService.ts` | Dynamic QR code generation | `qrcode` | `tunnelService`, API | 7 | **KEEP** | Required for kiosk onboarding QR codes and counter standees. | Low | QR generation tests |
| `app/backend/src/services/pricingService.ts` | Paper & color rate calculation | None | `autoprintService` | 8 | **KEEP** | Computes job pricing based on merchant settings. | Low | Pricing calculation tests |
| `app/backend/src/services/tunnelService.ts` | Local LAN IP discovery & URL config | `os`, `pagekiteConnector` | `server.ts` | 7, 10, 14 | **KEEP** | Auto-detects Wi-Fi LAN IP so mobile phones can connect locally. | Medium | API config endpoint test |
| `app/backend/src/connectors/pagekiteConnector.ts` | Optional PageKite reverse proxy | `child_process` | `tunnelService` | 14 | **KEEP** | Kept disabled by default; preserved only for optional remote access. | Low | Security audit test suite |
| `app/backend/src/database/db.ts` | SQLite connection & table creation | `better-sqlite3` | Repositories | 9, 10 | **KEEP** | Foundation of local persistence with WAL mode. | High | Test suite startup |
| `app/backend/src/database/repositories/*.ts` | Data access layer | `db.ts` | Controllers, Services | 5, 6, 8, 9 | **KEEP** | Enforces clean separation between DB and business services. | Medium | Test suite DB fixtures |
| `app/backend/src/middleware/auth.ts` | Token auth & timing-safe compare | `crypto` | API routes | 10, 13 | **KEEP** | Secures merchant admin routes from unauthorized local LAN access. | High | Security tests |
| `app/backend/src/middleware/rateLimiter.ts` | Memory rate limiter | None | API routes | 10, 13 | **KEEP** | Protects verification code endpoint against brute-force guessing. | Medium | Rate limiter tests |
| `app/customer-web/src/components/motion-primitives/*` | Accessible React animations | `motion`, `react` | Customer modals | 12, 13 | **KEEP** | Provides smooth step transitions respecting `prefers-reduced-motion`. | Low | `tsc --noEmit`, Vite build |
| `app/customer-web/src/App.tsx` | Customer kiosk flow | React, Lucide, Modals | Users | 1, 7, 8, 12 | **KEEP** | Primary customer UI for uploading and configuring print jobs. | High | Browser test, Vite build |
| `app/merchant-desktop/src/components/motion-primitives/*` | Accessible React animations | `motion`, `react` | Merchant modals | 12, 13 | **KEEP** | Provides queue layout transitions and accordion disclosures. | Low | `tsc --noEmit`, Vite build |
| `app/merchant-desktop/src/App.tsx` | Merchant dashboard | React, Lucide, Modals | Operators | 2, 3, 5, 6, 8 | **KEEP** | Primary operator station for queue management and printer monitoring. | High | Vite build |
| `src-launcher/Program.cs` | System tray launcher | .NET 4.5.2 WinForms | Operators | 10, 11 | **KEEP** | Single executable launcher supporting Windows 7/10/11 natively. | High | `csc.exe` build verification |
| `installer/QRPrint.iss` | Windows installer script | Inno Setup 6 | Deployment | 11 | **KEEP** | Generates standalone setup executable with prerequisites. | High | Inno Setup compilation |

---

## 4. Dead Code Removal Audit

### 4.1 Removed Units
1. **`app/backend/src/services/cloudSyncService.ts`**:
   - **Reason**: Implemented an active 30-second polling loop targeting external Google Cloud support endpoints. QRPrint is strictly an offline local product.
   - **Evidence**: Static analysis confirmed `CloudSyncService` was only called by `server.ts`. Removal does not affect any printing, verification, queue, or database features.
   - **Verification**: Executed `npm run test:backend` — all 34 tests passed with zero errors.

---

## 5. Security & Safety Compliance

1. **Path Traversal Protection**: Uploaded file paths are sanitized with `path.basename()` and UUID storage keys.
2. **Subprocess Isolation**: PowerShell printer commands use parameter arrays rather than raw string concatenation, preventing command injection.
3. **Timing-Safe Secret Verification**: Password hashes and auth tokens use `crypto.timingSafeEqual` to prevent side-channel timing attacks.
4. **Local Rate Limiting**: Verification code lookup allows maximum 10 attempts per minute per IP to block automated guessing.
5. **Sanitized Diagnostic Logs**: Diagnostic exports automatically redact passwords, API keys, and sensitive tokens before writing to disk.
