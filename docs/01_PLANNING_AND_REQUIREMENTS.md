# AutoPrint — SDLC Phase 1: Planning & Requirements Specification

**Document Reference**: SDLC-DOC-01  
**Phase**: 1 — Project Inception, Business Planning & Requirements Engineering  
**Product**: AutoPrint  
**Version**: 2.0.0 (Production Release)  

---

## 1. Executive Summary & Product Vision

### 1.1 The Business Problem
Walk-in document printing in retail copy shops, stationery stores, university hubs, and Xerox centers is fraught with operational friction:
* **Queue Congestion**: Customers crowd counters waiting to share files via WhatsApp, Bluetooth, or email.
* **Privacy & Data Vulnerability**: Customers are forced to share personal phone numbers or leave sensitive documents (legal deeds, medical records, financial papers) stored indefinitely on public desktop computers.
* **Operator Bottleneck**: Staff spend disproportionate time downloading files from messaging apps, converting formats, adjusting print dialogs, calculating custom pricing, and collecting cash.
* **Handover Chaos**: Printouts pile up in disorganized trays, causing mix-ups, duplicate prints, and customer disputes.

### 1.2 The AutoPrint Solution
**AutoPrint** is an offline-first, touchless print station appliance that automates the entire counter workflow:
$$\text{Scan Shop QR} \longrightarrow \text{Enter Name} \longrightarrow \text{Upload \& Preview} \longrightarrow \text{Configure Options} \longrightarrow \text{Pay (Online / Cash)} \longrightarrow \text{8-Digit Code} \longrightarrow \text{Silent Print} \longrightarrow \text{Collect \& Purge}$$

### 1.3 Core Product Principles & Anti-Goals
* **Radical Simplicity**: Zero customer registration, zero passwords, zero customer accounts. Customers simply enter a **Customer Name** upon scanning the counter QR code.
* **Local & Offline-First**: AutoPrint operates 100% locally on the merchant's PC. WAN disconnection never impedes counter printing or cash collection.
* **Privacy-by-Design**: Customer files in `datastore/uploads/` are **permanently purged** from the disk the moment physical prints are handed over.
* **Anti-Goals**: AutoPrint is **not** a SaaS cloud platform, not a social CRM, not an online marketplace, and not a complex document editor.

---

## 2. User Personas & Problem Scenarios

### Persona A: The Xerox Shop Operator ("Ramesh")
* **Environment**: Runs a high-traffic stationery shop using a Windows 7 or Windows 10 workstation connected to dual high-speed laser printers via USB/LAN.
* **Pain Points**: Morning exam rushes, manual WhatsApp downloads, paper jams, arguing over double-sided rates, losing track of cash payments.
* **Goal**: A background engine that queues and prints customer files silently without manual intervention, locking the screen when unattended.

### Persona B: The Walk-in Customer ("Priya")
* **Environment**: Uses a smartphone (iOS / Android) connected to mobile data or shop Wi-Fi.
* **Pain Points**: Hesitant to share personal mobile numbers with strangers; worried about document privacy; wants exact price before printing.
* **Goal**: Instant 30-second upload, transparent price breakdown, payment via UPI or counter cash, and quick pickup using an 8-digit code.

---

## 3. Functional Requirements Specification

| Requirement ID | Module | Description | Priority |
|---|---|---|---|
| **FR-01** | Ingress | The system shall generate a permanent Shop QR code pointing to `http://<LAN_IP>:7000` or `https://<kite>.pagekite.me`. | Critical |
| **FR-02** | Customer | Customer onboarding shall require **no account or password**; only a **Customer Name** is mandatory. | Critical |
| **FR-03** | Localization | Customer Kiosk shall support **English and Hindi** with an extensible resource dictionary. | High |
| **FR-04** | Document Ingress | System shall accept PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, JPG, JPEG, and PNG. | Critical |
| **FR-05** | Upload Limits | Single-file limit: $\le 50\text{ MB}$; Multi-file total job limit: $\le 100\text{ MB}$. | High |
| **FR-06** | Multi-File Jobs | Customers may upload multiple documents per job with independent print settings per file. | High |
| **FR-07** | Client Preview | Real-time client-side page count extraction and thumbnail rendering using PDF.js. | High |
| **FR-08** | Print Configuration | Options for B&W vs Color, Simplex vs Duplex, Paper Size (A4, A3, Letter), Copies (1–99), and Page Ranges (`1-5, 8`). | Critical |
| **FR-09** | Pricing Engine | Dynamic real-time calculation based on merchant-configured per-page and duplex rates. | Critical |
| **FR-10** | Modification Flag | Customers may select "MODIFICATION REQUIRED" if document requires manual formatting by staff. | Medium |
| **FR-11** | Online Payment | Direct UPI QR and gateway support releasing jobs automatically to the print spooler upon verification. | High |
| **FR-12** | Cash Workflow | "Pay Cash at Counter" holds job in `CASH_HELD` state until merchant clicks "Cash Collected". | Critical |
| **FR-13** | Collection Code | Cryptographically secure 8-digit numeric code (`1234 5678`) issued to the customer for pickup verification. | Critical |
| **FR-14** | Silent Spooling | Authorized jobs spool directly to the Default Printer via headless SumatraPDF without dialog popups. | Critical |
| **FR-15** | Retry Safety | Retrying failed prints requires explicit operator confirmation ("NO PRINT RECEIVED") to prevent duplicate waste. | Critical |
| **FR-16** | Ephemeral Purge | Original uploaded documents are permanently unlinked from disk upon marking a job as `COLLECTED`. | Critical |
| **FR-17** | Inactivity Lock | Dashboard locks automatically after 10 minutes of inactivity; background print processing continues unimpeded. | High |

