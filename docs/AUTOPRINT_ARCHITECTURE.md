# AutoPrint Application Architecture

## 1. What AutoPrint Does

**AutoPrint** is a **fail-safe verification and payment system for automated print collection and point-of-sale payment processing**.

The system is designed for print shops, kiosks, and retail environments where customers:
1. **Upload and print documents** through a self-service web kiosk
2. **Pay for prints** using digital payment (UPI) or counter cash
3. **Collect prints** using an 8-digit verification code for secure handover

The merchant/staff side verifies the customer's code, handles cash collection when needed, and confirms document handover.

**Key Feature**: Fail-safe 3-strike lockout—if a customer fails UPI payment 3 times, the system automatically locks the order into **cash-only mode**, requiring counter payment.

---

## 2. Application Startup Flow

```
START
  ↓
[Backend API Service Starts]
  - Express.js server listens on port 5000 (configurable)
  - In-memory database initialized
  - API routes registered
  ↓
[Customer Web Kiosk Starts]
  - React frontend starts on port 8085
  - Connects to backend API
  - Displays splash screen → ready to accept documents
  ↓
[Merchant Desktop App Starts]
  - Electron app on port 5000
  - React frontend on port 5000
  - Connects to backend API
  - Displays queue of pending orders
  ↓
SYSTEM READY
```

---

## 3. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        AutoPrint System                         │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER                                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────┐  ┌───────────────────────────────┐   │
│  │ Customer Web Kiosk   │  │ Merchant Desktop App          │   │
│  │ (React + Vite)       │  │ (Electron + React)            │   │
│  │ Port 8085            │  │ Port 5000                     │   │
│  │                      │  │                               │   │
│  │ • File upload        │  │ • Verification lookup         │   │
│  │ • Print specs        │  │ • Cash collection             │   │
│  │ • Payment            │  │ • Document handover           │   │
│  │ • Thank you screen   │  │ • Audit logs view             │   │
│  └──────────────────────┘  └───────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                                  ↑
                    API HTTP Requests/Responses
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│  API/ROUTING LAYER (Express.js)                                │
├─────────────────────────────────────────────────────────────────┤
│  /health                        Health check endpoint           │
│  /api/jobs                      Job management routes           │
│  /api/verification              Verification & lookup routes    │
│  /api/payment                   Digital payment routes          │
└─────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│  BUSINESS LOGIC LAYER (Services)                               │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │ AutoPrintService │  │VerificationServ. │  │ PdfOverlay   │  │
│  │                  │  │                  │  │              │  │
│  │ • Submit job     │  │ • Verify code    │  │ • Embed code │  │
│  │ • Get jobs       │  │ • Process payment│  │ • Watermark  │  │
│  │ • Get job by ID  │  │ • Cash collection│  │              │  │
│  │                  │  │ • Handover       │  │              │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│                                                                  │
│  ┌──────────────────┐                                           │
│  │ AuditLogger      │                                           │
│  │ • Log events     │                                           │
│  │ • Track actions  │                                           │
│  └──────────────────┘                                           │
└─────────────────────────────────────────────────────────────────┘
                                  ↓
┌─────────────────────────────────────────────────────────────────┐
│  DATA LAYER                                                     │
├─────────────────────────────────────────────────────────────────┤
│  In-Memory Database                                             │
│  ├── jobs Map (string → PrintJobResponse)                      │
│  ├── verificationRecords Map (code → CollectionVerificationRec) │
│  └── auditLogs Array                                            │
│                                                                  │
│  NOTE: Data stored in memory for this session.                  │
│  In production, connect to persistent database (SQL/NoSQL).     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 4. Frontend Architecture

### Customer Web Kiosk (`customer-web/`)

**Purpose**: Customer self-service printing and payment interface.

**Technology Stack**:
- React 19 + TypeScript
- Vite (build tool)
- TailwindCSS (styling)
- Motion (animations)

**Key Pages/Steps**:

```
Splash Screen
    ↓
Upload & Specs Selection
    ├─ Upload document (drag-drop or file picker)
    ├─ Select color mode (B&W / Color)
    ├─ Select paper size (A4 / A3 / Letter)
    ├─ Choose page range (all / custom)
    ├─ Select copies
    └─ See price breakdown
    ↓
Payment Selection
    ├─ UPI payment options (Google Pay, PhonePe, etc.)
    ├─ Display QR code & UPI details
    ├─ 3-minute countdown timer
    ├─ OR cash payment option
    └─ Submit payment
    ↓
Thank You Screen
    └─ Display 8-digit verification code
        (customer takes to printer counter)
```

