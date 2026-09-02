# AutoPrint / QRPrint — Installation & Deployment Guide

## 1. Quick Web Installation (Recommended)

To install AutoPrint on any Windows 10, 11, or Windows Server machine, open PowerShell and run the one-line bootstrap installer:

```powershell
irm https://raw.githubusercontent.com/v0786/AutoPrint/main/installer/bootstrap.ps1 | iex
```

*For installations targeting the `customer` branch, run:*
```powershell
irm https://raw.githubusercontent.com/v0786/AutoPrint/customer/installer/bootstrap.ps1 | iex
```

### What this command does:
1. Validates your Windows environment and checks for PowerShell 5.1+.
2. Verifies internet connectivity to GitHub.
3. Downloads the official AutoPrint release package over secure HTTPS.
4. Launches the interactive AutoPrint Installation Wizard (`installer\install.ps1`).

---

## 2. Local / Offline Installation

If you have downloaded or cloned the repository locally:

```powershell
powershell -ExecutionPolicy Bypass -File installer\install.ps1
```

Or launch the CMD wizard:
```cmd
installer\install.cmd
```

---

## 3. Interactive Installation Wizard Walkthrough

During installation, the wizard prompts you for several configuration preferences:

### Step 1: Administrator Privileges
* The installer detects whether it is running as an Administrator.
* *Why it is recommended*: Creating desktop shortcuts, registering Windows printer spooler bindings, and configuring ports requires elevated privileges.

### Step 2: Installation & Datastore Paths
* **Installation Root**: Default is `E:\QRPrint\AutoPrint` (or your current folder).
* **Datastore Root**: Default is `E:\QRPrint\AutoPrint\datastore`.
* Persistent user files, databases, and logs are kept isolated from the source code.

### Step 3: Port Configuration (5000 / 6000 / 7000)
The installer asks:
```
Would you like to use the default ports?
[Y] Use default ports
[N] Select ports manually

Default:
  Backend API     : 5000
  Merchant Desktop: 6000
  Customer Web    : 7000
```
* If you select **[N]**, you can specify any available port between `1024` and `65535`.
* The installer validates each port and automatically detects if a port is already occupied by another application.

### Step 4: Printer Selection
* The installer queries Windows `Win32_Printer` and displays all connected printers.
* Select your physical receipt/thermal printer or choose `[0] AutoPrint Virtual Spooler` for tray-only operation.

### Step 5: Safety Backup & Compilation
* Creates an automated timestamped backup in `datastore\backups\`.
* Installs all npm dependencies across `app/backend`, `app/customer-web`, and `app/merchant-desktop`.
* Compiles TypeScript and builds production bundles.
* Runs the automated test suite (11/11 tests) to verify system integrity before completing.

---

## 4. Verification & Health Check

After installation, verify that the backend is responding:
```powershell
scripts\health-check.cmd
```

Or query the endpoint directly in your browser:
```
http://localhost:5000/health
```

---

## 5. Starting & Stopping Services

### Start all services:
```cmd
scripts\start-all.cmd
```

### Stop all services:
```cmd
scripts\stop-all.cmd
```
