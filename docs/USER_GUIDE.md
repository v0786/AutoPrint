# AutoPrint / QRPrint — User & Staff Operational Guide

Welcome to the **AutoPrint Print Management System** user guide. This document explains how customers and staff operate the automated print shop kiosk and merchant workstation.

---

## 1. Starting the AutoPrint System
To launch the complete AutoPrint suite:
* **Via Desktop Shortcut**: Double-click the **AutoPrint Manager** desktop icon.
* **Via Command Line**: Run `scripts\start-all.cmd` in the AutoPrint root folder.

Three browser portals will be accessible:
* **Customer Kiosk**: `http://localhost:7000`
* **Merchant Desk**: `http://localhost:6000`
* **Backend API Engine**: `http://localhost:5000/api`

---

## 2. Customer Workflow (Kiosk Portal)

### Step 1: Uploading a Document
1. Navigate to the Customer Kiosk screen (`http://localhost:7000`).
2. Click **Browse Files** or drag and drop your document (supported formats: PDF, DOCX, PNG, JPG, TXT up to 50 MB).

### Step 2: Selecting Print Specifications
Customize your print specifications:
* **Color Mode**: Black & White (Mono) or Full Color.
* **Paper Size**: A4, Letter, or Legal.
* **Sides**: Single-Sided or Double-Sided (Duplex).
* **Copies**: Number of physical copies.
* **Page Range**: All pages or specific custom ranges (e.g. `1-5`).

The dynamic pricing engine calculates the total order amount in real time.

### Step 3: Receiving Your 8-Digit Verification Code
Once you confirm your print order, the system generates a secure, 8-digit verification code (e.g., `4528 9104`).
* **Why this code matters**: This 8-digit code uniquely ties your uploaded document to your payment and is stamped onto the final physical page of your printout.
* Keep this code visible on your screen or take a photo of it.

### Step 4: Digital Payment (UPI / QR Code)
1. Scan the dynamic UPI QR code on screen using any payment app (Google Pay, PhonePe, Paytm, BHIM, Banking Apps).
2. Authorize the transaction.
3. Upon confirmation, your document is sent to the printer spooler.

---

## 3. The 3-Strike Digital Payment Fail-Safe

If a digital payment attempt encounters a bank timeout, network error, or user cancellation, AutoPrint protects both the customer and merchant through a strict 3-strike fail-safe state machine:

```
[Attempt 1 Fails] ──► Recorded in audit trail; retry allowed.
[Attempt 2 Fails] ──► Warning displayed; final digital attempt.
[Attempt 3 Fails] ──► CASH LOCKOUT TRIGGERED!
                      - Digital payment is immediately disabled.
                      - Job transitions to CASH_LOCKED status.
                      - 4th digital attempt is rejected by the server.
```

### What to do if Cash Lockout is Triggered:
1. Walk to the Merchant Staff Counter.
2. Present your 8-digit verification code.
3. Pay cash directly to the cashier.

---

## 4. Merchant Staff Workflow (Desk Portal)

### Step 1: Staff Code Lookup
1. Open the Merchant Desktop Manager (`http://localhost:6000`).
2. Enter the customer's 8-digit verification code into the search box.
3. The system retrieves:
   * Job Number (e.g. `#1042`) and customer name.
   * Document title, page count, and color mode.
   * Current payment state (`PENDING`, `UPI_SUCCESS`, `CASH_REQUIRED`, or `CASH_LOCKED`).
   * Spooler status (`PRINTED` or `READY_IN_TRAY`).

### Step 2: Collecting Cash (If Required)
If the job status is `CASH_REQUIRED` or `CASH_LOCKED`:
1. Click **Collect Cash**.
2. Enter the cash amount tendered by the customer.
3. The system validates that the tendered cash is sufficient and displays the exact change due.
4. Click **Confirm Cash Received**. The system records the staff member's ID and marks the job as `CASH_COLLECTED`.

### Step 3: Physical Document Handover
1. Retrieve the printed document from the printer tray.
2. Verify the 8-digit code stamped on the bottom of the final page matches the customer's code.
3. Click **Confirm Handover** in the merchant portal.
4. The job is marked as `COLLECTED`, and the transaction is permanently archived.

---

## 5. Security & Verification Features
* **Tamper-Proof Watermark**: Every printed document contains an OCR-readable footer stamp with the 8-digit verification code, HMAC-SHA256 checksum, and timestamp.
* **Handover Guards**: The system strictly prevents handing over documents that have not been paid for, and prevents duplicate handovers.
* **Audit Logging**: Every code generation, payment failure, cash collection, and handover is permanently recorded in the immutable audit ledger.