---

## 4. Non-Functional Requirements (NFR)

* **NFR-01 (Startup Performance)**: System tray launcher (`AutoPrint.exe`) and background services must reach ready state in $< 3.0$ seconds.
* **NFR-02 (Ingress Latency)**: Document upload, validation, and verification code issuance must complete in $< 500$ ms for files $\le 20$ MB.
* **NFR-03 (Resource Footprint)**: Total memory consumption of all background processes (backend, frontends, tray host) must remain $< 180$ MB.
* **NFR-04 (100% Offline Capability)**: Disconnection of WAN/Internet must not impact counter printing, cash payments, or LAN Wi-Fi uploads.
* **NFR-05 (Collision Avoidance)**: The 8-digit CSPRNG Collection Code must have zero collisions across 100,000 active jobs.

---

## 5. End-to-End Use Cases

### UC-01: Touchless Online Payment Flow
1. Customer scans the counter standee QR code with smartphone.
2. Enters Customer Name (*"Priya"*), uploads `Assignment.pdf` (12 pages).
3. Selects: B&W, Duplex, 1 Copy. Total calculated: `₹12.00`.
4. Selects Online Payment (UPI QR). Scans UPI code and authorizes payment.
5. Kiosk displays Thank You screen with **Collection Code: 8472 9103**.
6. Spooler sends document silently to default printer.
7. Priya shows code `84729103`, collects prints. Operator clicks "Collected" $\rightarrow$ File purged.

### UC-02: Cash at Counter Flow
1. Customer uploads document and selects **"Pay Cash at Counter"**.
2. Kiosk displays **Collection Code: 1928 4756** with instruction: *"Show this code at counter"*.
3. Job enters merchant queue in `CASH_HELD` state (printing is held).
4. Customer tells operator: *"My code is 1928 4756"*.
5. Operator enters `19284756` into dashboard search, verifies details, collects cash, and clicks **"Cash Collected"**.
6. Job automatically releases to printer spooler. Operator hands over sheets and clicks "Collected".

### UC-03: Modification Required Flow
1. Customer checks **"MODIFICATION REQUIRED"** during upload.
2. Job arrives in queue with a blue badge; auto-spooling is paused.
3. Operator clicks **[Download Document]**, makes requested edits in Word/Photoshop, prints via standard Windows dialog, and marks job "Collected".

---

## 6. Requirements Traceability Matrix (RTM)

| Req ID | Requirement Summary | Architectural Component | Implementation File | Verification Test Suite |
|---|---|---|---|---|
| **REQ-01** | Zero-Account Ingress & Name | Kiosk Presentation Tier | `app/customer-web/src/App.tsx` | `reliability_support_refund.test.ts` (Test 1) |
| **REQ-02** | Multi-Format Document Ingress | Backend Ingress Pipeline | `app/backend/src/services/autoprintService.ts` | `reliability_support_refund.test.ts` (Test 1) |
| **REQ-03** | 8-Digit CSPRNG Code | Cryptographic Core | `app/backend/src/services/autoprintService.ts` | `print_settings_contract.test.ts` (Test 1) |
| **REQ-04** | Windows Silent Spooling | Hardware Printing Subsystem | `app/backend/src/services/printerService.ts` | `print_settings_contract.test.ts` (Test 4) |
| **REQ-05** | Cash Counter Authorization | Domain State Machine | `app/backend/src/controllers/autoprintController.ts`| `reliability_support_refund.test.ts` (Test 2) |
| **REQ-06** | Ephemeral File Purge | Data Lifecycle Controller | `app/backend/src/services/autoprintService.ts` | `reliability_support_refund.test.ts` (Test 4) |
| **REQ-07** | Windows 7–11 Native Host | Native Supervisor Subsystem | `src-launcher/Program.cs` (.NET 4.5.2) | C# Compiler (`csc.exe`) Verification |
| **REQ-08** | 10-Minute Inactivity Lock | Presentation Security Gate | `app/merchant-desktop/src/App.tsx`, `auth.ts` | `security_audit_verification.test.ts` (Test 4) |
| **REQ-09** | Anti-Brute Force Rate Limit | Security Middleware Tier | `app/backend/src/middleware/rateLimiter.ts` | `security_audit_verification.test.ts` (Test 6) |
| **REQ-10** | Dynamic LAN & PageKite QR | Network Ingress Subsystem | `tunnelService.ts`, `qrCodeService.ts` | `security_audit_verification.test.ts` (Test 1) |
| **REQ-11** | Duplicate Print Prevention | Operator Safety Gate | `merchant-desktop/src/components/JobDetailModal.tsx`| Manual Spooler Simulation Suite |
| **REQ-12** | Accessible Motion Primitives | UI Motion Framework | `components/motion-primitives/*` | Vite Build & `tsc --noEmit` Verification |