**Key Components**:
- `PrintJobContext.tsx` - Global state management
- `UploadAndSpecsStep.tsx` - File upload & specifications
- `PaymentStep.tsx` - Payment method selection
- `ThankYouStep.tsx` - Order confirmation & code display

**Sample Docs**: For testing, the app includes sample documents that can be selected without uploading.

---

### Merchant Desktop App (`merchant-desktop/`)

**Purpose**: Staff interface for verifying codes, handling cash, and confirming handover.

**Technology Stack**:
- Electron (desktop app)
- React 19 + TypeScript
- Vite
- TailwindCSS

**Key Views**:

```
Merchant Desktop UI
├─ Active Queue
│  └─ Shows all pending print jobs
├─ Staff Verification
│  ├─ Code search/lookup
│  ├─ Payment status display
│  ├─ Cash collection dialog (if CASH_REQUIRED)
│  └─ Handover confirmation
├─ Printer Fleet
│  └─ Printer status & metrics
├─ Telemetry
│  └─ System performance metrics
└─ Job Dispatch Studio
   └─ Advanced job management
```

**Key Component**:
- `StaffVerificationView.tsx` - Main verification interface

---

## 5. Backend Architecture

### Server Structure (`backend/src/`)

```
backend/src/
├── server.ts              # Express app & route registration
├── config/
│   └── environment.ts     # Configuration & environment variables
├── controllers/
│   ├── jobController.ts   # Job management endpoints
│   ├── verificationController.ts  # Verification endpoints
│   └── paymentController.ts       # Payment endpoints
├── services/
│   ├── autoprintService.ts        # Job submission & retrieval
│   ├── verificationService.ts     # Verification code & payment logic
│   └── pdfOverlayService.ts       # PDF watermark embedding
├── database/
│   └── db.ts              # In-memory data store
├── middleware/
│   └── errorHandler.ts    # Error handling & logging
├── types/
│   └── index.ts           # TypeScript interfaces
└── utils/
    ├── crypto.ts          # 8-digit code generation & checksum
    └── auditLogger.ts     # Audit event logging
```

### API Endpoints

#### Health Check
```
GET /health
Response:
{
  "ok": true,
  "service": "autoprint-fail-safe-verification-backend",
  "version": "1.0.0",
  "timestamp": "2026-09-02T...",
  "ports": {
    "api": 5000,
    "merchant": 5000,
    "customer": 8085
  }
}
```

#### Job Management
```
POST /api/jobs
Purpose: Submit a print job
Input:
{
  "fileName": "document.pdf",
  "mimeType": "application/pdf",
  "customerName": "John Doe",
  "specs": {
    "colorMode": "bw",
    "copies": 2,
    "paperSize": "a4",
    "duplex": "single"
  },
  "paymentMethod": "UPI",
  "amountTotal": 50
}
Response:
{
  "id": "QRT-1234",
  "jobNo": "#5678",
  "title": "document.pdf (2 copies, bw)",
  "verification": { ...verification record... },
  "status": "queued"
}

GET /api/jobs
Purpose: Retrieve all jobs
Response: Array of all print jobs (sorted by date)

GET /api/jobs/:id
Purpose: Retrieve specific job by ID
Response: Single print job record
```

#### Verification & Code Lookup
```
GET /api/verification/lookup/:code
Purpose: Lookup job by 8-digit verification code
Input: code (8 digits, e.g., "48291057")
Response: CollectionVerificationRecord

POST /api/verification/collect-cash
Purpose: Record cash collection
Input:
{
  "verificationCode": "48291057",
  "tenderedAmount": 500,
  "staffId": "STAFF-001",
  "staffName": "Ram"
}
Response: Updated verification record with cash amount & change

POST /api/verification/handover
Purpose: Confirm document handover to customer
Input:
{
  "verificationCode": "48291057",
  "staffId": "STAFF-001"
}
Response: Updated record with handover timestamp

GET /api/verification/audit-logs
Purpose: Get all audit logs (filtered by code if provided)
Response: Array of audit log entries
```

