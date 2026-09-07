# AutoPrint — Windows 7 Installation & Setup Guide

> **Status:** `Windows 7 Compatibility: Testing Required`  
> *This package is prepared for 64-bit Windows 7 environments. Official certification requires verification on the target hardware using the test checklist below.*

---

## Welcome to AutoPrint

AutoPrint is a self-contained, professional print shop operating system. Everything you need is bundled inside a single application—you do **not** need to install Node.js, run scripts, use command prompts, or open batch files.

---

## 1. System Requirements

The following requirements are measured specifically from the AutoPrint application:

| Requirement | Specification |
| :--- | :--- |
| **Operating System** | **Windows 7 64-bit (x64)** |
| **Service Pack** | **Service Pack 1 (SP1)** fully updated |
| **System Memory (RAM)** | **2 GB minimum** (4 GB recommended for smooth multitasking with web browsers) |
| **Free Disk Space** | **2 GB minimum free space** on drive `C:\`<br>*(Application payload: ~565 MB; Installer: ~132 MB; balance reserved for temporary print job processing and database files)* |
| **Internet Connection** | **Not required for local printing.**<br>*(Only required if you choose to enable PageKite for remote mobile uploads)* |
| **Display Resolution** | 1280 x 720 or higher recommended |

---

## 2. Before Installation

Before installing AutoPrint, complete these simple preparation steps:

1. **Close any older version of AutoPrint** if one is currently open or running in your system tray (near the clock).
2. **Check free disk space**: Ensure your computer has at least 2 GB of free disk space on your main drive (`C:\`).
3. **Connect your physical printer**:
   - Plug the printer into your computer using USB or ensure it is connected to your local network.
   - Turn the printer on.
4. **Ensure the printer works in Windows first**:
   - Open **Windows Start Menu** $\rightarrow$ **Devices and Printers**.
   - Right-click your printer $\rightarrow$ select **Printer properties**.
   - Click **Print Test Page**.
   - **Important:** AutoPrint connects to your Windows printer fleet. It does not replace your printer's official Windows drivers. The printer must successfully print a Windows test page before AutoPrint can send jobs to it.

---

## 3. Simple Installation (Step-by-Step)

Installing AutoPrint requires no technical knowledge and takes less than 2 minutes.

```text
STEP 1: Locate AutoPrint-Setup.exe
   ↓
STEP 2: Double-click AutoPrint-Setup.exe
   ↓
STEP 3: Accept the Windows Security Prompt
   ↓
STEP 4: Click "Install" in the Setup Wizard
   ↓
STEP 5: Wait while files and private runtime are prepared
   ↓
STEP 6: AutoPrint starts automatically and opens your browser
```

### Step 1 — Locate the Installer
Find `AutoPrint-Setup.exe` on your computer (for example, in your `Downloads` folder or on your USB flash drive).

### Step 2 — Start the Installer
Double-click `AutoPrint-Setup.exe`.  
*(If you are not logged in as an administrator, right-click `AutoPrint-Setup.exe` and select **Run as administrator**).*

### Step 3 — Windows Security Prompt
If Windows displays a "User Account Control" prompt asking:  
*"Do you want to allow this program to make changes to this computer?"*  
Click **Yes** to continue.

### Step 4 — Click Install
The AutoPrint setup wizard will appear.
- The standard install location is: `C:\Program Files\AutoPrint`
- The default ports are automatically configured: Merchant Desk (`8000`), Customer Kiosk (`7000`), Backend (`5000`).
- Click **Install** to proceed.

### Step 5 — Automatic Setup
AutoPrint will automatically configure everything for you:
- ✓ Application files
- ✓ Self-contained private runtime
- ✓ Secure local SQLite database
- ✓ Backend print management engine
- ✓ Customer Upload Kiosk
- ✓ Merchant Management Desk

### Step 6 — AutoPrint is Ready
When setup completes, click **Finish**. AutoPrint starts silently in your Windows System Tray (near the clock) and automatically opens your web browser to the Merchant Desk at:  
`http://localhost:8000`

---

## 4. First Merchant Setup (Welcome Flow)

On a fresh installation, the Merchant Desk greets you with a simple setup wizard:

```text
Fresh Installation
       ↓
Merchant Desk Opens (http://localhost:8000)
       ↓
Welcome to AutoPrint Screen
       ↓
Click [Get Started]
       ↓
Create First Merchant Account (Store Owner / Admin)
       ↓
Choose "Remember this PC"
       ↓
Click [Complete Setup]
       ↓
Screen: "ALL SET! 🎉"
       ↓
Click [Open Merchant Dashboard]
       ↓
Live Merchant POS Ready
```

1. **Welcome Screen**: Click **Get Started**.
2. **Create Admin Account**:
   - Enter your **Full Name**, **Store Email**, and a secure **Password** (minimum 6 characters).
   - This first user is permanently assigned as the store Owner / Administrator.
3. **Remember This PC**: Leave this checked so you don't have to type your password every day on this shop computer.
4. **Setup Complete**: Click **Open Merchant Dashboard** to immediately enter your POS.

---

## 5. What "Remember This PC" Means

During setup and sign-in, you will see a checkbox labeled **Remember this PC**:

- **When checked (Recommended for shop PCs):** AutoPrint saves a secure login token on this computer. You stay signed in even if you restart AutoPrint or reboot Windows.
- **When unchecked (For public or shared terminals):** You must enter your password each time AutoPrint opens.

