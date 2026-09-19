# QRPrint — Windows Compatibility Specification

This document details the multi-generation Windows compatibility architecture of **QRPrint**, with special focus on **Windows 7 (SP1 64-bit)**, **Windows 10**, and **Windows 11**.

---

## 1. Compatibility Matrix Overview

| Feature / Subsystem | Windows 7 (SP1 64-bit) | Windows 10 (64-bit) | Windows 11 (64-bit) |
| :--- | :--- | :--- | :--- |
| **Native Launcher (`AutoPrint.exe`)** | Supported (.NET 4.5.2) | Supported natively | Supported natively |
| **Installer Execution (`QRPrint-Setup.exe`)** | Supported (Inno Setup 6) | Supported (Inno Setup 6) | Supported (Inno Setup 6) |
| **Zero-Installation Portable Zip** | Supported | Supported | Supported |
| **Offline SQLite Database (WAL Mode)** | Supported | Supported | Supported |
| **Windows Print Spooler Integration** | Supported (`winspool.drv`) | Supported (`winspool.drv`) | Supported (`winspool.drv`) |
| **WMI Printer Discovery** | Supported (`Win32_Printer`) | Supported (`Win32_Printer`) | Supported (`Win32_Printer`) |
| **Customer Web Kiosk (`:7000`)** | Supported (Chrome/Firefox/Edge) | Supported | Supported |
| **Merchant Desktop Manager (`:8000`)** | Supported (Chrome/Firefox/Edge) | Supported | Supported |
| **Internet Dependency** | **Zero (100% Offline)** | **Zero (100% Offline)** | **Zero (100% Offline)** |

---

## 2. Windows 7 (SP1 64-bit) Compatibility Deep Dive

Windows 7 remains widely deployed in commercial Xerox, stationery, and institutional print shops across India and developing markets. However, modern software runtimes present distinct technical constraints:

### A. Python Version Compatibility Constraints
- **Python 3.9+**: Beginning with Python 3.9.0, official CPython dropped Windows 7 support entirely (`api-ms-win-core-path-l1-1-0.dll` dependency and telemetry assertions).
- **Python 3.8.10**: The final official CPython release that natively supports Windows 7 SP1 out-of-the-box.
- **QRPrint Solution**: To eliminate customer-side Python maintenance and DLL errors, QRPrint does **not** require end-users to install Python. The core service manager is compiled to a native Windows executable (`AutoPrint.exe`) targeting .NET Framework 4.5.2.

### B. PySide6 vs. Qt Constraints
- **PySide6 (Qt 6)**: The Qt Company dropped Windows 7 support in Qt 6.0+. PySide6 applications fail on Windows 7 due to missing DirectWrite and kernel entry points.
- **Qt 5 (PySide2 / PyQt5)**: The last Qt generation supporting Windows 7.
- **QRPrint Solution**: QRPrint uses a native .NET WinForms / System Tray management layer communicating with high-performance local web rendering surfaces, ensuring 100% rendering fidelity across Windows 7, 10, and 11 without Qt 6 compatibility breakage.

### C. .NET Framework Prerequisite Engine
- Windows 7 SP1 includes .NET Framework 3.5.1 by default.
- QRPrint bundles the official standalone offline Microsoft .NET Framework 4.5.2 installer (`NDP452-KB2901907-x86-x64-AllOS-ENU.exe`).
- During installation, `QRPrint-Setup.exe` inspects registry key `HKLM\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full` (`Release >= 378389`). If missing, it installs the .NET 4.5.2 runtime silently without requiring an internet connection.

---

## 3. Windows Printing System Compatibility

QRPrint connects to local hardware printers using the Windows Printing Subsystem:

1. **Hardware Discovery**:
   - Uses `Get-CimInstance Win32_Printer` (Windows 10/11) with fallback to `Get-WmiObject Win32_Printer` (Windows 7 SP1).
   - Detects all local USB, parallel, networked, and virtual printers (HP, Epson, Canon, Brother, Ricoh, Konica Minolta).
2. **Spooler Command Execution**:
   - Executes printing via PowerShell `Start-Process -FilePath <doc> -ArgumentList '/p /h /t "<printer>"'`.
   - Uses Base64 UTF-16LE `-EncodedCommand` invocation to prevent command line escaping bugs or argument injection flaws.
3. **Printer Fault Tolerance**:
   - When a printer is offline, out of paper, or jammed, the job remains securely buffered in SQLite.
   - Operators can re-route held jobs to alternate printers or resume printing upon paper refill.

---

## 4. Data Safety & File System Permissions

To comply with Windows User Account Control (UAC) security:
- **Program Files**: `C:\Program Files\QRPrint\` is treated as read-only, containing immutable binaries.
- **Application Data**: Mutable state (SQLite database, settings, transaction audit records, and logs) is stored in:
  - `%LOCALAPPDATA%\QRPrint\`
  - `%ProgramData%\AutoPrint\datastore\`
- Standard non-elevated users have full read/write access to their print queues and settings.
- The installer creates the required directories with permissive ACLs (`users-full`), preventing Windows "Access Denied" errors on locked-down kiosk machines.
