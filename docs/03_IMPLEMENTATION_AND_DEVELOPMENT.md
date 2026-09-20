# AutoPrint — SDLC Phase 3: Development & Implementation Guide

**Document Reference**: SDLC-DOC-03  
**Phase**: 3 — Software Construction, Codebase Inventory & Engineering Specifications  
**Product**: AutoPrint  
**Version**: 2.0.0 (Production Release)  

---

## 1. Technology Stack Decisions & Rationale

| Layer / Component | Technology | Version | Rationale & Trade-Offs |
|---|---|---|---|
| **System Tray Supervisor** | C# .NET Framework | 4.5.2 | Pre-installed natively on Windows 7 SP1, 8, 10, and 11. Compiles with Windows native `csc.exe` with zero external runtime installations. |
| **Backend Engine** | Node.js / Express | v18–v22 LTS | High-throughput async I/O for streaming file uploads and stable native C++ SQLite bindings. |
| **Language** | TypeScript | v5.4 / v5.8 | End-to-end type safety across domain models, API routes, and frontends. |
| **Local Database** | `better-sqlite3` | ^13.0.3 | High-performance synchronous SQLite driver operating in WAL mode without TCP network overhead. |
| **Frontends** | React / Vite | v19.0 / v6.2 | Modern reactive UI for real-time queue state with rapid sub-second build times. |
| **Styling & Motion** | Tailwind CSS / Motion | v4.1 / v12.23 | Utility-first responsive design tokens and spring-physics Motion Primitives. |
| **PDF Print Engine** | SumatraPDF CLI | Portable Win32 | Lightweight (7 MB) headless Win32 direct spooler printing without Adobe Reader dependencies. |

---

## 2. Mono-Repo Architecture & Workspace Structure

AutoPrint is organized as a unified multi-package workspace:

```text
AutoPrint/
├── app/
│   ├── backend/                  # Express REST API, SQLite DB, Printer Spooler (:5000)
│   │   ├── src/
│   │   │   ├── config/           # Environment defaults and path resolutions
│   │   │   ├── connectors/       # External integration adapters
│   │   │   ├── controllers/      # Route handlers for jobs, printers, auth, setup
│   │   │   ├── database/         # SQLite schema initialization and repositories
│   │   │   ├── middleware/       # Bearer auth, rate limiting, error handlers
│   │   │   ├── services/         # Job lifecycle, pricing, printer, QR code engine
│   │   │   └── server.ts         # Server bootstrapper and static asset server
│   │   └── package.json
│   │
│   ├── customer-web/             # Customer Kiosk SPA (:7000)
│   │   ├── src/
│   │   │   ├── components/       # Modals (Upload, Config, Payment, Success)
│   │   │   │   └── motion-primitives/ # Reusable accessible motion components
│   │   │   ├── context/          # PrintJob state context
│   │   │   └── services/         # PDF.js page counting and upload client
│   │   └── package.json
│   │
│   └── merchant-desktop/         # Merchant Management Dashboard (:8000)
│       ├── src/
│       │   ├── components/       # Queue table, fleet status, settings, diagnostics
│       │   │   └── motion-primitives/ # Reusable accessible motion components
│       │   └── services/         # Authenticated merchant API client
│       └── package.json
│
├── src-launcher/                 # Native C# launcher (AutoPrint.exe)
│   ├── Program.cs                # System tray host, process supervisor, menu
│   └── app.manifest              # DPI awareness and execution level
├── installer/                    # Inno Setup 6 packaging scripts (AutoPrint.iss)
├── tools/                        # Bundled binaries and system utilities
├── docs/                         # Canonical SDLC documentation
└── package.json                  # Root orchestration scripts
```

---

## 3. REST API Contracts & Endpoint Specifications

All endpoints return JSON responses conforming to `{ ok: boolean, data?: any, error?: string }`.

### 3.1 Customer Kiosk Endpoints
* `POST /api/jobs`
  * **Payload**: `multipart/form-data` containing `file` (document binary), `customerName`, `printSettings` JSON.
  * **Response**: `{ ok: true, data: { id: "AP-CC15022B", jobNo: "#1003", verificationCode: "74812740", totalPrice: 18.0 } }`.
* `GET /api/jobs/:id`
  * **Response**: Real-time status (`QUEUED`, `PRINTED`, `FAILED`, `COLLECTED`).
* `GET /api/config/public`
  * **Response**: Shop name, currency, paper rates, and hosted-store or LAN customer URL.
* `GET /api/config/qr-code`
  * **Response**: PNG data URL or SVG vector of the counter standee QR code.

### 3.2 Merchant Management Endpoints
* `POST /api/auth/login`
  * **Payload**: `{ username, password }`. Returns session token.
* `GET /api/jobs`
  * **Headers**: `Authorization: Bearer <token>`. Returns active and historical jobs.
* `GET /api/jobs/search/:code`
  * **Rate Limited**: Maximum 10 requests/minute per IP. Looks up job by 8-digit code.
* `POST /api/jobs/:id/cash-collected`
  * **Effect**: Transitions job from `CASH_HELD` to `QUEUED` and dispatches silent printing.
* `POST /api/jobs/:id/collected`
  * **Effect**: Marks job as complete and unlinks original uploaded file from disk.
* `GET /api/jobs/:id/download`
  * **Access Gate**: Permitted only if `modification_required == 1`.
* `GET /api/printers`
  * **Response**: List of detected Windows/Linux printers with hardware status.

---

## 4. Coding Standards & Security Patterns

### 4.1 Shell Injection Prevention
Operating system commands (PowerShell, SumatraPDF, CUPS) must never use shell string concatenation. Commands use parameterized argument arrays:
```typescript
// SECURE: Argument array prevents shell injection
execFile(sumatraPath, [
  '-print-to', sanitizedPrinterName,
  '-silent',
  '-print-settings', `${copies}x,fit`,
  sanitizedFilePath
], { windowsHide: true });
```

### 4.2 Constant-Time Authentication
Token and password comparisons use `crypto.timingSafeEqual` to prevent side-channel timing attacks:
```typescript
export function timingSafeMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
```

### 4.3 Sliding-Window Rate Limiting
Protection on `/api/jobs/search/:code` blocks brute-force code guessing:
```typescript
export const codeSearchLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: 'Too many verification code attempts. Please wait 1 minute.'
});
```

---

## 5. Developer Workflow & Build Commands

```bash
# 1. Install dependencies across mono-repo
npm run install:all

# 2. Run backend in development hot-reload mode
npm run dev:backend

# 3. Run merchant desktop frontend (Port 8000)
npm run dev:merchant

# 4. Run customer kiosk frontend (Port 7000)
npm run dev:customer

# 5. Execute backend test suite
npm run test:backend

# 6. Full lint and type check
npm run test:all

# 7. Compile all production bundles and native C# launcher
npm run build:all

# 8. Package Windows Inno Setup installer
powershell -File scripts/build.ps1
```