> [!TIP]
> Use "Remember this PC" on trusted shop computers behind the counter. Do not check this option if customers have access to the computer.

---

## 6. Optional Remote Access (PageKite)

AutoPrint works 100% offline out-of-the-box on your local network:
- Customers inside your shop can connect directly via Wi-Fi or shop terminals at `http://localhost:7000` (or `http://<your-pc-ip>:7000`).
- The Merchant Desk always stays local and private at `http://localhost:8000`.

### Setting Up Remote Access:
If you want customers to upload documents from home or their mobile devices over the internet before arriving at your shop:
1. In AutoPrint, open **Settings** $\rightarrow$ **Remote Access / PageKite**.
2. Enter your PageKite subdomain name (e.g., `myshop.pagekite.me`) and your PageKite secret key.
3. Click **Connect Tunnel**.
4. Customers can now open your online link or scan your store's QR code from anywhere.

> [!NOTE]
> Internet connectivity is **only** required for remote PageKite access. Local printing and POS operations never require an active internet connection.

---

## 7. Normal Daily Startup

Every day when you turn on your Windows 7 computer:

```text
Turn on Computer
       ↓
Double-click "AutoPrint" shortcut on Desktop
       ↓
AutoPrint starts in the System Tray
       ↓
Merchant Desk opens at http://localhost:8000
       ↓
AutoPrint is Ready to Print!
```

- You do **not** need to open any black command prompt windows or run `.bat` files.
- The AutoPrint icon remains in your Windows System Tray (by the clock).
- Right-clicking the tray icon lets you open the Merchant Desk, Customer Kiosk, view logs, or safely stop the system.

---

## 8. Physical Printer Setup & Troubleshooting

Before printing jobs in AutoPrint, verify your physical printer:

```text
Step 1: Install Windows Manufacturer Driver
   ↓
Step 2: Connect Printer & Power On
   ↓
Step 3: Print Windows Test Page (Devices & Printers)
   ↓
Step 4: Open AutoPrint Merchant Desk
   ↓
Step 5: Select Your Printer in Hardware Settings
   ↓
Step 6: Click [Print Test Page] in AutoPrint
```

### Common Printer Checks:

| Issue | What to Check |
| :--- | :--- |
| **Printer Offline** | Check USB cable connection, verify printer paper tray is closed, and clear any error lights on the printer body. In Windows *Devices and Printers*, ensure the printer is not set to "Use Printer Offline". |
| **Wrong Printer Selected** | In the Merchant Desk, go to **Settings** $\rightarrow$ **Hardware**. Ensure your physical laser/inkjet printer is set as default, not a virtual printer. |
| **"Microsoft Print to PDF" Selected** | If a file save dialog appears when clicking print, your default printer is set to a virtual PDF printer. Switch the default to your physical printer model. |
| **Windows Test Page Fails** | If Windows cannot print a test page, AutoPrint will also be unable to print. Reinstall the official manufacturer driver from the manufacturer's website (HP, Canon, Epson, Brother). |

---

## 9. Windows 7 Compatibility Test Checklist

Before certifying any Windows 7 machine for production use, execute this verification checklist on the target machine:

- [ ] **Target OS:** Windows 7 64-bit with Service Pack 1 (SP1).
- [ ] **1. Installer Launch:** `AutoPrint-Setup.exe` runs cleanly without DLL missing errors.
- [ ] **2. Installation Wizard:** Successfully completes file installation to `C:\Program Files\AutoPrint`.
- [ ] **3. Private Runtime:** Bundled private Node runtime starts silently without `KERNEL32.dll` errors.
- [ ] **4. Backend Engine:** Starts and responds healthy on port `5000`.
- [ ] **5. Customer Portal:** Opens and responds at `http://localhost:7000`.
- [ ] **6. Merchant Desk:** Opens and responds at `http://localhost:8000`.
- [ ] **7. Local Database:** SQLite database initializes tables and WAL mode at `C:\ProgramData\AutoPrint\datastore\backend\database\autoprint.db`.
- [ ] **8. Welcome Screen:** Greets user with 4-step onboarding wizard when 0 users exist.
- [ ] **9. Admin Creation:** First merchant user creation succeeds and blocks duplicate creations.
- [ ] **10. Remember This PC:** Closes and reopens browser without prompting for password.
- [ ] **11. Print Workflow:** Uploads document, calculates pricing, prints physical page with 8-digit verification code.
- [ ] **12. PageKite (Optional):** If configured, remote tunnel connects when internet is available.
- [ ] **13. Clean Shutdown & Restart:** Exiting from tray and double-clicking `AutoPrint.exe` restores all services without port conflicts.
- [ ] **14. Factory Reset:** Running `npm run reset` cleanly wipes persistent data and restores initial onboarding state.

---

### Verification Record

When completing verification on a real Windows 7 machine, record the details here:

- **Windows Edition:** Windows 7 Professional / Ultimate (64-bit)
- **Service Pack:** Service Pack 1
- **Installed Updates / KB:** *(e.g., KB2533623 / KB3063858 / ESU)*
- **AutoPrint Version:** 2.0.0
- **Bundled Runtime:** Private Node.js (x64)
- **Test Date:** *(Date of test)*
- **Tester:** *(Name/Initials)*
- **Result:** Pass / Fail
