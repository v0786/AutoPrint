# AutoPrint — User Troubleshooting & Diagnostics Guide

This guide helps you resolve common questions when setting up or running AutoPrint in your print shop.

---

## 1. AutoPrint Does Not Start

If double-clicking `AutoPrint.exe` or the desktop shortcut does not start the application:

### Check 1: Was the application file moved?
- Ensure `AutoPrint.exe` has not been dragged or copied away from its installation folder.
- `AutoPrint.exe` must stay inside its folder (default: `C:\Program Files\AutoPrint`) next to the `runtime` and `app` directories.
- If you need a shortcut on your desktop, right-click `AutoPrint.exe` $\rightarrow$ select **Send to** $\rightarrow$ **Desktop (create shortcut)**.

### Check 2: Check Windows Antivirus or Windows Defender
- Some security software may occasionally block or quarantine newly installed programs.
- Open your Windows Security / Antivirus control panel $\rightarrow$ check **Quarantine** or **Protection History**.
- If any AutoPrint file was blocked, select **Restore** and add `C:\Program Files\AutoPrint` to the trusted exclusion list.

### Check 3: Check for a Stuck Previous Process
- If AutoPrint was closed abruptly, a background process might still be running.
- Press `Ctrl + Shift + Esc` to open **Windows Task Manager**.
- Under the **Processes** tab, look for `AutoPrint.exe`. If you see one, click it and select **End Process**.
- Start AutoPrint again from your desktop shortcut.

> [!CAUTION]
> Do not delete or rename files inside the AutoPrint directory. If files are missing, run `AutoPrint-Setup.exe` again and choose **Repair / Overwrite**.

---

## 2. Backend Fails to Start

If AutoPrint reports a backend engine startup error:

1. **Check System Tray Icon:**
   - Look at the AutoPrint icon near the Windows clock.
   - Right-click the icon and choose **Restart Services**.
2. **Safe Diagnostics:**
   - Right-click the AutoPrint system tray icon $\rightarrow$ select **View Logs Directory**.
   - Open `backend.log` with Notepad to view the latest messages.
3. **Port In Use Conflict:**
   - If another program on your computer is using port 5000, AutoPrint will notify you.
   - Restarting your PC usually clears unexpected background port locks.

> [!NOTE]
> Never attempt to manually edit backend source code or configuration files. If an issue persists, right-click the tray icon and select **Restart Services**.

---

## 3. Merchant Desk Does Not Open

If your browser does not open automatically or shows a blank screen:

1. **Verify the Address:**
   - Open any browser (Google Chrome, Firefox, or Edge) and manually type:
     ```text
     http://localhost:8000
     ```
2. **Check the System Tray:**
   - Look near the Windows clock. If the AutoPrint icon is blue and running, right-click it and click **Open Merchant Desk**.
3. **Browser Refresh:**
   - Press `Ctrl + F5` to force a clean refresh of the web page.

---

## 4. Customer Portal Does Not Open

If the in-store customer kiosk is not loading:

1. **Local Terminal Access:**
   - On the same computer where AutoPrint is running, test:
     ```text
     http://localhost:7000
     ```
2. **In-Store Network Access:**
   - If customers connect through your shop's local Wi-Fi router, they need your computer's local IP address (for example: `http://192.168.1.50:7000`).
   - Find your computer's IP address: Open Windows Start Menu $\rightarrow$ type `cmd` $\rightarrow$ type `ipconfig` and look for **IPv4 Address**.

---

## 5. PageKite Remote Tunnel Does Not Connect

If customers trying to upload from home see a "Site Cannot Be Reached" error:

1. **Check Your Shop's Internet Connection:**
   - PageKite requires an active internet connection on the store computer. Ensure your PC can browse regular websites.
2. **Local AutoPrint Still Works 100%:**
   - If internet service is down, your local printing and in-store merchant operations **still work completely offline**.
3. **Check Subdomain and Secret Key:**
   - In the Merchant Desk, open **Settings** $\rightarrow$ **Remote Access**.
   - Verify that your subdomain (e.g. `myshop.pagekite.me`) and your secret key match your PageKite account exactly.
   - Click **Reconnect Tunnel**.

---

## 6. Physical Printer Problems

If documents are not printing out on paper, follow this step-by-step checklist:

### A. Printer Shows "Offline"
- Check that the printer's power cable is plugged in and the power switch is turned ON.
- Ensure the USB cable connecting the printer to the PC is firmly plugged in.
- In Windows, go to **Start** $\rightarrow$ **Devices and Printers**. Ensure your printer does not have a greyed-out icon or say "Offline".
- If it says offline, right-click the printer $\rightarrow$ click **See what's printing** $\rightarrow$ click the **Printer** menu $\rightarrow$ make sure **Use Printer Offline** is **unchecked**.

### B. Wrong Printer Selected
- If you have multiple printers (e.g., thermal receipt printer vs. laser printer), verify which one AutoPrint is using.
- In the Merchant Desk, go to **Settings** $\rightarrow$ **Printers**.
- Set your preferred office printer as the **Default Fleet Printer**.

### C. "Microsoft Print to PDF" Selected Accidentally
- If a "Save File As" window pops up whenever you click print, AutoPrint is sending jobs to a virtual PDF printer instead of your physical paper printer.
- In Merchant Desk **Settings** $\rightarrow$ **Printers**, select your actual physical printer brand (such as HP, Canon, Epson, or Brother).

### D. Windows Test Page Fails
- If Windows itself cannot communicate with the printer, AutoPrint will not be able to print either.
- Open Windows **Devices and Printers** $\rightarrow$ right-click your printer $\rightarrow$ **Printer properties** $\rightarrow$ click **Print Test Page**.
- If no page prints:
  1. Turn the printer off, wait 10 seconds, and turn it back on.
  2. Unplug and replug the USB cable.
  3. Reinstall the printer driver from the official manufacturer CD or website.

### E. AutoPrint Job Does Not Print
- Open the Merchant Desk $\rightarrow$ click on the job in the **Active Queue**.
- Verify that the job was **Approved** and that the **Print** button was clicked.
- Check that the printer has paper in the input tray and that the ink/toner cartridge is not empty.