#### Digital Payment
```
POST /api/payment/digital-attempt
Purpose: Record UPI payment attempt
Input:
{
  "verificationCode": "48291057",
  "status": "SUCCESS|FAILED|TIMED_OUT",
  "vpa": "customer@upi",
  "gatewayRef": "REF123"
}
Response: 
{
  "strikeLockoutTriggered": false,
  "data": { ...updated verification record... }
}
```

---

## 6. Data Flow: Customer Journey

### Step 1: Document Upload & Specification

```
Customer (Browser)
    ↓
[UploadAndSpecsStep.tsx]
    ├─ User selects file or sample doc
    ├─ Updates PrintJobContext
    ├─ User selects print specs (color, copies, etc.)
    ├─ Calculate pricing in PrintJobContext
    └─ Click "Continue to Payment"
    ↓
Payment Step
```

**Flow Code**:
```
File → handleFile() → setUploadedFile() → updateSpecs()
         ↓
       PrintJobContext updates pricing
```

### Step 2: Payment Initiation

```
Customer (Browser)
    ↓
[PaymentStep.tsx]
    ├─ Select UPI or Cash
    ├─ If UPI: display QR code & 3-minute timer
    ├─ Click "Proceed to Payment" or select cash
    ├─ initiatePayment() called in context
    │  ├─ Calls POST /api/jobs
    │  ├─ Backend submits job → generates 8-digit code
    │  ├─ Code embedded on final page
    │  └─ Job queued in spooler
    └─ completePayment() → Thank You Step
    ↓
[ThankYouStep.tsx]
    ├─ Display 8-digit verification code
    ├─ Display formatted code (e.g., "4829 1057")
    ├─ Show "Take this code to the counter"
    └─ Print instructions
    ↓
Customer takes code to counter
```

### Step 3: Backend Processing

```
POST /api/jobs (from customer web)
    ↓
[jobController.submitJob()]
    ├─ Validate request
    └─ Call AutoPrintService.submitJob()
    ↓
[AutoPrintService.submitJob()]
    ├─ Generate job ID: "QRT-1234"
    ├─ Generate job number: "#5678"
    ├─ Call VerificationService.createVerificationRecord()
    ↓
[VerificationService.createVerificationRecord()]
    ├─ Generate 8-digit code (e.g., "48291057")
    ├─ Generate security checksum
    ├─ Create CollectionVerificationRecord
    ├─ Save to db.verificationRecords Map
    ├─ Log: CODE_GENERATED (audit)
    ├─ Call PdfOverlayService.embedVerificationCodeOnFinalPage()
    │  └─ Add watermark footer to document
    ├─ Log: DOCUMENT_EMBEDDED (audit)
    └─ Return verification record
    ↓
Response to customer with code
```

---

## 7. Data Flow: Merchant/Staff Handover

### Step 1: Code Lookup

```
Staff (Merchant Desktop)
    ↓
[StaffVerificationView.tsx]
    ├─ User enters 8-digit code (e.g., "4829 1057")
    ├─ Auto-formats to "4829 1057" (space-separated)
    ├─ Click search
    ├─ Call GET /api/verification/lookup/48291057
    │
    └─→ [verificationController.lookupByCode()]
        ├─ Sanitize code: remove spaces/dashes → "48291057"
        ├─ Validate format (exactly 8 digits)
        ├─ Call VerificationService.lookupByCode()
        │
        └─→ [VerificationService.lookupByCode()]
            ├─ Query db.verificationRecords.get("48291057")
            ├─ Log: STAFF_LOOKUP_INITIATED (audit)
            └─ Return CollectionVerificationRecord
    ↓
    Display record details:
    ├─ Customer name
    ├─ Job title
    ├─ Amount due
    ├─ Payment status (PENDING | UPI_SUCCESS | CASH_REQUIRED | CASH_LOCKED)
    └─ Handover status (PENDING_PRINT | READY_IN_TRAY | COLLECTED)
```

### Step 2: Payment Status Handling

