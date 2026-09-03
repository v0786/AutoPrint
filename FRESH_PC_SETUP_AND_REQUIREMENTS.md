# AutoPrint Express – Fresh PC Requirements & Easy Setup Guide
> **Designed for Print Shop Owners, Cashiers, and Non-Technical Operators**

---

## 1. System Requirements for a Fresh PC

Before installing AutoPrint, verify that your computer meets these minimum specifications:

| Requirement | Minimum | Recommended |
| :--- | :--- | :--- |
| **Operating System** | Windows 10 (64-bit) | Windows 11 (64-bit) |
| **Processor** | Intel Core i3 / AMD Ryzen 3 (2.0 GHz) | Intel Core i5 / AMD Ryzen 5 or faster |
| **RAM (Memory)** | 4 GB | 8 GB or more |
| **Hard Disk Space** | 2 GB free storage space | SSD with 10 GB+ free space |
| **Printers** | Any standard Windows printer (USB, Wi-Fi, or Network Ethernet) | Dual-tray Laser / Inkjet (B&W + Color) |
| **Network** | Local Wi-Fi router / LAN for Kiosk communication | Broadband Internet connection for UPI QR payments |
| **Software Runtime** | Node.js 18+ (Can be automatically installed via `configure.bat`) | Latest Node.js LTS |

---

## 2. Quick Setup in 3 Easy Steps

```text
 ┌────────────────────────┐      ┌────────────────────────┐      ┌────────────────────────┐
 │ 1. Run configure.bat   │ ───► │ 2. Run start.bat       │ ───► │ 3. Setup Administrator │
 │ Checks PC & Printers   │      │ Downloads & Launches   │      │ Set Store Name & Pass  │
 └────────────────────────┘      └────────────────────────┘      └────────────────────────┘
```

### Step 1 — Check PC Compatibility
1. Open the `AutoPrint` folder.
2. Double-click **`configure.bat`**.
3. The diagnostics tool will automatically check:
   * Windows 64-bit architecture
   * Node.js & npm package manager *(offers 1-click automatic download if missing)*
   * Windows Print Spooler service
   * Connected printers
   * Network ports (5000, 7000, 8000)
   * Storage write permissions

---

### Step 2 — Start AutoPrint (One-Click Launcher)
1. Double-click **`start.bat`**.
2. If this is the first time running on a clean PC, `start.bat` will ask for your permission:
   ```text
   AutoPrint needs to download required packages and compile application assets for first-time use.
   Download and configure all components now? [Y/N] (Default: Y):
   ```
3. Press **Enter (Y)**. AutoPrint will download the required components and build the software.
4. Within seconds, all 3 services will start:
   * **Core REST Engine** on Port `5000`
   * **Customer Upload Kiosk** on Port `7000` (`http://localhost:7000`)
   * **Merchant Desktop POS** on Port `8000` (`http://localhost:8000`)
5. Your default web browser will automatically open to both the **Merchant Desk** and the **Customer Kiosk**.

---

### Step 3 — First-Time Administrator Setup
1. In the **Merchant Desktop** browser window (`http://localhost:8000`), you will see the **First-Time Administrator Setup Screen**.
2. Enter your:
   * **Shop Name** (e.g., `Shree Balaji Xerox & Prints`)
   * **Store Manager Name** (e.g., `Rajesh Kumar`)
   * **Admin Email / Username** (e.g., `rajesh@printshop.local`)
   * **Admin Password** (Choose your own secure secret password)
   * **Merchant UPI ID** (e.g., `yourshop@okaxis` for receiving direct customer payments)
   * **Default Print Rates** (e.g., ₹2.00 B&W, ₹10.00 Color)
3. Click **Complete Onboarding & Enter Dashboard**.
4. You are now logged in and ready to accept print orders.

---

## 3. Daily Print Shop Operations

### Customer Workflow (Standee / QR / Kiosk Terminal)
1. Customer connects their mobile phone to the store Wi-Fi or opens the Kiosk screen (`http://localhost:7000`).
2. Customer selects their document (PDF, Word DOCX, PPTX, Image).
3. **Instant Visual Preview**: The customer sees an actual visual preview of their pages and selects B&W, Color, Copies, and Single/Double-sided.
4. The screen shows the exact final tax-inclusive price.
5. Upon confirmation, the customer receives an **8-digit Pickup Verification Code** (e.g., `4521 8890`).

### Operator Workflow (Cash Counter & Verification Desk)
1. The customer comes to the counter and says their 8-digit pickup code.
2. The cashier types the code into the **Merchant Desktop Verification Desk** (`http://localhost:8000`).
3. The cashier sees:
   * Customer Name
   * Exact Total Amount (e.g., ₹100.00)
   * Uploaded file name and page count
4. Cashier collects Cash or verifies UPI payment (the built-in change calculator calculates exact change).
5. Cashier hands over the printed document and clicks **Confirm Handover**.
6. The job is marked **COLLECTED** and cleanly logged to the tamper-proof SQLite audit log.

---

## 4. Control Menu & Shortcuts

While `start.bat` is running, you can press these keys anytime:

* Press **`1`** — Open Merchant Desktop POS in Browser
* Press **`2`** — Open Customer Web Kiosk in Browser
* Press **`3`** — Re-run System Diagnostics (`configure.bat`)
* Press **`4`** — Restart AutoPrint Services
* Press **`Q`** — Stop AutoPrint safely and close all background processes

---

## 5. Summary of Key Files

| File | Purpose |
| :--- | :--- |
| **`configure.bat`** | **Diagnostics tool** — checks PC compatibility, Node.js, and printers. |
| **`start.bat`** | **Universal 1-click launcher** — downloads files with user permission, starts all services, and opens browsers. |
| **`FRESH_PC_SETUP_AND_REQUIREMENTS.md`** | **This guide** — complete non-technical instructions. |
| **`installer\AutoPrint.iss`** | **Inno Setup production installer** for generating standard Windows Setup `.exe`. |
| **`datastore\backend\database\autoprint.db`** | **SQLite WAL database** holding your store settings, rate cards, and audit logs. |
