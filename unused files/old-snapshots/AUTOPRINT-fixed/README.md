# AutoPrint Fixed - Automated Print Collection & Verification System

Welcome to **AUTOPRINT Fixed**, the production-grade, fail-safe verification and payment architecture for automated print collection systems.

---

## 🏛️ Unified Architecture Overview

The system is organized into three decoupled sub-systems:

```
AUTOPRINT fixed/
├── backend/            # Express/TypeScript fail-safe verification API & spooler trigger
├── merchant-desktop/   # Merchant Desktop Print Job Manager (React + Vite + Electron)
└── customer-web/       # Customer Web Interface & Kiosk (React + Vite + TailwindCSS)
```

---

## 🔒 Fail-Safe Verification & Payment Workflow

### 1. 8-Digit Verification Code Generation & Persistence
- **Secure Randomization**: Codes are generated using Node `crypto` / Web Cryptography API (`crypto.randomBytes` / `getRandomValues`) with rejection sampling to eliminate modulo bias, yielding numbers strictly between `10000000` and `99999999`.
- **Watermark Overlay**: Embedded directly on the final page footer (`VERIFICATION CODE: XXXX XXXX | CHECKSUM: SEC-XXXX-XXXX`) without altering page margins or document layout flow.
- **Persistence**: Code persists throughout the spooling, payment verification, cash collection, and physical tray handover lifecycle.

### 2. Digital Payment & Fail-Safe 3-Strike Lockout
- **Standard Flow**: Customers can choose instant UPI payment (GPay, PhonePe, Paytm, CRED, BHIM) or Counter Cash payment.
- **3-Strike Failure Enforcement**:
  - If a customer's digital UPI payment attempt fails **3 consecutive times** (e.g. invalid PIN, bank timeout, insufficient funds), the system automatically locks the print job into **Cash Collection Mode Exclusively**.
  - All digital gateway options are disabled for that job (`isCashLocked = true`, status: `CASH_LOCKED`).
  - The job remains in the print spooler queue for physical tray retrieval, requiring manual counter cash payment.

### 3. Staff Verification & Handover Interface
- **Lookup**: Staff inputs the customer's 8-digit verification code from the printed document footer into the **Staff Verification** view.
- **UPI Pre-Paid**: Displays green status banner for immediate print handover.
- **Cash Required / Cash Locked**: Launches interactive cash drawer popup with quick denomination buttons and automatic change calculation (`Tendered - Total Due`).

---

## 🌐 API Endpoint Specification

### Health Check
- `GET /health`: System operational status and configuration metrics.

### Print Job Management
- `POST /api/jobs`: Queue a print job, generate 8-digit verification code, embed watermark footer, and return job status.
- `GET /api/jobs`: Retrieve active & historical print queue.
- `GET /api/jobs/:id`: Fetch specific print job metadata.

### Verification & Staff Desk
- `GET /api/verification/lookup/:code`: Perform 8-digit verification code lookup with staff audit tracking.
- `POST /api/verification/collect-cash`: Record staff cash collection, tendered amount, change due, and staff ID.
- `POST /api/verification/handover`: Confirm physical handover of printed documents to the customer.
- `GET /api/verification/audit-logs`: Retrieve immutable verification audit logs.

### Digital Payment Gateway
- `POST /api/payment/digital-attempt`: Record UPI/digital payment attempt, increment strike count, and trigger cash-only lockout if 3 strikes are met.

---

## 🚀 Running locally

### Backend Service
```bash
cd backend
npm install
npm run dev
```

### Merchant Desktop Interface
```bash
cd merchant-desktop
npm install
npm run dev
```

### Customer Web Interface
```bash
cd customer-web
npm install
npm run dev
```

---

## 📜 Compliance & Security
- **Audit Logging**: Every verification lifecycle state transition (`CODE_GENERATED`, `DOCUMENT_EMBEDDED`, `DIGITAL_PAYMENT_FAILED`, `THREE_STRIKE_LOCKOUT_TRIGGERED`, `CASH_COLLECTED`, `PRINTS_HANDED_OVER`) is recorded with timestamp, actor context, and station ID.