```
Based on Payment Status:

┌─ UPI_SUCCESS
│  └─ Display: "✓ PAYMENT VERIFIED"
│     Staff confirms handover → prints released
│
├─ CASH_REQUIRED
│  └─ Display: "💰 CASH PAYMENT REQUIRED"
│     Staff opens cash collection dialog:
│     ├─ Enter tendered amount
│     ├─ System calculates change due
│     ├─ POST /api/verification/collect-cash
│     ├─ Record cash transaction
│     └─ Ready for handover
│
└─ CASH_LOCKED
   └─ Display: "🔒 CASH ONLY (3 STRIKES)"
      Force cash-only mode (UPI disabled)
      Same as CASH_REQUIRED
```

### Step 3: Handover Confirmation

```
Staff clicks "Confirm Handover"
    ↓
POST /api/verification/handover
{
  "verificationCode": "48291057",
  "staffId": "STAFF-001"
}
    ↓
[VerificationService.confirmHandover()]
    ├─ Update record.handoverStatus = "COLLECTED"
    ├─ Record handover timestamp
    ├─ Log: PRINTS_HANDED_OVER (audit)
    └─ Return updated record
    ↓
Staff confirms → Prints released to customer
```

---

## 8. Payment & Fail-Safe System

### Digital Payment Attempt (UPI)

```
Customer initiates UPI payment
    ↓
Frontend sends: POST /api/payment/digital-attempt
{
  "verificationCode": "48291057",
  "status": "SUCCESS|FAILED|TIMED_OUT",
  "vpa": "customer@upi"
}
    ↓
[PaymentController.recordDigitalAttempt()]
    ├─ Validate inputs
    └─ Call VerificationService.processDigitalPaymentAttempt()
    ↓
[VerificationService.processDigitalPaymentAttempt()]
    ├─ Lookup record by code
    ├─ Check if already locked or paid
    ├─ Increment failedDigitalAttemptsCount
    ├─ If status = SUCCESS:
    │  ├─ Set paymentStatus = "UPI_SUCCESS"
    │  ├─ Log: UPI_PAYMENT_CONFIRMED (audit)
    │  └─ Return record
    │
    ├─ If status = FAILED or TIMED_OUT:
    │  ├─ Increment attempt counter
    │  ├─ Log: DIGITAL_PAYMENT_FAILED (audit)
    │  │
    │  └─ Check: failedDigitalAttemptsCount >= 3?
    │     ├─ YES → Activate 3-Strike Lockout:
    │     │  ├─ Set record.isCashLocked = true
    │     │  ├─ Set paymentStatus = "CASH_LOCKED"
    │     │  ├─ Log: THREE_STRIKE_LOCKOUT_TRIGGERED (audit)
    │     │  └─ Return with strikeLockoutTriggered = true
    │     │
    │     └─ NO → Return (tries remaining)
    │
    └─ Return updated record
```

### Why 3-Strike Lockout?

The 3-strike system ensures that:
1. **Customers get 3 chances** to complete UPI payment
2. **After 3 failures**, the system forces cash-only mode to prevent:
   - Network loops
   - Repeated payment gateway timeouts
   - Customer frustration
   - Merchant operational issues

Once locked, **only physical cash payment** can proceed, creating a manual recovery point.

---

## 9. Verification Code & Security

### 8-Digit Code Generation

```
[crypto.ts: generateSecureVerificationCode()]
    ├─ Use Node.js crypto.randomBytes(4) for cryptographic randomness
    ├─ Convert to uint32 with rejection sampling:
    │  └─ Ensures NO modulo bias
    ├─ Map to range [10000000, 99999999]
    ├─ Return as:
    │  ├─ raw: "48291057"
    │  └─ formatted: "4829 1057" (for display)
    └─ Store both in verification record
```

### Security Checksum

```
[crypto.ts: computeSecurityChecksum()]
    ├─ Payload: verificationCode:jobId:amount:SECURITY_SALT
    ├─ Hash with SHA-256
    ├─ Extract 8 chars from hash
    ├─ Format as: SEC-XXXX-XXXX
    └─ Embed on watermark footer for physical validation
```

### Why Both?

- **8-digit code**: Human-readable, typed at staff terminal
- **Checksum**: Validates code wasn't forged/tampered on printed page

---

## 10. Watermark Embedding & Document Handling

### PDF Overlay Process

```
[pdfOverlayService.ts: embedVerificationCodeOnFinalPage()]
    ├─ Input: raw HTML content, code, checksum
    ├─ Create footer HTML div:
    │  ├─ Large formatted code: "4829 1057"
    │  ├─ Checksum: "SEC-XXXX-XXXX"
    │  ├─ Timestamp
    │  └─ Instructions: "DO NOT DETACH"
    ├─ Append footer to document
    ├─ Return modified HTML
    └─ Document ready to print
```

