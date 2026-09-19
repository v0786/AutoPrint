# QRPrint — Professional Windows Installation & Operations Guide

This guide documents the installation, first-run configuration, printer integration, backup/restore, and maintenance procedures for **QRPrint** across **Windows 7 (SP1 64-bit)**, **Windows 10**, and **Windows 11**.

---

## 1. Supported Operating Systems & Hardware Requirements

| Operating System | Compatibility Status | Prerequisites |
| :--- | :--- | :--- |
| **Windows 7 SP1 (64-bit)** | Fully Supported | .NET Framework 4.5.2 (automatically installed by offline installer) |
| **Windows 10 (64-bit)** | Fully Supported | Native OS support; zero external dependencies required |
| **Windows 11 (64-bit)** | Fully Supported | Native OS support; zero external dependencies required |
| **Windows Server 2016+** | Supported | Server GUI / Desktop Experience enabled |

### Hardware Minimums:
- **CPU**: 1.6 GHz dual-core 64-bit processor
- **RAM**: 2 GB (4 GB recommended)
- **Disk Space**: 500 MB free space on drive C:
- **Connectivity**: **100% Offline**. Internet access is **never** required for shop operations, QR generation, local payments, or physical printing.

---

## 2. Installation Walkthrough (`QRPrint-Setup.exe`)

1. **Launch Installer**:
   - Run `QRPrint-Setup.exe` (or `QRPrint-1.0.0-Setup.exe`) from the installation media or `release/` folder.
   - Click **Yes** when prompted by Windows User Account Control (UAC).

2. **Destination Folder**:
   - Default: `C:\Program Files\QRPrint\`
   - *Note: Only immutable binaries, server engines, and icons reside here. User data is never written inside Program Files.*

3. **Data Directory Assignment**:
   - User database, logs, and settings are mapped to:
     - `%LOCALAPPDATA%\QRPrint\`
     - `%ProgramData%\AutoPrint\datastore\`

4. **Network Port Verification**:
   - Default ports:
     - **Backend REST Engine**: `5000`
     - **Merchant Management Desk**: `8000`
     - **Customer Kiosk Portal**: `7000`
   - If another service on your machine occupies any of these ports, select "Custom Port Configuration" to remap them without conflicts.

5. **Shortcuts & Auto-Start**:
   - Automatically provisions a **QRPrint** Desktop shortcut and Start Menu group with high-resolution icons.
   - Optional: "Start with Windows" enables automatic background launch on cashier login.

6. **Completion**:
   - Click **Finish**. QRPrint initializes its local SQLite database and displays its control icon in the Windows system tray.

---

## 3. First Run & Onboarding Flow

1. **Launch Application**:
   - Double-click the **QRPrint** desktop shortcut or system tray icon to access the **Merchant Desk** (`http://localhost:8000`).
2. **First-Run Detection**:
   - The application detects clean installation state and initializes:
     - Local SQLite database (`qrprint.db` / `autoprint.db`) in WAL mode.
     - Database schema tables and audit logging streams.
     - Default rate card matrix (B&W single/duplex, Color, Glossy Photo, Spiral/Staple binding).
3. **Configure Store Parameters**:
   - **Store Name & Counter**: e.g., "Shree Ganesh Xerox & Cyber Center", Counter #01.
   - **Cashier Password**: For administrative and handover verification.
   - **Default Physical Printer**: Select from Windows-detected printer fleet.
   - **UPI Direct VPA**: e.g., `store@upi` for direct-to-bank customer QR payments.

---

## 4. Windows Printer Setup & Troubleshooting

QRPrint interfaces directly with the Windows Print Spooler (`winspool.drv` / `Win32_Printer`):

1. **Physical Connection**: Connect your USB or Network laser/inkjet printer and install the manufacturer driver in Windows.
2. **Print a Windows Test Page**: Verify through Windows **Devices and Printers** that the printer prints successfully.
3. **Fleet Hub in QRPrint**:
   - Navigate to Merchant Desk $\rightarrow$ **Printer Fleet**.
   - Your connected printers are detected via Win32 spooler inspection.
   - Click **Set as Active Printer**.
   - Click **Trigger Test Print** to run an automated diagnostic test page.
4. **Offline / Missing Printer Handling**:
   - If a printer runs out of paper, jams, or is disconnected, QRPrint preserves the job in the spooler queue with status `PAUSED` or `FAILED`.
   - Once the hardware issue is resolved, click **Resume Queue** to re-spool without lost customer data.

---

## 5. Local Backup & Recovery

All user data is strictly separated from application code:

### Backup Procedure:
1. Run `scripts\backup-autoprint.cmd` or click **Create Backup** in Merchant Desk Settings.
2. The system creates a timestamped zip archive containing:
   - SQLite database (`autoprint.db` / `qrprint.db`)
   - Merchant configuration (`appsettings.json`)
   - Audit trail logs and transaction receipts
3. Store the backup archive on an external USB flash drive or secondary drive.

### Restore Procedure:
1. Run `scripts\restore-autoprint.cmd <path-to-backup.zip>`.
2. The restore engine:
   - Safely terminates running QRPrint services.
   - Generates a safety pre-restore backup of the current state.
   - Validates database integrity.
   - Restores the archive and restarts services.

---

## 6. Safe Uninstallation

1. Open Windows **Control Panel** $\rightarrow$ **Programs and Features** (or Windows 10/11 **Installed Apps**).
2. Select **QRPrint** and click **Uninstall**.
3. The uninstaller safely stops running background services and removes application binaries from `C:\Program Files\QRPrint\`.
4. **Data Protection Prompt**:
   - The uninstaller prompts: *"Do you also want to delete all local QRPrint merchant databases, settings, and logs?"*
   - Selecting **No** permanently preserves your transaction ledger, customer history, and print counter statistics for future reinstallation.
