# QRPrint — Dependency Audit & Justification Report

**Date**: September 2026  
**Status**: Verified & Compliant with Offline Product Requirements  

Every retained dependency in QRPrint has been audited to ensure it directly serves the core product requirements (document printing, spooler integration, local verification, QR generation, local pricing, persistence, and accessible motion).

---

## 1. Root Workspace (`package.json`)

| Package / Script | Classification | Justification & Purpose | Runtime Necessity |
|---|---|---|---|
| `autoprint-workspace` | Root Manifest | Coordinates mono-repo multi-target builds (`backend`, `merchant-desktop`, `customer-web`, `launcher`). Provides unified testing and packaging scripts. | Build/Dev Only |

---

## 2. Backend Engine (`app/backend/package.json`)

### 2.1 Production Dependencies
| Package | Version | Justification & Product Requirement | Runtime Necessity |
|---|---|---|---|
| `better-sqlite3` | `^13.0.3` | High-performance synchronous SQLite 3 database driver. Implements local ACID storage for jobs, pricing settings, and diagnostic logs in WAL mode without network overhead (Req 9). | **Critical Runtime** |
| `express` | `^4.19.2` | Lightweight HTTP server hosting local REST API endpoints (`/api/jobs`, `/api/printers`, `/api/config`) and serving pre-compiled static frontend bundles (Req 10, 11). | **Critical Runtime** |
| `cors` | `^2.8.5` | Enforces exact origin validation ensuring only local merchant browsers and LAN customer kiosks access API endpoints (Req 10, 13). | **Critical Runtime** |
| `dotenv` | `^16.4.5` | Loads environment configuration variables (ports, datastore directory paths, CORS origins) from local `.env` (Req 9, 10). | **Critical Runtime** |
| `multer` | `^2.3.0` | Secure multipart/form-data handler for customer file uploads. Enforces disk storage limits (50MB) and filename sanitization (Req 1, 13). | **Critical Runtime** |
| `pdf-lib` | `^1.17.1` | Embedded PDF processing engine. Extracts exact page counts, verifies PDF structure, and stamps verification codes on printed output (Req 1, 8). | **Critical Runtime** |
| `qrcode` | `^1.5.3` | Generates high-resolution PNG data URLs and SVG vectors for customer kiosk URLs and printable counter standees (Req 7). | **Critical Runtime** |
| `zod` | `^4.5.4` | TypeScript-first schema validation library ensuring all incoming JSON payloads are sanitized and strongly typed before reaching services (Req 13). | **Critical Runtime** |

### 2.2 Development Dependencies
| Package | Version | Justification |
|---|---|---|
| `typescript` | `^5.4.5` | Compiles TypeScript source files to optimized Node.js JavaScript in `dist/`. |
| `ts-node-dev` | `^2.0.0` | Rapid development hot-reloading server for backend engineers. |
| `@types/*` | Various | Type declarations for Node, Express, SQLite, CORS, Multer, and QRCode. |

---

## 3. Merchant Desktop Application (`app/merchant-desktop/package.json`)

### 3.1 Production Dependencies
| Package | Version | Justification & Product Requirement | Runtime Necessity |
|---|---|---|---|
| `react` & `react-dom` | `^19.0.1` | Core UI library powering the reactive merchant management dashboard (Req 5, 6, 12). | **Critical Runtime** |
| `motion` | `^12.23.24` | Modern animation engine powering Motion Primitives (`AnimatedGroup`, `InView`, `TextEffect`, `Disclosure`). Ensures zero-jank queue transitions (Req 12, 13). | **Critical Runtime** |
| `lucide-react` | `^0.546.0` | Lightweight SVG icon library for printer status, queue operations, metrics, and navigation (Req 12). | **Critical Runtime** |
| `qrcode.react` | `^4.2.0` | Vector SVG QR renderer for live display and instant printing of the counter standee QR code (Req 7). | **Critical Runtime** |
| `@tailwindcss/vite` | `^4.1.14` | Vite plugin for Tailwind CSS v4 design tokens and styling (Req 12). | **Build Runtime** |

### 3.2 Development Dependencies
| Package | Version | Justification |
|---|---|---|
| `vite` | `^6.2.3` | Next-generation frontend bundler producing minified static assets in `dist/`. |
| `typescript` | `~5.8.2` | Type-checking and code quality enforcement. |
| `tailwindcss` | `^4.1.14` | Utility-first CSS framework for consistent shop UI. |

---

## 4. Customer Kiosk Application (`app/customer-web/package.json`)

### 4.1 Production Dependencies
| Package | Version | Justification & Product Requirement | Runtime Necessity |
|---|---|---|---|
| `react` & `react-dom` | `^19.0.1` | Core UI library for the customer upload and configuration wizard (Req 1, 12). | **Critical Runtime** |
| `motion` | `^12.23.24` | Powers customer wizard step transitions, headline text reveals, and dropzone micro-interactions (Req 12). | **Critical Runtime** |
| `pdfjs-dist` | `^4.10.38` | Mozilla's client-side PDF renderer used to accurately calculate page counts and render preview pages in the browser before upload (Req 1, 8). | **Critical Runtime** |
| `docx-preview` | `^0.4.0` | Client-side Word document reader allowing customer page inspection without requiring MS Office (Req 1). | **Critical Runtime** |
| `canvas-confetti` | `^1.9.4` | Lightweight micro-animation celebrating successful verification code generation (Req 12). | **Non-blocking UI** |
| `lucide-react` | `^0.546.0` | Accessible icons for file dropzone, color toggles, and payment options (Req 12). | **Critical Runtime** |

---

## 5. Native Binaries & System Tools

| Tool | Location | Purpose |
|---|---|---|
| `AutoPrint.exe` | `src-launcher/` | Native C# .NET 4.5.2 system tray manager and process supervisor. Compatible with Windows 7, 10, and 11 out-of-the-box. |
| `SumatraPDF.exe` | `tools/sumatrapdf/` | High-speed, headless Win32 PDF printing executable providing direct spooler dispatch without opening GUI windows. |
| `pagekite.py` | `tools/pagekite/` | Optional reverse-proxy script preserved for merchants who explicitly enable offsite tunnel access. |
| `QRPrint.iss` | `installer/` | Inno Setup 6 compiler script generating the standalone `QRPrint-Setup.exe` installer. |

---

## 6. Dependency Removal Log

- **Cloud Sync Dependencies**: Remote telemetry and sync hooks were evaluated. `CloudSyncService.ts` was deleted, eliminating unused external network loops and keeping the dependency graph 100% offline compliant.
