# AutoPrint — Installation & Deployment Guide

This guide covers production installation and distribution for AutoPrint on Windows and Linux workstations.

---

## 1. Windows Installation via Setup Executable

### 1.1 Downloading & Running the Installer
1. Download `AutoPrint-Setup.exe` from the official release folder (`release/AutoPrint-Setup.exe`).
2. Run the executable as Administrator.
3. Follow the installation wizard:
   * **Destination Directory**: Defaults to `C:\Program Files\AutoPrint\`.
   * **Data Directory**: AutoPrint configures `C:\ProgramData\AutoPrint\` with full read/write permissions for local database storage and temporary uploads.
   * **Firewall Configuration**: Automatically creates inbound firewall allowances for customer kiosk port `7000`.
   * **Startup Execution**: Creates a shortcut in the Windows Startup folder so AutoPrint runs automatically on system boot.

---

## 2. Portable / Offline Zip Package

For shops with locked-down administrative privileges:
1. Extract `AutoPrint-Portable.zip` to any local folder (e.g. `D:\AutoPrint`).
2. Double-click `AutoPrint.exe` to launch the system tray host.
3. Open `http://localhost:8000` in Google Chrome or Microsoft Edge.

---

## 3. Linux Deployment (Ubuntu / Debian)

1. Ensure Node.js v18+ and CUPS are installed:
   ```bash
   sudo apt-get update && sudo apt-get install -y nodejs npm cups
   ```
2. Verify CUPS printers:
   ```bash
   lpstat -p -d
   ```
3. Clone or copy the AutoPrint repository:
   ```bash
   cd /opt/autoprint
   npm run install:all
   npm run build:all
   ```
4. Configure systemd service for AutoPrint backend:
   ```ini
   [Unit]
   Description=AutoPrint Background Print Engine
   After=network.target cups.service

   [Service]
   Type=simple
   User=autoprint
   WorkingDirectory=/opt/autoprint
   ExecStart=/usr/bin/npm run start:backend
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```
