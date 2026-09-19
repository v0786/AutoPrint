# AutoPrint — Quick Start Guide

Get AutoPrint running in less than 5 minutes.

---

## 1. Prerequisites Check
* A PC running **Windows 7 SP1, 8, 10, or 11** (or Linux with CUPS).
* A physical or virtual printer installed (e.g. HP LaserJet, Canon, Epson, or Microsoft Print to PDF).
* Both PC and customer mobile phones connected to the same shop Wi-Fi network (or optional PageKite enabled).

---

## 2. Launching AutoPrint

### Option A: Using the Native System Tray Application
1. Double-click [`AutoPrint.exe`](file:///d:/AutoPrint/AutoPrint.exe) in the root directory.
2. The AutoPrint icon appears in your Windows system tray (bottom-right near your clock).
3. Right-click the icon and choose **"Open Merchant Dashboard"**.

### Option B: For Developers via Terminal
```bash
# In the repository root
npm run dev:backend
```
In separate terminals:
```bash
npm run dev:merchant
npm run dev:customer
```

---

## 3. Your First Print Job in 3 Steps

### Step 1: Print Your Counter Standee QR
1. Open the Merchant Dashboard at `http://localhost:8000`.
2. Click **"Shop QR Code"** in the sidebar.
3. Click **[Print Counter Standee]** or display the QR code on your screen.

### Step 2: Customer Submits Document
1. Scan the QR code with any smartphone.
2. Enter a customer name (e.g. *"Rahul"*).
3. Upload a document and select B&W or Color.
4. Select **"Pay Cash at Counter"** and click Confirm.
5. Note the **8-Digit Collection Code** (e.g. `4829 1039`).

### Step 3: Release & Collect
1. On the Merchant Dashboard, type `48291039` in the search bar.
2. Verify the customer name and amount.
3. Click **"Cash Collected"**.
4. The printer prints immediately. Hand over the sheets and click **"Collected"**!