### Document Storage

Currently: **In-memory** (for this session)

In production, implement:
- **File storage**: AWS S3 / Local disk
- **Document references**: Database records link to storage keys
- **Cleanup**: Delete after handover + retention period

---

## 11. Audit Logging

### Every Action is Logged

```
[auditLogger.ts]
Logs track:
├─ CODE_GENERATED          (when code created)
├─ DOCUMENT_EMBEDDED       (when watermark added)
├─ STAFF_LOOKUP_INITIATED  (when staff searches)
├─ DIGITAL_PAYMENT_FAILED  (when UPI fails)
├─ THREE_STRIKE_LOCKOUT_TRIGGERED (when 3 strikes hit)
├─ CASH_COLLECTION_COMPLETED (when cash recorded)
└─ PRINTS_HANDED_OVER       (when handover confirmed)

Each log entry includes:
├─ id: unique log ID
├─ timestamp: ISO datetime
├─ verificationCode: 8-digit code
├─ jobId & jobNo
├─ action: event type
├─ actor: who/what triggered (SYSTEM, STAFF, CUSTOMER, PAYMENT_GATEWAY)
├─ staffId & staffName (if applicable)
└─ details: action-specific metadata
```

### Immutable Audit Trail

- Logs stored in chronological order (newest first)
- Maximum 1000 logs kept in memory
- API: `GET /api/verification/audit-logs?code=48291057`

---

## 12. Configuration & Environment

### Environment Variables

```
PORT=5000                    # API server port
MERCHANT_PORT=5000           # Merchant desktop port  
CUSTOMER_PORT=8085           # Customer kiosk port
NODE_ENV=production          # Environment mode
MAX_DIGITAL_ATTEMPTS=3       # Strike lockout threshold
SECURITY_SALT=AP_VERIFY_... # HMAC salt for checksums
CORS_ORIGIN=*               # CORS configuration
```

### Production Config File

```
C:\AutoPrint\Config\appsettings.json
{
  "ServerPort": 5000,
  "MerchantDesktopPort": 5000,
  "CustomerWebPort": 8085,
  "MaxDigitalAttempts": 3
}
```

---

## 13. Local-Only Operation

### How AutoPrint Runs Locally

✅ **Fully Local**:
- Express backend runs on localhost
- Customer kiosk connects to localhost:5000
- Merchant desktop connects to localhost:5000
- In-memory database (no external DB required)
- No internet calls required

❌ **NOT Required**:
- Internet validation
- Online activation
- Cloud authentication
- Remote databases
- Third-party APIs (except optional payment gateways)

### Data Persistence

**Current**: In-memory (lost on restart)

**Production**: 
```
Local Disk Storage:
C:\AutoPrint\Data\
├── Database\
│   └── jobs.json (persistent job records)
├── Documents\
│   └── [job-id]-document.pdf
└── Logs\
    └── audit-logs.json
```

---

## 14. Error Handling

### Request Validation

```
Each endpoint validates:
├─ Required fields present
├─ Data types correct
├─ Values in valid range
└─ Business logic constraints
```

### Error Response Format

```
{
  "ok": false,
  "error": "Human-readable error message"
}
HTTP Status: 400 (bad request) or 404 (not found) or 500 (server error)
```

### Error Handler Middleware

```
[errorHandler.ts]
├─ requestLogger: logs incoming requests
├─ errorHandler: catches & formats errors
└─ Response standardized to:
   {
     "ok": false,
     "error": "error message"
   }
```

---

## 15. How Everything Connects

### Complete Flow Diagram

