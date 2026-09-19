# AutoPrint — User Stories & Use Cases

**Document ID**: 01-06  
**Category**: Requirements  

---

## 1. User Stories

### 1.1 Customer Stories
* **US-01**: *As a college student with an assignment on my phone, I want to scan a QR code at the Xerox counter and upload my PDF directly without having to share my personal WhatsApp or email.*
* **US-02**: *As a customer printing confidential medical records, I want reassurance that my file will be deleted immediately after I collect the physical sheets.*
* **US-03**: *As a customer paying with cash, I want an 8-digit code on my phone so I can simply state the code at the counter, pay the exact change, and get my prints immediately.*
* **US-04**: *As a customer with a 20-page document who only needs pages 3 to 7 printed in color, I want to specify custom page ranges and duplex settings and see the exact cost before confirming.*

### 1.2 Merchant Stories
* **US-05**: *As a busy stationery shop owner, I want customer jobs to queue and print silently to my default laser printer so I can attend to walk-in retail customers without manually clicking print dialogs.*
* **US-06**: *As an operator, when a customer comes to the counter with cash, I want to type their 8-digit code, confirm their name and amount, click "Cash Collected", and have the document print automatically.*
* **US-07**: *As a shop owner stepping away from my desk, I want the screen to lock automatically after 10 minutes to protect sales numbers while background printing continues.*
* **US-08**: *As a shop owner dealing with a printer paper jam, I want AutoPrint to notify me clearly and allow me to redirect the job to another printer or retry without generating duplicate sheets.*

---

## 2. Detailed Use Cases

### Use Case UC-01: End-to-End Cash Workflow
* **Primary Actor**: Walk-in Customer & Merchant Operator
* **Preconditions**: AutoPrint backend and launcher are running; printer is loaded with A4 paper.
1. Customer scans the counter Shop QR code with their mobile phone.
2. Customer enters their name "Aman Sharma" and uploads `Project_Report.pdf`.
3. Customer selects B&W, Double-Sided, 1 copy. Kiosk displays `₹20.00`.
4. Customer chooses "Pay Cash at Counter" and clicks Confirm.
5. Kiosk displays Thank You screen with **Collection Code: 4920 1824**.
6. Job arrives in Merchant Dashboard marked as `CASH_HELD` (not printed).
7. Customer walks to counter and tells operator: *"My code is 4920 1824"*.
8. Operator types `49201824` into Search.
9. Dashboard displays: *"Aman Sharma | Project_Report.pdf | ₹20.00 | 10 Sheets A4 Duplex"*.
10. Operator collects ₹20 and clicks **"CASH COLLECTED"**.
11. Status changes to `QUEUED`; SumatraPDF engine silently prints the 10 sheets.
12. Operator hands over sheets and clicks **"COLLECTED"**.
13. Original `Project_Report.pdf` is wiped from the disk; transaction record saved.
