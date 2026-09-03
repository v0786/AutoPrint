# AutoPrint / QRPrint — Automated Print Shop Operating System

![AutoPrint Logo](assets/icon/app-icon.png)

**AutoPrint** is a production-grade automated kiosk and print shop desktop management system designed for document upload, real-time visual previews, physical 8-digit verification watermarking, 3-strike fail-safe payment reconciliation, and staff-governed document handover.

---

## ⚡ Installation

### Method 1: One-Line PowerShell Installer (Recommended)

Run the following command in PowerShell:

```powershell
irm https://raw.githubusercontent.com/v0786/AutoPrint/main/installer/scripts/install.ps1 | iex
```

**What this does automatically:**
1. Queries the GitHub Releases API (`v0786/AutoPrint`) for the latest stable release.
2. Downloads the official `AutoPrint-Setup.exe` and `AutoPrint-Setup.exe.sha256` checksum.
3. Cryptographically calculates and verifies the SHA-256 hash before running.
4. Checks and preserves existing SQLite datastores and rate cards if upgrading.
5. Launches the Windows Setup Wizard for a clean or upgraded installation.

---

### Method 2: Manual Download from GitHub Releases

1. Open the [GitHub Releases Page](https://github.com/v0786/AutoPrint/releases/latest).
2. Download **`AutoPrint-Setup.exe`**.
3. Download **`AutoPrint-Setup.exe.sha256`**.
4. *(Optional but Recommended)* Verify the SHA-256 checksum in PowerShell:
   ```powershell
   Get-FileHash AutoPrint-Setup.exe -Algorithm SHA256
   ```
5. Run **`AutoPrint-Setup.exe`** and follow the on-screen setup wizard.

---

### Method 3: 1-Click Launchers (Local Portable / Clean PC Setup)

If running directly from the cloned repository or unzipped archive:

1. **`configure.bat`**: Run diagnostics to verify Windows 64-bit, Node.js, Spooler, printers, and port availability.
2. **`start.bat`**: Universal 1-click launcher (downloads files with operator permission, compiles assets, starts all 3 microservices, and opens browsers).
3. **[`FRESH_PC_SETUP_AND_REQUIREMENTS.md`](FRESH_PC_SETUP_AND_REQUIREMENTS.md)**: Step-by-step non-technical installation and daily operations guide.

---

## 🌐 Default Access Portals

| Portal | Default URL | Purpose |
| :--- | :--- | :--- |
| **Customer Kiosk** | [`http://localhost:7000`](http://localhost:7000) | Document upload, layout preview, & 8-digit pickup code. |
| **Merchant Desktop** | [`http://localhost:8000`](http://localhost:8000) | Code lookup, cash collection, rate cards, & physical handover. |
| **Backend Health** | [`http://localhost:5000/api/health`](http://localhost:5000/api/health) | Live server diagnostic and SQLite WAL status. |

---

## 📁 Repository Structure

```
AutoPrint/
├── app/                           # Active Applications (backend, customer-web, merchant-desktop, connectors)
│   ├── backend/                   # Node.js Express REST API + SQLite WAL Datastore + Spooler Core
│   ├── customer-web/              # Vite React Customer Kiosk with Document Previews
│   └── merchant-desktop/          # Vite React Merchant POS & Pickup Verification Desk
├── datastore/                     # Persistent Runtime Data (database, uploads, audit, logs)
├── runtime/                       # Ephemeral Process Runtime State (logs, temp, pid, status)
├── installer/                     # Inno Setup 6 & PowerShell Installer Suite
│   └── scripts/install.ps1        # Official GitHub one-line release installer
├── assets/                        # High-resolution application branding & icons
├── docs/                          # Architecture, User, Admin, Installation, & Quick-Start Guides
├── scripts/                       # Operational Management Scripts (start-all, stop-all, test-e2e)
├── configure.bat                  # PC Compatibility & System Diagnostics Tool
└── start.bat                      # 1-Click Multi-App Launcher for Operators
```

---

## 🛠 Operational Commands

### Start All Services:
```cmd
start.bat
```

### Stop All Services:
```cmd
scripts\stop-all.cmd
```

### Check System Compatibility:
```cmd
configure.bat
```

### Run Automated E2E Test Suite:
```powershell
node scripts\test-e2e-integration.mjs
```

### Build All Applications:
```powershell
npm run build:all
```

---

## 🔒 Verification & Security Architecture
* **8-Digit Verification Code**: Rejection-sampled cryptographic random codes (`XXXX XXXX`).
* **HMAC-SHA256 Checksum**: Deterministic verification watermark checksum for physical tamper detection.
* **Scrypt Password Hashing**: Zero plaintext passwords; 16-byte random salt with `scryptSync` key derivation.
* **Persistent SQLite Database**: ACID transactions, foreign keys, and WAL journal mode.
* **Zero-Mock Operational Fleet**: Live Windows printers and SQLite print jobs only.
