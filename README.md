# AutoPrint

**Touchless Kiosk & Print Shop Management System**  
*Production Release — Cross-Platform Windows & Linux*

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%207%20|%208%20|%2010%20|%2011%20|%20Linux-green.svg)](#system-architecture)
[![SDLC](https://img.shields.io/badge/Documentation-6_SDLC_Phases-orange.svg)](#the-6-sdlc-documentation-suite)

---

## 1. Executive Summary

**AutoPrint** is an offline-first print management application engineered for retail Xerox counters, stationery shops, university reprographic hubs, and print counters.

AutoPrint automates the entire walk-in counter workflow:
$$\text{Scan Shop QR} \longrightarrow \text{Enter Name} \longrightarrow \text{Upload \& Preview} \longrightarrow \text{Configure Options} \longrightarrow \text{Pay (Online / Cash)} \longrightarrow \text{8-Digit Code} \longrightarrow \text{Silent Print} \longrightarrow \text{Collect \& Purge}$$

* **Zero-Account Customer Ingress**: Walk-in customers scan the counter QR code and enter only their **Customer Name**. No registration, no passwords, no email.
* **8-Digit Collection Code**: Human-friendly numeric code (`1234 5678`) issued to the customer for instant counter verification.
* **Touchless Cash Counter Workflow**: Customer selects "Pay Cash at Counter" $\rightarrow$ Job is held in queue $\rightarrow$ Merchant verifies 8-digit code $\rightarrow$ Clicks "Cash Collected" $\rightarrow$ Automatic silent spooling.
* **Ephemeral Document Retention**: Uploaded files are permanently purged from the computer upon customer collection. Accounting and audit records remain permanently in SQLite.
* **10-Minute Dashboard Inactivity Lock**: UI locks automatically after 10 minutes of operator inactivity while background spooling continues uninterrupted.
* **100% Offline Capability**: Runs completely on the local workstation; no external cloud server or remote database required.

---

## 2. The 6 SDLC Documentation Suite

All project architecture, specifications, engineering, security, and operational guides are consolidated into **6 authoritative SDLC documents**:

| SDLC Phase | Canonical Document | Scope & Contents |
|---|---|---|
| **Phase 1: Planning & Requirements** | [📖 `01_PLANNING_AND_REQUIREMENTS.md`](docs/01_PLANNING_AND_REQUIREMENTS.md) | Business vision, problem statement, user personas, Functional Requirements Matrix (FR-01 to FR-17), NFRs, use cases, and Requirements Traceability Matrix (RTM). |
| **Phase 2: Architecture & Design** | [🏛 `02_ARCHITECTURE_AND_DESIGN.md`](docs/02_ARCHITECTURE_AND_DESIGN.md) | Multi-tier topology, process models, SQLite WAL schema, hardware printing driver abstractions, state machines, and accessible Motion Primitives. |
| **Phase 3: Implementation & Development** | [🛠 `03_IMPLEMENTATION_AND_DEVELOPMENT.md`](docs/03_IMPLEMENTATION_AND_DEVELOPMENT.md) | Technology stack rationales, mono-repo structure, complete REST API contracts, code purpose inventory, and secure coding standards. |
| **Phase 4: Testing & Security** | [🧪 `04_TESTING_AND_SECURITY.md`](docs/04_TESTING_AND_SECURITY.md) | Testing pyramid, test suite inventory (34/34 passing tests), STRIDE threat model, security controls (timing-safe auth, rate limiting), and CI/CD matrix. |
| **Phase 5: Deployment & Packaging** | [📦 `05_DEPLOYMENT_AND_PACKAGING.md`](docs/05_DEPLOYMENT_AND_PACKAGING.md) | Windows 7–11 compatibility matrix, Inno Setup 6 pipeline (`AutoPrint-Setup.exe`), portable distribution, and 20-step shop owner setup guide. |
| **Phase 6: Operations & Maintenance** | [👨‍💼 `06_OPERATIONS_AND_MAINTENANCE.md`](docs/06_OPERATIONS_AND_MAINTENANCE.md) | Merchant operations manual, duplicate print prevention, logging and monitoring, automated SQLite backups, troubleshooting guide, and product roadmap. |

---

## 3. Local Access Portals

When AutoPrint is running, the local portals are accessible in any browser:

| Portal | Default URL | Purpose |
|---|---|---|
| **Merchant Dashboard** | `http://localhost:8000` | Staff queue management, cash confirmation, printer fleet status, and settings. |
| **Customer Kiosk** | `http://localhost:7000` | Customer mobile upload wizard, print configuration, price estimate, and 8-digit code. |
| **Backend REST API** | `http://localhost:5000/api` | Core print spooler, database, rate limiter, and authentication gateway. |

### Merchant interface modes

AutoPrint keeps the browser-based Merchant Dashboard as the default interface. The native Windows launcher provides a system-tray menu for opening the Merchant Web UI and selecting the persisted interface preference:

- **Web Mode** (default): opens the existing localhost Merchant Dashboard.
- **GUI Mode**: uses the native launcher entry point while continuing to use the same Merchant UI, backend, queue, printer service, and database.

The preference is stored in `C:\ProgramData\AutoPrint\config\installation.json` and defaults to `web` for existing installations.

### Verification-page printing

In Merchant Dashboard → Settings → Print Pricing, enable **Do not print verification page** to omit the verification page from future print jobs. When disabled, AutoPrint preserves the uploaded document and appends a separate black-and-white, landscape verification page with a large collection code as the final page.

The setting is stored with the merchant print configuration and is backward-compatible with existing databases.

### System tray

The native `AutoPrint.exe` launcher supervises the backend, customer kiosk, merchant service, and optional PageKite tunnel. Its tray menu provides Merchant Web, service status, printer/payment settings, logs, restart, and exit actions. The launcher prevents duplicate service processes and keeps Web Mode available without requiring the native interface.

---

## 4. Key Development Commands

```bash
# Install dependencies across all packages
npm run install:all

# Run backend automated test suite (34 tests)
npm run test:backend

# Run full test & linting verification
npm run test:all

# Compile all components (Backend, Merchant, Customer, C# Launcher)
npm run build:all

# Build standalone Windows Inno Setup installer
powershell -File scripts/build.ps1
```

---

## 5. License

AutoPrint is released under the [Apache-2.0 License](LICENSE).
