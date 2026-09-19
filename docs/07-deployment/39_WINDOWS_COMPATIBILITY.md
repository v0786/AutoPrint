# AutoPrint — Windows Operating System Compatibility Matrix

**Document ID**: 07-39  
**Category**: Deployment & Compatibility  
**Target Matrix**: Windows 7 SP1 (64-bit), Windows 8 / 8.1, Windows 10, Windows 11  

---

## 1. Operating System Compatibility Matrix

| Operating System | Architecture | Compatibility Status | Native Launcher | Spooler Printing | Kiosk & Dashboard |
|---|---|---|---|---|---|
| **Windows 7 SP1** | 64-bit | **Fully Supported** | .NET 4.5.2 Native | SumatraPDF Win32 | Chrome / Firefox / Edge |
| **Windows 8 / 8.1** | 64-bit | **Fully Supported** | .NET 4.5.2 Native | SumatraPDF Win32 | Chrome / Firefox / Edge |
| **Windows 10** | 32/64-bit | **Fully Supported** | .NET 4.5.2 Native | SumatraPDF Win32 | All Modern Browsers |
| **Windows 11** | 64-bit | **Fully Supported** | .NET 4.5.2 Native | SumatraPDF Win32 | All Modern Browsers |

---

## 2. Component Runtime Breakdown

### 2.1 Native System Tray Launcher (`AutoPrint.exe`)
* **Target Framework**: .NET Framework 4.5.2.
* **Why .NET 4.5.2?**: .NET Framework 4.5.2 is supported out-of-the-box on Windows 7 SP1 and is installed by default on Windows 8, 10, and 11. Compiles via Windows native `csc.exe` without requiring external SDKs or newer runtimes.
* **Compatibility Notes**: Windows 7 machines without Service Pack 1 must install SP1 (KB976932) before installing .NET 4.5.2.

### 2.2 Headless PDF Print Engine (`SumatraPDF.exe`)
* **Binary Location**: `tools/sumatrapdf/SumatraPDF.exe`.
* **Architecture**: Win32 PE executable (32/64-bit compatible).
* **Direct Spooler Hook**: Communicates directly with the Windows Print Spooler (`winspool.drv`) without requiring Adobe Acrobat, Ghostscript, or external PDF printer drivers.
* **Compatibility**: Executes natively on all versions of Windows from Windows XP through Windows 11.

### 2.3 Local Database (`better-sqlite3`)
* **Binary**: Pre-compiled native Node C++ addon compiled against Windows MSVC runtime.
* **Engine**: SQLite 3.45+ with Write-Ahead Logging (`WAL`).
* **Compatibility**: Fully compatible across Windows 7, 8, 10, and 11.

---

## 3. Packaging & Installer Specifications

* **Installer Compiler**: Inno Setup 6 (Unicode).
* **Output Binary**: `AutoPrint-Setup.exe`.
* **Prerequisites Verified by Installer**:
  * Minimum OS check: Windows 7 SP1 (Windows 6.1.7601).
  * Administrative privileges check: Required to create `C:\ProgramData\AutoPrint` directory and configure firewall rules.
  * Firewall Ingress: Automatically adds inbound firewall rule for customer kiosk port `7000` so mobile phones on the Wi-Fi router can connect.

---

## 4. Known Platform Limitations & Workarounds

1. **Windows 7 Default Web Browser**:
   * *Limitation*: Windows 7 shipped originally with Internet Explorer 8/9/11, which does not support modern ES6+ JavaScript.
   * *Requirement*: The merchant must use Google Chrome (v109 is the last release for Windows 7), Mozilla Firefox (ESR 115), or Microsoft Edge.
2. **Printer Driver Offline States on Legacy USB**:
   * *Limitation*: Some legacy parallel/USB dot-matrix or older laser printers do not report real-time bidirectional status flags via WMI.
   * *Mitigation*: AutoPrint treats printers reporting status code 0 / Ready as available and catches spooler dispatch errors at the time of print.
