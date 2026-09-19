# AutoPrint — Product Requirements Document (PRD)

**Document ID**: 01-05  
**Category**: Requirements  
**Version**: 2.0.0  

---

## 1. Functional Requirements Matrix

### 1.1 Customer Ingress & Onboarding
* **FR-01 (Permanent Shop QR)**: The system shall generate a permanent Shop QR code pointing to the customer kiosk URL (`http://<LAN_IP>:7000` or `https://<kite>.pagekite.me`).
* **FR-02 (Zero-Account Ingress)**: The customer kiosk shall require NO login or registration. The customer shall only be required to enter a **Customer Name**.
* **FR-03 (Localization)**: The customer interface shall support English and Hindi with an extensible i18n architecture.

### 1.2 Document Upload & Validation
* **FR-04 (File Formats)**: The customer kiosk shall accept PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, JPEG, and PNG.
* **FR-05 (Upload Size Limits)**: Single-file maximum limit is 50 MB; multi-file job maximum limit is 100 MB.
* **FR-06 (Multi-File Jobs)**: Customers can upload multiple documents within one job. Each document can have independent copies, color modes, and page selections.
* **FR-07 (Client-Side Preview)**: PDF and image documents shall render real-time page count and thumbnail previews in the customer's browser.

### 1.3 Print Configuration & Pricing
* **FR-08 (Print Options)**: Customer can choose Color vs B&W, Single-Sided (Simplex) vs Double-Sided (Duplex), Paper Size (A4, A3, Letter), Copies (1-99), and Page Ranges (e.g. `1-5`, `8,10-12`).
* **FR-09 (Dynamic Price Calculation)**: The customer interface shall calculate the total price in real time based on merchant-configured per-page rates before confirmation.
* **FR-10 (Modification Flag)**: Customers may check "MODIFICATION REQUIRED" if they require shopkeeper assistance to format or edit the document before printing.

### 1.4 Payment Workflows
* **FR-11 (Online Payment)**: Online payments (UPI QR / Gateway) verify automatically and release the job directly to the print spooler.
* **FR-12 (Cash Payment Workflow)**: If the customer selects "Pay Cash at Counter", the job is held in `CASH_HELD` state. The customer receives an 8-digit Collection Code. The job is released to the printer only after the merchant clicks "CASH COLLECTED" in the Merchant Dashboard.

### 1.5 Merchant Station & Queue Management
* **FR-13 (8-Digit Code Search)**: The merchant can search any job instantly by entering its 8-digit Collection Code.
* **FR-14 (Automatic Printing)**: Jobs authorized by online payment or cash confirmation shall spool automatically to the configured Default Printer.
* **FR-15 (Manual Routing & Retry)**: Merchants can reroute jobs to alternative printers or retry failed jobs with duplicate-print warnings.
* **FR-16 (Physical Handover & Purge)**: When the merchant clicks "COLLECTED", the original file is permanently deleted from the disk while keeping financial metadata.
* **FR-17 (10-Minute Dashboard Lock)**: The dashboard locks after 10 minutes of inactivity, requiring the merchant password to unlock while background printing continues.

---

## 2. Platform Compatibility Requirements

* **CR-01**: Windows 7 SP1 (64-bit), Windows 8, Windows 10, and Windows 11 out-of-the-box support.
* **CR-02**: Linux Ubuntu / Debian support using CUPS spooler.
* **CR-03**: Zero requirement for external cloud servers or remote database connectivity.