```
CUSTOMER                                    MERCHANT STAFF
  │                                             │
  │ 1. Upload file & specs                    │
  │                                             │
  ├─→ Frontend → POST /api/jobs               │
  │       │                                     │
  │       └─→ Backend generates 8-digit code   │
  │           ├─ Embeds watermark             │
  │           └─ Saves verification record    │
  │                                             │
  │ 2. Pays (UPI or cash selection)           │
  │                                             │
  │ 3. Receives code: "4829 1057"             │
  │       │                                     │
  │       └─→ Takes printed document          │
  │           (code & checksum on footer)     │
  │                                             │
  │                                      ← Searches by code
  │                                      
  │                            GET /api/verification/lookup/48291057
  │                                      │
  │                                      ├─ Display job details
  │                                      ├─ Show payment status
  │                                      └─ Open cash dialog if needed
  │                                      
  │                                      ↓
  │                                      POST /api/verification/collect-cash
  │                                      (if cash required)
  │                                      
  │                                      ↓
  │                                      POST /api/verification/handover
  │                                      │
  │                                      └─ Confirm handover
  │                                      
  │ 4. Receives prints                  ← Handover complete
  └─────────────────────────→
```

---

## 16. Important Folders

```
AutoPrint/
├── backend/                     # Node.js Express API
│   ├── src/
│   │   ├── server.ts            # Express app entry point
│   │   ├── config/              # Configuration
│   │   ├── controllers/         # API endpoints
│   │   ├── services/            # Business logic
│   │   ├── database/            # Data store
│   │   ├── middleware/          # Error handling
│   │   ├── types/               # TypeScript types
│   │   └── utils/               # Utilities (crypto, audit)
│   └── package.json
│
├── customer-web/                # Customer kiosk (React)
│   ├── src/
│   │   ├── App.tsx              # Main app
│   │   ├── context/             # PrintJobContext (state)
│   │   ├── components/          # UI components
│   │   ├── types/               # Type definitions
│   │   └── utils/               # Helpers
│   └── package.json
│
├── merchant-desktop/            # Merchant app (Electron)
│   ├── src/
│   │   ├── App.tsx              # Main app
│   │   ├── components/          # UI components
│   │   ├── services/            # API services
│   │   ├── types/               # Types
│   │   └── utils/               # Utilities
│   ├── electron/                # Electron main/preload
│   └── package.json
│
└── docs/                        # Documentation
    └── AUTOPRINT_ARCHITECTURE.md (this file)
```

---

## 17. Important Files & Their Purpose

### Backend Core

| File | Purpose |
|------|---------|
| `server.ts` | Express app setup, route registration, health check |
| `config/environment.ts` | Configuration loading from .env or appsettings.json |
| `controllers/jobController.ts` | HTTP handlers for job endpoints |
| `controllers/verificationController.ts` | HTTP handlers for verification endpoints |
| `controllers/paymentController.ts` | HTTP handlers for payment endpoints |
| `services/autoprintService.ts` | Job submission, retrieval, storage logic |
| `services/verificationService.ts` | Verification code, payment, handover logic |
| `services/pdfOverlayService.ts` | Watermark embedding on documents |
| `database/db.ts` | In-memory Maps for jobs & verification records |
| `utils/crypto.ts` | 8-digit code generation, checksum computation |
| `utils/auditLogger.ts` | Immutable audit log service |
| `types/index.ts` | TypeScript interfaces for all domain models |

### Customer Frontend

| File | Purpose |
|------|---------|
| `App.tsx` | Main React app, view orchestration |
| `context/PrintJobContext.tsx` | Global state (current step, file, specs, pricing) |
| `components/UploadAndSpecsStep.tsx` | File upload & print specifications UI |
| `components/PaymentStep.tsx` | Payment method selection & UPI QR display |
| `components/ThankYouStep.tsx` | Verification code display |
| `types/index.ts` | Type definitions (ColorMode, PaymentMethod, etc.) |
| `utils/helpers.ts` | Code generation, page range parsing, formatting |

### Merchant Frontend

| File | Purpose |
|------|---------|
| `App.tsx` | Main Electron app, view management |
| `components/StaffVerificationView.tsx` | Code lookup, cash collection, handover |
| `components/ActiveQueueView.tsx` | List of pending jobs |
| `types/verification.ts` | Verification record types |
| `services/verificationService.ts` | API calls to backend |

---

## 18. Important Functions

### Backend Services

**AutoPrintService**:
- `submitJob(request)` → Creates job, generates code, returns job record
- `getAllJobs()` → Returns all jobs sorted by date
- `getJobById(id)` → Returns single job

**VerificationService**:
- `createVerificationRecord(jobId, jobNo, request)` → Creates verification record with 8-digit code
- `lookupByCode(code, staffId)` → Finds verification record by code
- `processDigitalPaymentAttempt(code, attempt)` → Records payment attempt, triggers 3-strike lockout
- `processCashCollection(code, amount, staffId, staffName)` → Records cash payment
- `confirmHandover(code, staffId, staffName)` → Confirms document handover

