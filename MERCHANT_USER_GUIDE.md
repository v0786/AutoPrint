# AutoPrint — Merchant User Guide

**Target Audience**: Store Managers, Counter Cashiers, Xerox Shop Operators  

---

## 1. Navigating the Merchant Dashboard

When you open `http://localhost:8000`, the **Merchant Dashboard** provides real-time visibility into all printing activity:

* **Top Summary Bar**:
  * **Today's Jobs**: Total jobs submitted today.
  * **Waiting Jobs**: Jobs in `CASH_HELD` awaiting payment or operator authorization.
  * **Printing Jobs**: Jobs currently being processed by the Windows Print Spooler.
  * **Completed Jobs**: Total jobs collected and closed.
  * **Revenue**: Total earnings calculated in real-time.
* **Search Bar**: Quick lookup by **8-digit Collection Code** or Customer Name.
* **Main Queue Table**: Displays Customer Name, Document, Page Count, Copies, Print Options, Amount, and Action Buttons.

---

## 2. Managing Daily Customer Workflows

### 2.1 Cash Payment Collection
1. When a walk-in customer says: *"I have a print job, my code is 1234 5678"*:
2. Type `12345678` into the Dashboard Search Bar.
3. The job card appears highlighted with customer name, page breakdown, and exact total amount.
4. Collect the cash from the customer.
5. Click **[Cash Collected]**.
6. AutoPrint sends the file immediately to your default printer.

### 2.2 Handover & Purge
1. Once the printer finishes, verify the physical paper sheets.
2. Hand the sheets to the customer.
3. Click **[Collected]** on the job row.
4. AutoPrint marks the job complete and permanently wipes the customer's uploaded file from the computer.

### 2.3 Handling Modification Requests
1. If a job has a blue badge reading **"MODIFICATION REQUIRED"**:
2. Click **[Download Document]** to save the customer's file to your computer.
3. Open the file in Word, Excel, or Photoshop and make the requested edits.
4. Print the document normally using your desktop software.
5. Click **[Collected]** in AutoPrint.

---

## 3. Handling Printer Errors & Jams

* If a printer runs out of paper or jams, the job row turns red with status **FAILED**.
* Clear the printer jam and ensure paper is loaded.
* Click the job $\rightarrow$ Check the box: *"I confirm NO PRINT was received"* $\rightarrow$ Click **[Retry Print]**.
* If the primary printer is broken, select a secondary printer from the dropdown and click **[Reroute & Print]**.

---

## 4. Inactivity Lock Screen

* If you do not touch the mouse or keyboard for 10 minutes, the screen locks automatically for security.
* **Important**: Background printing and customer uploads **continue working** even while the screen is locked!
* To unlock, enter your merchant password.
