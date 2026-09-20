# AutoPrint — SDLC Phase 5: Packaging, Deployment & Compatibility Guide

**Document Reference**: SDLC-DOC-05  
**Phase**: 5 — Build Pipeline, Packaging Automation, OS Compatibility & Setup  
**Product**: AutoPrint  
**Version**: 2.0.0 (Production Release)  

---

## 1. Operating System Compatibility Matrix

| Operating System | Architecture | Compatibility Status | Native Launcher | Spooler Printing | Kiosk & Dashboard |
|---|---|---|---|---|---|
| **Windows 7 SP1** | 64-bit | **Fully Supported** | .NET 4.5.2 Native | SumatraPDF Win32 | Chrome / Firefox / Edge |
| **Windows 8 / 8.1** | 64-bit | **Fully Supported** | .NET 4.5.2 Native | SumatraPDF Win32 | Chrome / Firefox / Edge |
| **Windows 10** | 32/64-bit | **Fully Supported** | .NET 4.5.2 Native | SumatraPDF Win32 | All Modern Browsers |
| **Windows 11** | 64-bit | **Fully Supported** | .NET 4.5.2 Native | SumatraPDF Win32 | All Modern Browsers |
| **Linux (Ubuntu/Debian)**| 64-bit | **Supported** | systemd service | CUPS (`lp`) | All Modern Browsers |

---

## 2. Windows Packaging Pipeline (Inno Setup 6)

### 2.1 Single-EXE Installer Architecture (`AutoPrint-Setup.exe`)
* **Compiler**: Inno Setup 6 (Unicode) executing [`installer/AutoPrint.iss`](file:///d:/AutoPrint/installer/AutoPrint.iss).
* **Compression**: `lzma2/ultra64` with solid compression.
* **Privileges**: Administrative privileges (`PrivilegesRequired=admin`) to configure:
  * Destination folder: `C:\Program Files\AutoPrint\`.
  * Common Application Data: `C:\ProgramData\AutoPrint\` (granted full user read/write permissions for local database and temporary uploads).
  * Windows Firewall: Inbound rule allowing TCP port `7000` so customer phones on the shop Wi-Fi router can connect.
  * Windows Startup: Optional shortcut in the Windows Startup folder for automatic boot launch.

### 2.2 Release Packages & Checksums
All release packages are compiled into [`release/`](file:///d:/AutoPrint/release/) and verified with SHA-256 hashes:
* **`AutoPrint-Setup.exe`** (245.82 MB) — Production standalone Windows installer.
* **`AutoPrint-1.0.0-Setup.exe`** (245.82 MB) — Versioned release installer.
* **`AutoPrint-1.0.0-Portable.zip`** (223.66 MB) — Self-contained portable ZIP distribution.
* **`checksums.txt`** — Cryptographic SHA-256 verification manifest.

---

## 3. First-Time PC Setup Guide for Shop Owners (20-Step Walkthrough)

### Phase 1: Installation & Launch
1. **Download**: Copy `AutoPrint-Setup.exe` to the computer's Desktop.
2. **Run Installer**: Double-click `AutoPrint-Setup.exe` and confirm UAC prompt.
3. **Location**: Accept default location (`C:\Program Files\AutoPrint`).
4. **Desktop Icon**: Check "Create a Desktop shortcut" and click **Install**.
5. **Finish**: Click **Finish**. AutoPrint launches silently in the Windows system tray.
6. **Setup Wizard**: Default browser opens to `http://localhost:8000`.

### Phase 2: Initial Configuration Wizard
7. **Create Credentials**: Enter admin username and strong master password.
8. **Shop Identity**: Enter Shop Name, Country, Currency Symbol (`₹`), and Language (English/Hindi).
9. **Printer Discovery**: System auto-discovers connected printers; select primary laser printer as **Default Printer**.
10. **Pricing Rates**: Set per-page rates for A4 B&W Single/Double, A4 Color, A3, and custom services.
11. **Public Access**: Configure the central AutoPrint hosted store URL for remote mobile uploads; otherwise, use the local Wi-Fi/LAN URL.
12. **Generate Shop QR**: The wizard generates the permanent shop counter QR code.
13. **Print Counter Standee**: Click **[Print Counter Standee]** to print the counter standee card immediately.
14. **Emergency Recovery Code**: Save the 24-character recovery key securely and click **[Finish Setup]**.

### Phase 3: Test Printing & Verification
15. **Dashboard Ready**: Merchant Dashboard loads showing Today's Queue and system status.
16. **Connect Phone**: Connect customer smartphone to the shop's Wi-Fi router.
17. **Scan QR**: Scan the counter QR code with the smartphone camera.
18. **Upload Test File**: Enter customer name (*"Test"*), upload a sample document, select B&W 1 copy.
19. **Select Cash**: Choose "Pay Cash at Counter" $\rightarrow$ Kiosk displays **8-digit Collection Code**.
20. **Authorize & Collect**: On the Merchant Dashboard, click **"Cash Collected"**. Printer spools immediately! Click **"Collected"** to finalize.

---

## 4. Linux Deployment (Ubuntu / Debian)

1. **Install Prerequisites**:
   ```bash
   sudo apt-get update && sudo apt-get install -y nodejs npm cups libcups2-dev
   ```
2. **Deploy Service**:
   ```bash
   cd /opt/autoprint && npm run install:all && npm run build:all
   ```
3. **Register systemd Unit**:
   Create `/etc/systemd/system/autoprint.service` pointing to `npm run start:backend`.
