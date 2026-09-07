# AutoPrint

Self-contained local print shop operating and management system.

> **Windows 7 Compatibility: Testing Required**  
> *The standalone package targets 64-bit Windows systems including Windows 7 SP1. Official certification requires running the hardware verification checklist.*

---

## Overview

**AutoPrint** is a production-grade automated kiosk and print shop desktop management system. It provides seamless document upload, real-time visual previews, physical 8-digit verification watermarking, 3-strike fail-safe payment reconciliation, and staff-governed document handover.

AutoPrint is engineered as a **100% self-contained Windows application**:
- **One Application Executable:** The operator only interacts with `AutoPrint.exe` or `AutoPrint-Setup.exe`.
- **Zero External Prerequisites:** Node.js, npm, PowerShell package managers, or Visual Studio runtimes are **never** required from customers.
- **Private Bundled Runtime:** AutoPrint executes using its own embedded 64-bit private runtime.
- **No External Batch Files:** Everything runs through the native launcher and background service orchestrator.

---

## Key Features

- **Self-Contained Application Runtime:** Embedded private Node.js engine and pre-packaged production dependencies.
- **No External Node.js Installation:** Completely isolated from system PATH and user environments.
- **No npm Commands for Customers:** Operators never run build or package manager commands.
- **Local SQLite Database:** ACID transactional database with Write-Ahead Logging (WAL) and automatic migration.
- **Customer Upload Kiosk (`:7000`):** Fast in-shop and mobile document upload, preview, and 8-digit pickup code issuance.
- **Merchant Management Desk (`:8000`):** Staff POS, queue inspection, rate cards, and physical document release.
- **Physical Printer Fleet Integration:** Direct spooler integration with Windows-detected physical laser and inkjet printers.
- **First-User Onboarding & Welcome Flow:** Guided 4-step wizard on clean installs to set up the store administrator account.
- **Remember This PC:** Secure persistent workstation sessions for trusted shop computers.
- **Optional PageKite Remote Access:** Local shop operations work completely offline; PageKite can be enabled for remote mobile uploads.
- **Factory Reset for Development & Testing:** Destructive `npm run reset` command to instantly restore a pristine, unconfigured fresh-install state.

---

## Documentation & Guides

| Document | Purpose |
| :--- | :--- |
| 📖 [**Windows 7 Installation Guide**](docs/WINDOWS_7_INSTALLATION_GUIDE.md) | Simple, non-technical setup instructions for Windows 7 (64-bit SP1) PCs. |
| 🚀 [**First-Time Setup Guide**](docs/FIRST_TIME_SETUP.md) | Visual walkthrough of the initial onboarding wizard and admin creation. |
| 🔧 [**User Troubleshooting & Diagnostics**](docs/TROUBLESHOOTING.md) | Solutions for port conflicts, offline printers, blank screens, and tunnels. |
| 🔄 [**Factory Reset Guide**](docs/FACTORY_RESET.md) | How to execute destructive factory resets for testing and quality assurance. |
| 🏛 [**System Architecture**](docs/AUTOPRINT_ARCHITECTURE.md) | In-depth technical architecture, process lifecycle, and database schemas. |

---

## Access Portals

Once AutoPrint is running, the portals are accessible via your web browser:

| Portal | Default URL | Description |
| :--- | :--- | :--- |
| **Merchant Desk** | [`http://localhost:8000`](http://localhost:8000) | Cash collection, queue inspection, printer selection, and rate cards. |
| **Customer Kiosk** | [`http://localhost:7000`](http://localhost:7000) | Document upload, layout preview, and 8-digit pickup code issuance. |
| **Backend Health** | [`http://localhost:5000/api/health`](http://localhost:5000/api/health) | Real-time service diagnostic and database status endpoint. |

---

## Physical Printer Setup

AutoPrint connects to Windows-detected physical printers:
1. Connect and turn on your printer.
2. Ensure the official manufacturer driver is installed and prints a test page from Windows **Devices and Printers**.
3. Open the AutoPrint Merchant Desk $\rightarrow$ **Settings** $\rightarrow$ **Printers**.
4. Select your physical printer as default and click **Print Test Page**.

---

## Development & Maintenance Commands

For developers and system administrators working directly with the source code:

```bash
# Build all workspaces (Backend, Customer Web, Merchant Desktop)
npm run build:all

# Destructive factory reset (interactive confirmation)
npm run reset

# Destructive factory reset (non-interactive / automated)
npm run reset -- --force

# Compile the standalone Windows installer
powershell -File scripts/build-installer.ps1
```
