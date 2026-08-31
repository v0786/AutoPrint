# QRPrint - Installation & User Guide 📖

**QRPrint** is a local-first print management system with a merchant desktop app and customer web portal. This guide covers installation, setup, usage, and troubleshooting.

---

## 📋 System Requirements

### Minimum
- **OS:** Windows 10 or Windows 11 (64-bit)
- **RAM:** 4 GB
- **Disk:** 2 GB available space
- **Administrator privileges:** Required for installation
- **Network:** Local network or internet for customer portal

### Recommended
- **OS:** Windows 11
- **RAM:** 8 GB
- **Disk:** 5 GB available space
- **Printers:** USB or Network-connected printers (CUPS compatible)

### Supported
- Windows 10 21H2 or later
- Windows 11 all versions
- Network printers: HP, Brother, Canon, Xerox
- USB printers: Any CUPS-compatible printer

---

## 🚀 Installation Guide

### Step 1: Prerequisites Check

Before starting, verify you have the required software:

**Check Node.js:**
```cmd
node --version
npm --version
```

**Expected output:** Node.js 20.x or later, npm 10.x or later

**❌ If Node.js is not installed:**
1. Download from [nodejs.org](https://nodejs.org/en/download)
2. Run the Windows installer (choose LTS version)
3. Restart Command Prompt and verify again

**Check Git:**
```cmd
git --version
```

**❌ If Git is not installed:**
1. Download from [git-scm.com](https://git-scm.com/download/win)
2. Run the installer with default settings
3. Restart Command Prompt and verify again

---

### Step 2: Clone the Repository

```cmd
cd %USERPROFILE%\Desktop
git clone https://github.com/qrprint/qrprint.git
cd qrprint
```

**Verify the structure:**
```cmd
dir
```

**Expected output:**
```
customer/
data/
installer.bat
installer.ps1
merchant/
shared/
package.json
README.md
```

**❌ If clone fails:**
- **Error:** "git is not recognized"
  - Solution: Reinstall Git and restart Command Prompt
  - [Git Installation Guide](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)

- **Error:** "connection timeout"
  - Check your internet connection
  - Try again in a few moments
  - If persistent, check your firewall settings

---

### Step 3: Run the Windows Installer

**Open Command Prompt as Administrator:**

1. Press `Win + X` → select "Command Prompt (Admin)"
   - OR search for "cmd" → right-click → "Run as Administrator"

2. Navigate to the repository:
```cmd
cd /d %USERPROFILE%\Desktop\qrprint
```

3. Run the installer:
```cmd
installer.bat
```

**What the installer does:**
- ✅ Verifies you have Administrator privileges
- ✅ Checks Node.js and npm installation
- ✅ Installs merchant and customer dependencies
- ✅ Creates local database directory
- ✅ Initializes the merchant database
- ✅ Builds the Electron application

**⏱️ Estimated time:** 3-5 minutes

---

### Step 4: First-Time Launch

After installation completes:

**Option A: Using Electron App (Recommended)**
```cmd
cd merchant
npm run electron-dev
```

**Option B: Development Mode (Backend + Frontend separate)**

Terminal 1 - Start the merchant backend:
```cmd
cd merchant
npm run server
```

Terminal 2 - Start the merchant frontend:
```cmd
cd merchant
npm run dev
```

Then open: http://localhost:5173

---

## ✅ Initial Setup Wizard

On first launch, QRPrint will show the **Setup Wizard**:

### Step 1: Admin Authentication
- ✓ Check the box to confirm you're the authorized administrator

### Step 2: Store Profile
Fill in your store information:
- **Store name:** Your store's name (e.g., "Copy Corner")
- **Owner name:** Your full name
- **Mobile number:** 10-digit phone number (e.g., 9876543210)
- **Email ID:** Your email address (e.g., owner@example.com)

### Step 3: Printer Selection
Select your connected printer from the dropdown list:
- USB printers will show as "USB - [Model Name]"
- Network printers will show as "Network - [Model Name]"
- Bluetooth printers will show as "Bluetooth - [Model Name]"

**❌ If your printer doesn't appear:**
1. Check that the printer is powered on and connected
2. Click "Refresh" button to re-scan
3. For network printers, ensure they're on the same WiFi network

### Step 4: Complete Setup
Click "Complete Setup" to proceed to the merchant dashboard.

---

## 📱 Using QRPrint

### Merchant Dashboard

**Dashboard Tab:** View real-time statistics
- Active print jobs
- Completed orders
- Pending payments

**Print Queue Tab:** Manage incoming print jobs
- View customer files
- Track print progress
- Monitor printer status
- Advance jobs through workflow

**Payment Verification Tab:** Process customer payments
- Verify cash payments with code
- Confirm UPI transactions
- View payment history

**Printer Management Tab:** Configure printers
- View connected printers
- Check printer status (online/offline/error)
- Set default printer
- Configure print quality

**Store Settings Tab:** Manage configuration
- Update store profile
- Change printer assignments
- Manage user accounts (future)
- Configure payment methods

### Customer Portal

Customer workflow (via Vercel web app):

1. **Upload File**
   - Drag & drop or click to select
   - Supported: PDF, DOCX, PPTX, XLSX, JPG

2. **Configure Options**
   - Color mode: Black & White or Color
   - Copies: 1-20
   - Page range: Specific pages (e.g., "1-5, 10")

3. **Select Payment**
   - Cash: Get verification code at counter
   - UPI: Pay via Razorpay (requires internet)

4. **Submit Order**
   - Receive order ID and verification code
   - Wait for merchant to accept and process

---

## 🔧 Troubleshooting

### General Issues

#### ❌ "Administrator privileges required"

**Problem:** Installer won't run without admin access

**Solutions:**
1. Right-click `installer.bat` → "Run as administrator"
2. OR Open Command Prompt as admin first (see Step 3 above)
3. Press `Win + X` → "Command Prompt (Admin)"

**Learn more:** [Run programs as administrator](https://support.microsoft.com/en-us/windows/run-as-administrator-what-does-it-do-3ce9c179-c0d5-dda2-ecb0-2e6fd1d3e8ed)

---

#### ❌ "Node.js is required but not installed"

**Problem:** `node --version` shows "command not recognized"

**Solutions:**
1. Download Node.js LTS from [nodejs.org](https://nodejs.org)
2. Run the installer with default settings
3. Close and reopen Command Prompt completely
4. Verify: `node --version`

**Expected output:** v20.11.0 or later

**If still failing:**
- Check System Path:
  - Right-click Computer → Properties → Advanced System Settings
  - Click "Environment Variables"
  - Verify "C:\Program Files\nodejs" is in PATH
  - Restart Command Prompt

**Learn more:** [Node.js Installation Guide](https://nodejs.org/en/download/package-manager/)

---

#### ❌ "npm ERR! ERR 404"

**Problem:** Package installation fails with 404 error

**Solutions:**
1. Check internet connection: `ping google.com`
2. Clear npm cache: `npm cache clean --force`
3. Try installation again: `npm install`
4. If persistent, check your firewall/proxy settings

**Firewall check for Windows:**
- Go to Windows Defender Firewall
- Click "Allow an app through firewall"
- Ensure Node.js is listed and enabled

**Learn more:** [npm troubleshooting](https://docs.npmjs.com/cli/v10/troubleshooting)

---

#### ❌ Port 4100 already in use

**Problem:** Backend fails to start with "EADDRINUSE :::4100"

**Solutions:**
1. Find process using the port:
   ```cmd
   netstat -ano | find ":4100"
   ```

2. Note the PID (Process ID) from output
3. Terminate the process:
   ```cmd
   taskkill /PID <PID> /F
   ```

4. Restart merchant backend: `npm run server`

**Alternative:** Change port in `.env` file:
```env
PORT=4101
```

**Learn more:** [Port management on Windows](https://www.howtogeek.com/howto/command-line/http-port-conflicts-in-windows-netstat-taskkill/)

---

#### ❌ "Could not find database"

**Problem:** Merchant app shows "Database unavailable"

**Solutions:**
1. Verify database file exists:
   ```cmd
   dir D:\QRPrint\data\merchant.db
   ```

2. If missing, create it:
   ```cmd
   cd D:\QRPrint\data
   type nul > merchant.db
   ```

3. Check permissions:
   - Right-click `merchant.db` → Properties
   - Click "Security" tab
   - Ensure your user has "Full Control"

4. Restart the application

**Learn more:** [File permissions on Windows](https://support.microsoft.com/en-us/windows/change-file-permissions-263c3bea-7cb4-449f-a126-4c298802f0e7)

---

### Printer Issues

#### ❌ "No printers detected"

**Problem:** Printer dropdown is empty

**Solutions:**
1. **Check printer is powered on and connected**
   - USB: Plug in via USB cable
   - Network: Connect to same WiFi as computer
   - Verify printer shows in Windows Settings

2. **Add printer to Windows:**
   - Go to Settings → Devices → Printers & scanners
   - Click "Add a printer or scanner"
   - Select your printer from the list
   - Click "Add device"

3. **Refresh QRPrint:**
   - Close the application
   - Restart: `npm run electron-dev`
   - Click "Refresh" in printer selection

**Windows printer troubleshooting:**
- [Add printer to Windows](https://support.microsoft.com/en-us/windows/add-a-printer-in-windows-db747080-8fef-4c20-95da-982d10312385)
- [Fix printer problems](https://support.microsoft.com/en-us/windows/fix-printer-problems-in-windows-5117ec7a-7679-4c6a-9269-13e28126bfc4)

**Printer vendor support:**
- [HP printers](https://support.hp.com/)
- [Brother printers](https://support.brother.com/)
- [Canon printers](https://www.canon.com/support/)

---

#### ❌ "Printer offline" or "Printer error"

**Problem:** Printer shows as offline/error in QRPrint

**Solutions:**
1. **Check printer directly:**
   - Print test page from Windows Settings
   - Check printer display for error codes
   - Clear any paper jams or toner cartridges

2. **Restart printer:**
   - Power off the printer
   - Wait 30 seconds
   - Power back on
   - Wait for initialization to complete

3. **Update printer drivers:**
   - Go to printer manufacturer's website
   - Download latest driver for your model
   - Run installer
   - Restart computer

4. **Refresh QRPrint:**
   - Close application
   - Restart: `npm run electron-dev`

**Printer support pages:**
- [HP driver downloads](https://support.hp.com/us/en/drivers)
- [Brother driver downloads](https://support.brother.com/g/s/es/content/dl/)
- [Canon driver downloads](https://www.canon.com/support/)

---

### Backend Issues

#### ❌ "Backend failed to start"

**Problem:** Error message: "Backend failed to start"

**Solutions:**
1. Check Node.js is installed:
   ```cmd
   node --version
   npm --version
   ```

2. Check for port conflicts:
   ```cmd
   netstat -ano | find ":4100"
   ```
   If port is in use, see "Port 4100 already in use" section

3. Check database permissions:
   ```cmd
   dir D:\QRPrint\data\
   ```

4. View detailed error logs:
   - Restart with debug output: `npm run server`
   - Watch for error messages in terminal
   - Copy error message for troubleshooting

5. Manual restart:
   - Close all QRPrint windows
   - Open Command Prompt as Admin
   - Run: `cd merchant && npm run server`
   - Check output for errors

**Learn more:** [Node.js troubleshooting](https://nodejs.org/en/docs/guides/simple-profiling/)

---

#### ❌ "Could not reach merchant API"

**Problem:** Customer app shows API error

**Solutions:**
1. Verify merchant backend is running:
   - Terminal should show: "API running on http://localhost:4100"
   - Open browser: http://localhost:4100/health
   - Should see: `{"ok":true,"service":"qrprint-merchant"}`

2. Check environment configuration:
   - Open `customer/.env.local`
   - Verify: `MERCHANT_API_BASE_URL=http://localhost:4100`
   - For production tunnel: `MERCHANT_API_BASE_URL=https://your-tunnel.example`

3. Restart merchant backend:
   - In Electron: Click notification → "Restart Backend"
   - In terminal: Stop server (Ctrl+C) and run: `npm run server`

**Learn more:** [API debugging](https://developer.mozilla.org/en-US/docs/Learn/Common_questions/What_are_browser_developer_tools)

---

### Network & Connectivity

#### ❌ "Connection timeout" during installation

**Problem:** Git clone or npm install fails with timeout

**Solutions:**
1. **Check internet connection:**
   ```cmd
   ping google.com
   ```
   If no response, check WiFi/ethernet connection

2. **Try again later:** npm registry might be experiencing issues
   - Wait 5-10 minutes and retry

3. **Use different npm registry:**
   ```cmd
   npm config set registry https://registry.npmjs.org/
   npm cache clean --force
   npm install
   ```

4. **Check firewall:**
   - Windows Defender Firewall might be blocking
   - Temporarily disable for troubleshooting:
     - Settings → Privacy & Security → Windows Security
     - Firewall & network protection → Firewall options
     - Turn off firewall (only for testing!)

**Learn more:** [npm networking issues](https://docs.npmjs.com/cli/v10/configuring-npm/npmrc)

---

#### ❌ "Tunnel URL not working"

**Problem:** Customer app can't reach merchant via tunnel

**Solutions:**
1. Verify tunnel is active:
   - Check your tunnel provider's dashboard
   - Ensure the tunnel is running
   - Test: `curl https://your-tunnel.example/health`

2. Verify merchant is running behind tunnel:
   - Ensure merchant backend is running: `npm run server`
   - Check it's accessible locally: `curl http://localhost:4100/health`

3. Update environment variables:
   - `customer/.env.local`: 
     ```env
     MERCHANT_API_BASE_URL=https://your-tunnel.example
     ```
   - Save and restart customer app

4. Check tunnel logs:
   - Login to your tunnel provider (Cloudflare, ngrok, etc.)
   - Check for connection errors or logs
   - Verify firewall rules allow outbound traffic

**Learn more:** [Tunnel providers](/README.md#connectivity)

---

## 🔐 Security & Backup

### Backing Up Your Data

**Create a backup of store data:**

```cmd
xcopy D:\QRPrint\data D:\QRPrint\backups\%date:~-4,4%%date:~-10,2%%date:~-7,2% /E /I
```

Or manually copy:
1. Open File Explorer
2. Navigate to `D:\QRPrint\data`
3. Right-click → Copy
4. Paste in a safe location (USB drive, cloud storage, etc.)

**Backup includes:**
- Store profile
- Print queue history
- Payment records
- Printer configurations

**Recommended backup frequency:**
- Daily: Automatic backup (future feature)
- Weekly: Manual backup via File Explorer
- Before major updates: Full backup

---

### Updating QRPrint

**Check for updates:**
```cmd
cd D:\QRPrint
git pull origin main
```

**Update after pulling:**
```cmd
npm install
cd merchant && npm install
cd ../customer && npm install
```

**Test update:**
```cmd
npm run electron-dev
```

---

## 📊 Logs & Diagnostics

### View Application Logs

**Merchant backend logs:**
```cmd
cd D:\QRPrint\merchant
npm run server 2>&1 | tee merchant.log
```

**Logs are saved to:**
```
C:\Users\{YourUsername}\AppData\Roaming\QRPrint\logs
```

**View recent logs:**
```cmd
type C:\Users\%USERNAME%\AppData\Roaming\QRPrint\logs\latest.log
```

### Collect System Information for Support

Create a diagnostic report:

```cmd
cd D:\QRPrint
echo System Information > diagnostic-report.txt
systeminfo >> diagnostic-report.txt
echo. >> diagnostic-report.txt
echo Node Version >> diagnostic-report.txt
node --version >> diagnostic-report.txt
echo npm Version >> diagnostic-report.txt
npm --version >> diagnostic-report.txt
echo Git Version >> diagnostic-report.txt
git --version >> diagnostic-report.txt
echo. >> diagnostic-report.txt
echo Printer Status >> diagnostic-report.txt
wmic logicaldisk get name >> diagnostic-report.txt
```

Share `diagnostic-report.txt` when reporting issues.

---

## ❓ FAQ

### Q: Can I run multiple merchant instances?
**A:** No, only one merchant should run per store. Each installation manages one local business.

### Q: What internet speed do I need?
**A:** For local operation: none. For customer portal: 2+ Mbps recommended. Download speeds for file processing: 5+ Mbps recommended.

### Q: Can customers print from outside my network?
**A:** Yes, via the tunnel (ClaudeFlair/ngrok). Customers use the public web portal, which connects through a secure tunnel to your local merchant backend.

### Q: How many customers can print simultaneously?
**A:** Depends on your printer. QRPrint queues jobs; your printer processes them in order.

### Q: Can I change my store profile after setup?
**A:** Yes, go to Settings tab → Edit Store Profile. Changes take effect immediately.

### Q: Where are my print files stored?
**A:** In your local database and unpacked in Electron resources. Original files are not permanently stored for privacy.

### Q: How do I uninstall QRPrint?
**A:** Windows → Settings → Apps → QRPrint Merchant → Uninstall (Note: This preserves your data in AppData)

### Q: Can I export my order history?
**A:** Yes, from Dashboard tab → Export History (future feature)

### Q: Is my data stored in the cloud?
**A:** No, all data is local only. Only customer portal traffic goes through secure tunnel.

---

## 📞 Support

### Getting Help

**For technical support:**
1. Check this guide for your error
2. Collect diagnostic information (see Logs section)
3. Visit [GitHub Issues](https://github.com/qrprint/qrprint/issues)
4. Email: support@qrprint.example.com

**For printer support:**
- Manufacturer's support (HP, Brother, Canon, etc.)
- Local IT support for network printers

**For payment issues:**
- Razorpay support: https://razorpay.com/support
- Contact your payment provider

---

## 📝 Uninstall Instructions

**Method 1: Using Control Panel**
1. Press `Win + X` → "Programs and Features"
2. Find "QRPrint Merchant" in the list
3. Click → "Uninstall"
4. Follow prompts

**Method 2: Using Settings**
1. Settings → Apps → Installed apps
2. Search "QRPrint"
3. Click → "Uninstall"

**Method 3: Manual**
```cmd
cd D:\QRPrint
rmdir /S /Q node_modules
rmdir /S /Q .git
rmdir /S /Q dist
```

**Data preservation:**
Your store data remains at:
```
C:\Users\{YourUsername}\AppData\Roaming\QRPrint\
```

Delete manually if you want to completely remove all data.

---

## 📜 License & Terms

QRPrint is provided as-is. By using this software, you agree to:
- Store data locally and securely
- Maintain backups of critical data
- Keep your system and software updated
- Report security issues privately to support@qrprint.example.com

---

**Version:** 1.0.0  
**Last Updated:** August 31, 2026  
**Status:** Production Ready

For the latest documentation, visit: [QRPrint Documentation](https://qrprint.example.com/docs)
