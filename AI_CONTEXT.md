# AutoPrint — AI Context & Architectural Grounding

This file provides system context, architectural constraints, domain boundaries, and operational directives for AI agents, developers, and tools working on the **AutoPrint** codebase.

---

## 1. Product Identity & Definition

* **Product Name**: **AutoPrint** (Never refer to the product as "QRPrint"; QR is strictly an ingress mechanism, not the product name).
* **Domain**: Fast, touchless printing kiosk and shop management system for Xerox, copy shops, stationery retailers, and self-service print hubs.
* **Core Problem Solved**: Eliminates long customer queues, messy manual file handling via WhatsApp/email, separate cash/UPI calculations, and chaos during print pickup.
* **Core Flow**: Customer scans permanent Shop QR $\rightarrow$ Lands on Customer Kiosk $\rightarrow$ Enters Customer Name $\rightarrow$ Uploads Documents $\rightarrow$ Configures Options & Previews $\rightarrow$ Confirms $\rightarrow$ Pays Online or Selects Cash $\rightarrow$ Receives 8-Digit Collection Code $\rightarrow$ Silent Background Print $\rightarrow$ Handover & Collection.

---

## 2. Supported Environments & Compatibility Constraints

### Windows (Primary Production Target)
* **Windows 7 (SP1 64-bit)**: Strictly supported out-of-the-box. Uses .NET Framework 4.5.2 launcher, Win32 spooler, and headless SumatraPDF.
* **Windows 8 / 8.1**: Fully supported.
* **Windows 10 / 11**: Fully supported.

### Linux (Target Architecture)
* **Distributions**: Ubuntu / Debian-based distributions.
* **Printing Subsystem**: CUPS (`lp`, `lpoptions`, `lpstat`).
* **Desktop Environments**: GNOME, KDE, XFCE.

---

## 3. Technology Stack & Process Model

| Tier | Component | Technology | Role |
|---|---|---|---|
| **Supervisor / Tray** | `AutoPrint.exe` | C# .NET 4.5.2 (WinForms) | Silent process launcher, system tray monitor, watchdog. |
| **Backend Engine** | `app/backend` | Node.js, Express, TypeScript | REST API (:5000), file storage, verification code engine, SQLite DB. |
| **Merchant Desktop** | `app/merchant-desktop` | React 19, Vite, Tailwind CSS v4, Motion | Local operator management dashboard (:8000 / localhost). |
| **Customer Kiosk** | `app/customer-web` | React 19, Vite, Tailwind CSS v4, Motion | Customer upload & configuration wizard (:7000 / LAN / PageKite). |
| **Storage Engine** | `autoprint.db` | SQLite 3 in WAL Mode (`better-sqlite3`) | High-concurrency local relational persistence. |
| **Print Spooling** | Windows Spooler / SumatraPDF | Win32 GDI / WMI / SumatraPDF CLI | Headless, silent direct document printing. |
| **Tunnel / Ingress** | PageKite Connector | Python / Subprocess connector | Exposes customer kiosk port 7000 over secure public URL. |

---

## 4. Architectural Boundaries & Non-Negotiable Rules

1. **No Cloud Dependencies**: AutoPrint operates 100% locally and offline. WAN disconnection must never impede in-shop printing, cash collection, or queue management.
2. **Strict Layer Separation**:
   $$\text{Presentation (React UI)} \longrightarrow \text{REST API / Services} \longrightarrow \text{Repositories / Printer Abstraction} \longrightarrow \text{SQLite / OS Spooler}$$
   UI components must never touch SQLite, the filesystem, or OS APIs directly.
3. **Identifiers**:
   * **Internal Job ID**: UUID/Database key (`AP-XXXXXXXX`) used by backend and merchant records.
   * **Collection Code**: Exactly 8 numeric digits (`12345678`) used by the customer for counter verification.
4. **Document Privacy & Ephemeral Storage**:
   * For normal print jobs, the merchant does not view uploaded documents.
   * Original uploaded files in `datastore/uploads/` are permanently **deleted** upon physical pickup/collection.
   * Completed job metadata remains permanently in SQLite for accounting and auditing.
5. **Duplicate Print Protection**:
   * Retrying a failed or paused print job requires explicit confirmation ("NO PRINT RECEIVED") from the merchant to prevent paper waste and double billing.
6. **Inactivity Lock**:
   * Merchant dashboard automatically locks after 10 minutes of inactivity. Background print spooling and customer kiosk ingress continue unimpeded while locked.

---

## 5. Directory Blueprint

```text
AutoPrint/
├── apps/                         # Modular frontends (Customer Kiosk & Merchant Desktop)
│   ├── customer-web/             # Port 7000 customer kiosk
│   └── merchant-desktop/         # Port 8000 merchant dashboard
├── app/                          # Production workspace packages
│   ├── backend/                  # Port 5000 REST API and print services
│   ├── customer-web/             # Vite/React customer upload app
│   └── merchant-desktop/         # Vite/React merchant dashboard
├── docs/                         # Canonical product & technical documentation
│   ├── 00-foundation/            # Vision, principles, problem definition
│   ├── 01-requirements/          # PRD, functional specifications, user stories
│   ├── 02-design/                # Workflows, UX models, database schema
│   ├── 03-architecture/          # Technical & printing subsystem architecture
│   ├── 04-integration/           # PageKite, payments, hardware interfaces
│   ├── 05-security/              # Threat models, crypto, data privacy
│   ├── 06-quality/               # Test plans, QA standards, benchmarks
│   ├── 07-deployment/            # Windows/Linux setup, fresh PC setup, compatibility
│   ├── 08-operations/            # Logging, monitoring, telemetry
│   ├── 09-maintenance/           # Backup, disaster recovery, troubleshooting
│   ├── 10-management/            # Traceability matrix, product roadmap
│   └── master/                   # Unified master specifications
├── installer/                    # Inno Setup Windows installer scripts
├── release/                      # Packaged release executables and setup bundles
├── scripts/                      # Build, test, clean, and run scripts
├── src-launcher/                 # Native C# launcher (AutoPrint.exe)
├── tools/                        # Bundled binaries (SumatraPDF, PageKite)
└── tests/                        # Automated unit, integration, and security suites
```
