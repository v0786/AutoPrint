# AutoPrint — First-Time PC Setup Guide for Shop Owners

**Document ID**: 07-SETUP  
**Target Audience**: Xerox / Stationery Shop Owners & Counter Staff (Non-Technical Friendly)  
**Estimated Setup Time**: 10 – 15 minutes  

---

## 1. System Requirements

### 1.1 Hardware Requirements
| Component | Minimum Specification | Recommended Specification |
|---|---|---|
| **Processor (CPU)** | 1.8 GHz Dual-Core (Intel Core 2 Duo / Celeron / AMD Athlon) | 2.4 GHz Quad-Core (Intel Core i3/i5 or AMD Ryzen) |
| **Memory (RAM)** | 2 GB RAM | 4 GB or 8 GB RAM |
| **Hard Disk Space** | 2 GB free disk space (for application and temporary customer uploads) | 10 GB+ SSD free space |
| **Display** | 1024 x 768 resolution | 1920 x 1080 resolution |
| **Printers** | Any standard USB, Ethernet, or Wi-Fi printer (Canon, HP, Epson, Brother, Konica Minolta, Ricoh) | Multi-function Laser / InkTank with Duplex unit |
| **Network** | Shop Wi-Fi router (for customer mobile phones to connect locally) | Dual-band 2.4/5 GHz Wi-Fi Router |
| **Internet** | **Optional** (AutoPrint runs 100% offline; internet needed only if using PageKite public tunnels) | Broadband / 4G Hotspot |

### 1.2 Operating System Requirements
* **Windows (Fully Supported)**:
  * Windows 7 (Service Pack 1, 64-bit)
  * Windows 8 / 8.1 (64-bit)
  * Windows 10 (32-bit & 64-bit)
  * Windows 11 (64-bit)
* **Linux (Supported)**:
  * Ubuntu 20.04 / 22.04 / 24.04 LTS
  * Debian 11 / 12
  * Any desktop environment with CUPS printing support (GNOME, XFCE, KDE)

---

## 2. Installation Prerequisites

Before installing AutoPrint, make sure:
1. Your printer is plugged into your PC via USB or connected to your shop Wi-Fi network, turned ON, and can print a Windows test page.
2. If using Windows 7: Ensure **Service Pack 1** and **.NET Framework 4.5.2** (or higher) are installed. (This is included in standard Windows updates).
3. If using shop Wi-Fi: Connect your shop PC and customer smartphones to the same Wi-Fi router.

---

## 3. Step-by-Step Installation Process (20-Step Guide)

### Phase 1: Installation & Launch
1. **Download the Setup Package**: Copy `AutoPrint-Setup.exe` to your computer's Desktop.
2. **Run Installer**: Double-click `AutoPrint-Setup.exe`. If prompted by Windows User Account Control (UAC), click **Yes**.
3. **Choose Install Location**: Accept the default path (`C:\Program Files\AutoPrint`) and click **Next**.
4. **Create Desktop Shortcuts**: Check "Create a Desktop shortcut" and click **Install**.
5. **Complete Installation**: Click **Finish**. AutoPrint will start automatically in your Windows system tray (bottom-right near your clock).
6. **Launch Setup Wizard**: If this is your first time, your default web browser will open to the **First-Run Setup Wizard** at `http://localhost:8000`.

### Phase 2: First-Run Configuration Wizard
7. **Create Merchant Credentials**:
   * Choose an admin username (e.g. `admin` or your shop name).
   * Create a strong password. (Save this password — you will need it to unlock your dashboard).
8. **Configure Shop Identity**:
   * Enter your **Shop Name** (e.g. *City Xerox & Stationery*).
   * Enter the **Owner Name**.
   * Select your **Country** (e.g. India) and **Currency Symbol** (e.g. `₹`).
   * Choose your preferred language (**English** or **Hindi**). Click **Next**.
9. **Printer Discovery & Default Printer**:
   * AutoPrint will automatically list all printers installed on your PC.
   * Select your primary high-speed printer as your **Default Printer**.
   * (Optional) Configure secondary color or photo printers. Click **Next**.
10. **Configure Services & Pricing**:
    * Set your per-page rates (e.g. A4 B&W Single-Sided: `₹2.00`, A4 B&W Double-Sided: `₹3.00`, A4 Color: `₹10.00`).
    * Enable or disable optional services (Photocopy, Scanning, Lamination, Binding). Click **Next**.
11. **Configure Public Access (PageKite)**:
    * If you want customers on 4G/mobile data to upload from outside: Enter your **Kite Name** and **Kite Secret Key** from `pagekite.net`.
    * If you only want in-shop Wi-Fi printing: Leave PageKite disabled. AutoPrint will use your shop's Wi-Fi LAN IP automatically. Click **Test & Continue**.
12. **Generate Shop QR Code**:
    * The wizard displays: **"Your Shop QR Code is Ready"**.
    * This QR code contains your shop's permanent upload address.
13. **Print or Save Your Shop QR**:
    * Click **[Print Counter Standee]** to print a professional counter standee card immediately.
    * Place this printed card on your shop counter or front window where customers can scan it.
14. **Save Emergency Recovery Code**:
    * AutoPrint displays a 24-character emergency recovery key.
    * Click **[Save Recovery Code]** or write it down. You will need this if you ever forget your password.
    * Check *"I have safely saved my recovery code"* and click **[Finish Setup]**.

### Phase 3: Verification & Test Printing
15. **Open Merchant Dashboard**: Your screen now displays the active **Merchant Dashboard** showing Today's Queue, Printers Online, and Revenue.
16. **Verify Background Engine**: Notice the green indicator in the top navbar: `System: Online | Spooler: Ready`.
17. **Connect Mobile Phone to Shop Wi-Fi**: Take your smartphone and connect to your shop's Wi-Fi network.
18. **Scan the Counter QR Code**: Open your phone camera and scan the printed counter standee QR code.
19. **Perform a Test Print Job**:
    * Your phone opens the **AutoPrint Customer Kiosk**.
    * Enter your name: *Test Customer*.
    * Upload a 1-page sample document or photo.
    * Select B&W, 1 Copy.
    * Choose **Pay Cash at Counter** and click Confirm.
    * Your phone displays: **Collection Code: e.g. 5839 2018**.
20. **Authorize & Collect Test Print**:
    * Look at your Merchant Dashboard: Job `#1001 (Test Customer)` appears under Waiting Jobs.
    * Click **"Cash Collected"**.
    * Within 3 seconds, your physical printer wakes up and prints the page silently!
    * Click **"Collected"** on your dashboard to complete the test.

**Congratulations! Your AutoPrint print shop station is now fully operational!**
