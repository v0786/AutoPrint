# AutoPrint Express — Windows Installation Guide

This guide describes how to install, configure, and operate **AutoPrint Express** on a Windows PC.

---

## 1. System Requirements

- **Operating System**: Windows 10 / Windows 11 (64-bit) or Windows Server 2016+
- **Privileges**: Administrator permissions for running the installer wizard
- **Prerequisites**: **None**. The installer includes the standalone runtime engine and pre-compiled application packages.

---

## 2. Installation Wizard Steps

1. **Download & Run**:
   - Double-click `AutoPrint-Setup.exe`.
   - When prompted by Windows User Account Control (UAC), click **Yes** to grant installation privileges.

2. **Language Selection**:
   - Select your installation language (Default: English).

3. **Installation Location**:
   - Default: `C:\Program Files\AutoPrint\`
   - Contains immutable application binaries, server engines, and icons.

4. **Application Data Location**:
   - Default: `C:\ProgramData\AutoPrint\`
   - Contains persistent merchant settings, SQLite database, print jobs, and logs.
   - *This directory is safely preserved across future software updates.*

5. **Network Port Configuration**:
   - **Default Ports**:
     - Backend REST API Engine: `5000`
     - Merchant Dashboard: `8000`
     - Customer Kiosk Web: `7000`
   - **Custom Ports**: Select "Specify custom TCP ports manually" if other software on your PC already uses these ports.

6. **Customer Remote Access (PageKite)**:
   - Configure public domain ingress (e.g. `https://autoprint.pagekite.me`) to allow customers to scan QR codes and print directly from their mobile phones.

7. **Shortcuts & Windows Startup**:
   - Option to create a Desktop shortcut and Start Menu shortcut.
   - Option to "Start AutoPrint with Windows" to run silently in the background on login.

8. **Finish & Launch**:
   - Click **Finish**. AutoPrint will start silently in the background and display its icon in the Windows system tray.

---

## 3. First-Time Setup & Merchant Onboarding

1. Double-click the **AutoPrint** tray icon or desktop shortcut to open the **Merchant Dashboard** (`http://localhost:8000`).
2. Complete the initial Store Profile:
   - **Shop Name & Branch**
   - **Owner Contact & Password**
   - **Per-Page Rates** (B&W and Color)
   - **UPI Payment Receiver** (UPI ID / VPA)
   - **Default Windows Printer**
3. Once onboarded, your settings persist permanently in the local SQLite database.

---

## 4. Uninstallation Safety

- To remove AutoPrint, open **Windows Settings** $\rightarrow$ **Installed Apps** $\rightarrow$ **AutoPrint Express** $\rightarrow$ **Uninstall**.
- The uninstaller safely stops background services and removes application binaries.
- The uninstaller prompts before deleting `C:\ProgramData\AutoPrint\`, ensuring your transaction history and store settings are not accidentally erased.