**PdfOverlayService**:
- `embedVerificationCodeOnFinalPage(html, code, formattedCode, checksum)` → Adds watermark to document

**Crypto Utils**:
- `generateSecureVerificationCode()` → Returns 8-digit code (raw + formatted)
- `computeSecurityChecksum(code, jobId, amount)` → Returns SEC-XXXX-XXXX checksum

**AuditLogger**:
- `logEvent(params)` → Records action with timestamp & details
- `getLogs(code)` → Retrieves logs for specific code or all logs

---

## 19. Important API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | System health & configuration status |
| POST | `/api/jobs` | Submit new print job |
| GET | `/api/jobs` | Get all jobs |
| GET | `/api/jobs/:id` | Get specific job |
| GET | `/api/verification/lookup/:code` | Lookup job by 8-digit code |
| POST | `/api/verification/lookup` | Lookup by code in body |
| POST | `/api/verification/collect-cash` | Record cash collection |
| POST | `/api/verification/handover` | Confirm handover |
| GET | `/api/verification/audit-logs` | Get audit logs |
| POST | `/api/payment/digital-attempt` | Record UPI payment attempt |

---

## 20. How Everything Connects (Technical Summary)

```
┌─────────────────────────────────────────────────────────┐
│ CUSTOMER WEB (React)                                    │
│ ├─ PrintJobContext (central state)                     │
│ ├─ UploadAndSpecsStep → setUploadedFile(), updateSpecs()
│ ├─ PaymentStep → initiatePayment() → POST /api/jobs    │
│ └─ ThankYouStep → Display generated code               │
└─────────────────────────────────────────────────────────┘
                          ↓ HTTP
┌─────────────────────────────────────────────────────────┐
│ EXPRESS SERVER (Node.js)                                │
│ ├─ POST /api/jobs → JobController.submitJob()          │
│ │  └─ AutoPrintService.submitJob()                     │
│ │     ├─ VerificationService.createVerificationRecord()│
│ │     │  ├─ generateSecureVerificationCode()           │
│ │     │  ├─ PdfOverlayService.embedVerification...()  │
│ │     │  ├─ auditLogger.logEvent(CODE_GENERATED)       │
│ │     │  └─ db.verificationRecords.set(code, record)   │
│ │     └─ db.jobs.set(id, job)                          │
│ │
│ ├─ GET /api/verification/lookup/:code → lookup service │
│ ├─ POST /api/payment/digital-attempt → payment attempt │
│ ├─ POST /api/verification/collect-cash → cash record   │
│ └─ POST /api/verification/handover → confirm handover  │
└─────────────────────────────────────────────────────────┘
                          ↓ HTTP
┌─────────────────────────────────────────────────────────┐
│ MERCHANT DESKTOP (Electron + React)                     │
│ ├─ StaffVerificationView                               │
│ ├─ Search by code → GET /api/verification/lookup/:code │
│ ├─ Display payment status                              │
│ ├─ Open cash dialog if CASH_REQUIRED                   │
│ ├─ POST /api/verification/collect-cash                 │
│ ├─ POST /api/verification/handover                     │
│ └─ Display handover confirmation                       │
└─────────────────────────────────────────────────────────┘

DATA PERSISTENCE:
├─ In-Memory:
│  ├─ db.jobs (Map)
│  ├─ db.verificationRecords (Map)
│  └─ auditLogger.auditLogs (Array)
│
└─ Production (recommended):
   ├─ SQLite / PostgreSQL for jobs & verification
   └─ File storage for documents
```

---

## Summary

**AutoPrint** is a complete end-to-end system for:

1. **Customers**: Self-service printing with secure code-based collection
2. **Merchants**: Staff verification, payment handling, and audit tracking
3. **Backend**: Secure code generation, fail-safe payment lockout, and complete audit trail

Every action is **logged**, every payment is **tracked**, and every print job has a **unique identifier** for secure handover.

The 3-strike fail-safe ensures that failed payment attempts don't result in infinite loops—instead, the system automatically locks the job into cash-only mode, creating a manual recovery point for the operator.

All components communicate over **HTTP REST APIs**, making the system stateless, scalable, and easy to extend.
