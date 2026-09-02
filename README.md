# AutoPrint / QRPrint — Automated Print Shop Management System

![AutoPrint Logo](assets/icon/app-icon.png)

**AutoPrint** is a production-grade automated kiosk and print shop desktop management system designed for document upload, physical 8-digit verification watermarking, 3-strike fail-safe payment reconciliation, and staff-governed document handover.

---

## 🚀 One-Line Web Installer (Recommended)

Run the following command in PowerShell (Run as Administrator recommended):

```powershell
irm https://raw.githubusercontent.com/v0786/AutoPrint/main/installer/bootstrap.ps1 | iex
```

*For installations targeting the `customer` branch:*
```powershell
irm https://raw.githubusercontent.com/v0786/AutoPrint/customer/installer/bootstrap.ps1 | iex
```

---

## 🌐 Default Access Portals

| Portal | Default URL | Purpose |
| :--- | :--- | :--- |
| **Customer Kiosk** | [`http://localhost:7000`](http://localhost:7000) | Document upload, specifications, & 8-digit verification code. |
| **Merchant Desk** | [`http://localhost:6000`](http://localhost:6000) | Code lookup, cash collection, & physical handover confirmation. |
| **Backend Health** | [`http://localhost:5000/health`](http://localhost:5000/health) | Live server diagnostic and SQLite database connection status. |
| **Backend API** | [`http://localhost:5000/api`](http://localhost:5000/api) | Authoritative REST API service endpoints. |

---

## 📁 Repository Structure

```
AutoPrint/
├── app/                           # Active Applications (backend, customer-web, merchant-desktop, connectors)
├── datastore/                     # Persistent Runtime Data (database, uploads, audit, logs)
├── runtime/                       # Ephemeral Process Runtime State (logs, temp, pid, status)
├── installer/                     # Complete PowerShell & CMD Installer Wizard Suite
├── assets/                        # High-resolution application branding & icons
├── docs/                          # Architecture, User, Admin, Installation, & Quick-Start Guides
├── scripts/                       # Operational Management Scripts (start-all, stop-all, health-check)
└── unused files/                  # Archived Legacy Files (100% Data Preservation Guarantee)
```

---

## 🛠 Operational Commands

### Start All Services:
```cmd
scripts\start-all.cmd
```

### Stop All Services:
```cmd
scripts\stop-all.cmd
```

### Check System Health:
```cmd
scripts\health-check.cmd
```

### Run Backend Tests:
```powershell
npm run test:backend
```

### Build All Applications:
```powershell
npm run build:all
```

---

## 📖 Complete Documentation Suite
* 📘 [User & Staff Operational Guide](docs/USER_GUIDE.md)
* ⚙️ [Installation & Deployment Manual](docs/INSTALLATION.md)
* 🔧 [Administrator Operations Guide](docs/ADMIN_GUIDE.md)
* ⚡ [Quick Start Reference](docs/QUICK_START.md)
* 📄 [System Brochure & Workflow Overview](docs/AUTOPRINT_BROCHURE.md)
* 🏗️ [Architecture Specification](docs/ARCHITECTURE.md)
* 🗄️ [Datastore Specification](docs/DATASTORE.md)
* 🔌 [Hardware & Gateway Connectors](docs/CONNECTORS.md)
* 🚨 [Troubleshooting Manual](docs/TROUBLESHOOTING.md)
* 📊 [Production Readiness Report](docs/PRODUCTION_READINESS_REPORT.md)

---

## 🔒 Verification & Security Architecture
* **8-Digit Verification Code**: Rejection-sampled cryptographic random codes (`XXXX XXXX`).
* **HMAC-SHA256 Checksum**: Deterministic verification watermark checksum for physical tamper detection.
* **3-Strike Digital Lockout**: Automatic fail-safe cash lock on 3 consecutive payment failures.
* **Persistent SQLite Database**: ACID transactions, foreign keys, and WAL journal mode.
