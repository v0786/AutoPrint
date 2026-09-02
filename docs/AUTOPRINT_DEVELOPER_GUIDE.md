# AutoPrint Developer Guide

## What is AutoPrint?

AutoPrint is a **fail-safe print collection and payment verification system** designed for self-service print shops, kiosks, and retail environments.

**In Plain English:**
- A customer uploads a document and selects print options
- The system generates an 8-digit verification code
- The code is printed on the document
- Staff verifies the code, handles payment, and confirms handover
- If payment fails 3 times, the system forces cash-only mode

---

## Project Structure

```
AutoPrint/
├── backend/                    # Node.js Express API
│   ├── src/
│   │   ├── server.ts          # Express app entry point
│   │   ├── config/            # Configuration
│   │   ├── controllers/       # HTTP endpoints
│   │   ├── services/          # Business logic
│   │   ├── database/          # Data store (in-memory)
│   │   ├── middleware/        # Error handling
│   │   ├── types/             # TypeScript interfaces
│   │   └── utils/             # Crypto, logging
│   ├── package.json
│   └── tsconfig.json
│
├── customer-web/              # Customer kiosk (React)
│   ├── src/
│   │   ├── App.tsx            # Main entry
│   │   ├── context/           # Global state (PrintJobContext)
│   │   ├── components/        # UI components
│   │   ├── types/             # TypeScript types
│   │   └── utils/             # Helpers
│   ├── vite.config.ts
│   └── package.json
│
├── merchant-desktop/          # Staff interface (Electron)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/        # UI components
│   │   ├── services/          # API services
│   │   ├── types/
│   │   └── utils/
│   ├── electron/              # Electron main/preload
│   ├── vite.config.ts
│   └── package.json
│
└── docs/                      # Documentation
    ├── AUTOPRINT_ARCHITECTURE.md
    └── AUTOPRINT_DEVELOPER_GUIDE.md (this file)
```

---

## How The Application Starts

### 1. Backend Startup

```bash
cd backend
npm install
npm run dev
```

**What Happens:**
1. Express server starts on port 5000 (configurable)
2. Routes registered:
   - `/health` - System status
   - `/api/jobs` - Job management
   - `/api/verification` - Code lookup & handover
   - `/api/payment` - Payment tracking
3. In-memory database initialized (empty Maps)
4. Ready to accept API requests

**Files Involved:**
- `server.ts` - Express setup & route registration
- `config/environment.ts` - Configuration loading
- `middleware/errorHandler.ts` - Error handling middleware
- `controllers/*` - Route handlers
- `database/db.ts` - In-memory data storage

### 2. Customer Web Startup

```bash
cd customer-web
npm install
npm run dev
```

**What Happens:**
1. Vite dev server starts on port 8085
2. React app loads in browser
3. PrintJobContext initialized with default state
4. Splash screen displayed
5. Ready to accept files

**Files Involved:**
- `App.tsx` - Main app component
- `context/PrintJobContext.tsx` - State management
- `components/SplashScreen.tsx` - First screen

### 3. Merchant Desktop Startup

```bash
cd merchant-desktop
npm install
npm run dev
```

**What Happens:**
1. Electron app launches
2. React frontend loads
3. Shows onboarding wizard (first time only)
4. Displays Active Queue view
5. Ready to verify codes

**Files Involved:**
- `electron/main.ts` - Electron main process
- `App.tsx` - React app root
- `components/StaffVerificationView.tsx` - Primary interface

---

## Frontend-Backend Communication

### REST API Pattern

All communication is **HTTP REST** with JSON payloads.

**Request Headers:**
```
Content-Type: application/json
CORS: * (all origins allowed)
```

**Response Format (Success):**
```json
{
  "ok": true,
  "message": "Optional success message",
  "data": { ... response data ... }
}
```

**Response Format (Error):**
```json
{
  "ok": false,
  "error": "Human-readable error message"
}
```

### Example: Customer Submits Print Job

```javascript
// Customer Web (PaymentStep.tsx)
const response = await fetch('http://localhost:5000/api/jobs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fileName: 'resume.pdf',
    mimeType: 'application/pdf',
    customerName: 'John Doe',
    specs: {
      colorMode: 'bw',
      copies: 2,
      paperSize: 'a4',
      duplex: 'single'
    },
    paymentMethod: 'UPI',
    amountTotal: 50
  })
});

const result = await response.json();
// result.data contains:
// {
//   id: "QRT-5678",
//   jobNo: "#1234",
//   verification: {
//     verificationCode: "48291057",
//     formattedCode: "4829 1057",
//     paymentStatus: "PENDING",
//     ...
//   }
// }
```

---

## API Structure

### Health Check

```
GET /health
Response:
{
  "ok": true,
  "service": "autoprint-fail-safe-verification-backend",
  "version": "1.0.0",
  "ports": { "api": 5000, "merchant": 5000, "customer": 8085 }
}
```

### Job Management

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/jobs` | POST | Submit new print job |
| `/api/jobs` | GET | Get all jobs |
| `/api/jobs/:id` | GET | Get specific job |

### Verification

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/verification/lookup/:code` | GET | Lookup by code |
| `/api/verification/collect-cash` | POST | Record cash payment |
| `/api/verification/handover` | POST | Confirm handover |
| `/api/verification/audit-logs` | GET | Get audit trail |

### Payment

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/payment/digital-attempt` | POST | Record UPI attempt |

---

## Database Layer

### Current Implementation

**In-Memory Storage** (not persistent):
```typescript
class InMemoryDatabase {
  public jobs: Map<string, PrintJobResponse>
  public verificationRecords: Map<string, CollectionVerificationRecord>
}
```

**Access Pattern:**
```typescript
// Store
db.jobs.set(jobId, jobRecord);
db.verificationRecords.set(verificationCode, record);

// Retrieve
const job = db.jobs.get(jobId);
const record = db.verificationRecords.get("48291057");

// Iterate
const allJobs = Array.from(db.jobs.values());
```

### For Production

Implement persistent storage:

```typescript
// Option 1: SQLite
npm install sqlite3
const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('autoprint.db');

// Option 2: PostgreSQL
npm install pg
const { Client } = require('pg');

// Option 3: File-based JSON
fs.writeFileSync('data/jobs.json', JSON.stringify(jobs));
```

**Migration Steps:**
1. Create database schema
2. Update `database/db.ts` to use new persistence layer
3. Implement read/write methods
4. Add backup/restore procedures

---

## File Upload & Storage

### Current Flow

```
Customer Browser
   ↓
File input (HTML form)
   ↓
(File metadata stored in context)
   ↓
POST /api/jobs
   ↓
Backend receives request
   ↓
(No file binary sent - only metadata)
   ↓
Create verification record
   ↓
Embed watermark on HTML
   ↓
Return code to customer
```

**Key Point:** File content is NOT transferred to backend in current implementation.
It's stored client-side for preview only.

### For Production File Handling

Implement server-side storage:

```typescript
// 1. Accept file upload
app.post('/api/jobs', upload.single('document'), (req, res) => {
  const filePath = req.file.path;  // Multer saved file
  const fileName = req.file.originalname;
  
  // 2. Move to storage
  const storagePath = `C:\\AutoPrint\\Data\\Documents\\${jobId}.pdf`;
  fs.renameSync(filePath, storagePath);
  
  // 3. Process document
  // - Extract page count
  // - Generate thumbnail
  // - Extract text for search
  
  // 4. Store reference
  db.jobs.set(jobId, {
    ...jobData,
    documentPath: storagePath,
    pages: 12,
    thumbnail: 'thumb.jpg'
  });
});

// 5. Retrieve for printing
app.get('/api/jobs/:id/document', (req, res) => {
  const job = db.jobs.get(req.params.id);
  res.download(job.documentPath);
});
```

**Libraries:**
- `multer` - File upload middleware
- `pdf-parse` - PDF page extraction
- `sharp` - Image thumbnails
- `pdfkit` - PDF manipulation

---

## QR Code & Verification Code

### 8-Digit Code Generation

```typescript
// backend/src/utils/crypto.ts
export function generateSecureVerificationCode(): GeneratedCode {
  // Uses crypto.randomBytes() - cryptographically secure
  // Applies rejection sampling - no modulo bias
  // Returns: { raw: "48291057", formatted: "4829 1057" }
}
```

**Why Rejection Sampling?**
```
Bad: Math.floor(Math.random() * 10000000)
     → Biased toward lower numbers
     
Good: crypto.randomBytes() + rejection sampling
      → Perfectly uniform distribution
      → Cryptographically secure
```

### Security Checksum

```typescript
// Example: "SEC-A1B2-C3D4"
// Computed from: CODE + JOBID + AMOUNT + SALT
// Used to: Validate code hasn't been forged
// Printed on: Watermark footer
```

### Customer View

```
Frontend displays:
┌──────────────────────────────┐
│ VERIFICATION CODE: 4829 1057 │
│                              │
│ CHECKSUM: SEC-A1B2-C3D4      │
│                              │
│ Take this code to counter    │
└──────────────────────────────┘
```

---

## Printing Integration

### Current Implementation

No actual printer integration—verification code is embedded as watermark.

### For Production Integration

```typescript
// 1. Use Node.js printer library
npm install printer

// 2. List available printers
const printers = require('printer').getPrinters();
// Returns: [{ name: "Canon LBP6300" }, ...]

// 3. Send to printer
const printResult = require('printer').printDirect({
  printer: "Canon LBP6300",
  content: htmlContent,
  type: 'RAW'
});

// 4. Track print status
if (printResult.success) {
  updateJobStatus(jobId, 'printing');
  updateJobStatus(jobId, 'completed');
} else {
  updateJobStatus(jobId, 'failed');
}

// 5. Listen for print completion
const PrinterStatusMonitor = require('printer-status-monitor');
monitor.on('job-complete', (jobId) => {
  updateJobStatus(jobId, 'ready_in_tray');
});
```

---

## Error Handling

### Backend Error Flow

```
Endpoint receives request
   ↓
Controller validates inputs
   ↓
Service executes business logic
   ↓
Error occurs (if any)
   ↓
Thrown error caught by errorHandler middleware
   ↓
Response: { ok: false, error: "error message" }
   ↓
HTTP 400/404/500 status
```

### Error Types

**Validation Errors (400):**
```json
{
  "ok": false,
  "error": "Invalid verification code format. Code must be exactly 8 digits."
}
```

**Not Found Errors (404):**
```json
{
  "ok": false,
  "error": "No print job found for verification code: 48291057"
}
```

**Server Errors (500):**
```json
{
  "ok": false,
  "error": "Internal server error. Please contact support."
}
```

### Frontend Error Handling

```typescript
// PaymentStep.tsx
try {
  const response = await fetch('/api/jobs', { ... });
  const result = await response.json();
  
  if (!result.ok) {
    setError(result.error);  // Display error to user
    return;
  }
  
  setCurrentOrder(result.data);
} catch (err) {
  setError('Network error. Please try again.');
}
```

---

## Configuration

### Environment Variables

```
# Backend: backend/.env or environment.ts
PORT=5000
MERCHANT_PORT=5000
CUSTOMER_PORT=8085
NODE_ENV=production
MAX_DIGITAL_ATTEMPTS=3
SECURITY_SALT=AP_VERIFY_HMAC_SECURE_2026
CORS_ORIGIN=*
```

### Production Configuration

```json
// C:\AutoPrint\Config\appsettings.json
{
  "ServerPort": 5000,
  "MerchantDesktopPort": 5000,
  "CustomerWebPort": 8085,
  "MaxDigitalAttempts": 3,
  "LogLevel": "info",
  "DatabasePath": "C:\\AutoPrint\\Data\\Database\\",
  "DocumentPath": "C:\\AutoPrint\\Data\\Documents\\"
}
```

---

## Local Network Communication

### For Kiosk Deployments

```
Network Setup:
┌─────────────────────────┐
│  Network LAN (192.168.1.x)
│
├─ PC 1: Backend API (192.168.1.100:5000)
├─ Kiosk 1: Customer Web (192.168.1.101:8085)
├─ Kiosk 2: Customer Web (192.168.1.102:8085)
├─ Desktop: Merchant App (192.168.1.103)
└─ Printer: Connected to network
```

**Configuration:**
```javascript
// customer-web/src/config.ts
const API_BASE_URL = 'http://192.168.1.100:5000';

// merchant-desktop/src/services/verificationService.ts
const API_BASE_URL = 'http://192.168.1.100:5000';
```

**Firewall Rules:**
```
Allow inbound:
- Port 5000 (backend API)
- Port 8085 (customer kiosk)
- Port 9100 (network printer)
```

---

## Troubleshooting

### Backend Won't Start

```bash
# Check if port 5000 is in use
netstat -ano | findstr :5000

# Kill process using port 5000
taskkill /PID <PID> /F

# Start backend
npm run dev
```

### Frontend Can't Connect to Backend

```bash
# Test backend is running
curl http://localhost:5000/health

# Check CORS
# Backend should have: app.use(cors({ origin: '*' }))

# Check firewall (if on different machines)
# Allow port 5000 in Windows Firewall
```

### Verification Code Not Generated

```bash
# Check crypto module is loaded
node -e "console.log(require('crypto').randomBytes(4))"

# Verify database isn't full
console.log(db.verificationRecords.size);
```

### Payment Flow Stuck

```bash
# Check UPI payment implementation
POST /api/payment/digital-attempt
{
  "verificationCode": "48291057",
  "status": "SUCCESS|FAILED",
  "vpa": "merchant@upi"
}

# Check 3-strike logic
if (record.failedDigitalAttemptsCount >= 3) {
  record.isCashLocked = true;
}
```

---

## How to Trace a Feature

### Example: Customer Submits Print Job

**Step 1: Frontend (customer-web)**
- File: `components/PaymentStep.tsx`
- Function: `handleProceed()` or `handleFinalConfirm()`
- Action: Calls `completePayment()`

**Step 2: State Management (customer-web)**
- File: `context/PrintJobContext.tsx`
- Function: `completePayment()`
- Action: Calls API endpoint

**Step 3: HTTP Request**
```
POST http://localhost:5000/api/jobs
Body: {
  fileName, mimeType, customerName, specs,
  paymentMethod, amountTotal
}
```

**Step 4: Backend Entry (backend)**
- File: `server.ts`
- Route: `api.post('/jobs', JobController.submitJob)`

**Step 5: Controller (backend)**
- File: `controllers/jobController.ts`
- Function: `JobController.submitJob(req, res, next)`
- Action: Calls `AutoPrintService.submitJob(req.body)`

**Step 6: Service (backend)**
- File: `services/autoprintService.ts`
- Function: `AutoPrintService.submitJob(request)`
- Actions:
  - Generate jobId: "QRT-5678"
  - Generate jobNo: "#1234"
  - Call `VerificationService.createVerificationRecord()`

**Step 7: Verification Service (backend)**
- File: `services/verificationService.ts`
- Function: `VerificationService.createVerificationRecord()`
- Actions:
  - Generate 8-digit code: "48291057"
  - Compute checksum: "SEC-A1B2-C3D4"
  - Call `PdfOverlayService.embedVerificationCodeOnFinalPage()`
  - Call `auditLogger.logEvent({ action: 'CODE_GENERATED' })`
  - Store in `db.verificationRecords`

**Step 8: Database (backend)**
- File: `database/db.ts`
- Action: `db.verificationRecords.set("48291057", record)`

**Step 9: Response**
```json
{
  "ok": true,
  "data": {
    "id": "QRT-5678",
    "verification": {
      "verificationCode": "48291057",
      "formattedCode": "4829 1057"
    }
  }
}
```

**Step 10: Frontend Update (customer-web)**
- File: `components/PaymentStep.tsx` or `App.tsx`
- Action: Receive response, store in state
- Action: Display `ThankYouStep` with code

**Step 11: Merchant View (merchant-desktop)**
- File: `components/StaffVerificationView.tsx`
- Action: Staff enters code
- Action: Calls `GET /api/verification/lookup/48291057`
- Action: Displays job details

---

## How to Add a New Feature

### Example: Add SMS Notification When Payment Received

**Step 1: Add Service**
```typescript
// backend/src/services/smsService.ts
export class SmsService {
  public static async sendPaymentConfirmation(
    phoneNumber: string,
    verificationCode: string
  ): Promise<void> {
    // Integrate with Twilio/SNS/local SMS gateway
    const message = `Payment received. Code: ${verificationCode}`;
    // await smsGateway.send(phoneNumber, message);
  }
}
```

**Step 2: Update Verification Service**
```typescript
// backend/src/services/verificationService.ts
if (attemptInput.status === 'SUCCESS') {
  record.paymentStatus = 'UPI_SUCCESS';
  
  // NEW: Send SMS
  await SmsService.sendPaymentConfirmation(
    record.customerPhone,
    record.verificationCode
  );
  
  auditLogger.logEvent({...});
}
```

**Step 3: Update Types**
```typescript
// backend/src/types/index.ts
export interface CollectionVerificationRecord {
  // ... existing fields ...
  smsSentAt?: string;  // NEW
}
```

**Step 4: Test**
```bash
# Test SMS sending
POST /api/payment/digital-attempt
{
  "verificationCode": "48291057",
  "status": "SUCCESS",
  "vpa": "customer@upi"
}
# Check: SMS should be sent
```

---

## How to Modify an Existing Feature

### Example: Change 3-Strike Limit to 5 Strikes

**Step 1: Update Configuration**
```typescript
// backend/src/config/environment.ts
MAX_DIGITAL_ATTEMPTS: Number(process.env.MAX_DIGITAL_ATTEMPTS || 5),
```

**Step 2: Update Logic**
```typescript
// backend/src/services/verificationService.ts
public static processDigitalPaymentAttempt(...) {
  const record = this.lookupByCode(verificationCode);
  
  // Change from >= 3 to >= 5
  if (record.failedDigitalAttemptsCount >= CONFIG.MAX_DIGITAL_ATTEMPTS) {
    record.isCashLocked = true;
    // ...
  }
}
```

**Step 3: Update Frontend Display (optional)**
```typescript
// customer-web/src/components/PaymentStep.tsx
// Update error message if applicable
const strikeCount = response.data.failedDigitalAttemptsCount;
const maxStrikes = 5;
if (strikeCount > 0) {
  setErrorMessage(`Payment failed. ${maxStrikes - strikeCount} attempts remaining.`);
}
```

**Step 4: Test**
```bash
# Simulate 5 failed attempts
POST /api/payment/digital-attempt
{ "status": "FAILED" }  # Send 5 times
# Verify: After 5 failures, isCashLocked = true
```

---

## Important Functions

### Backend Core Functions

**Code Generation:**
```typescript
generateSecureVerificationCode()
  → { raw: "48291057", formatted: "4829 1057" }
```

**Checksum Computation:**
```typescript
computeSecurityChecksum(code, jobId, amount)
  → "SEC-A1B2-C3D4"
```

**Job Submission:**
```typescript
AutoPrintService.submitJob(request: PrintJobRequest)
  → PrintJobResponse with verification code
```

**Code Lookup:**
```typescript
VerificationService.lookupByCode(code: string)
  → CollectionVerificationRecord
```

**Payment Processing:**
```typescript
VerificationService.processDigitalPaymentAttempt(code, attempt)
  → { record, strikeLockoutTriggered }
```

**Handover Confirmation:**
```typescript
VerificationService.confirmHandover(code, staffId)
  → Updated CollectionVerificationRecord
```

### Frontend Core Functions

**Update Specs:**
```typescript
updateSpecs(partial: Partial<PrintSpecifications>)
  → Recalculates pricing automatically
```

**Initiate Payment:**
```typescript
initiatePayment(method: PaymentMethod, upiApp?: UpiAppId)
  → Calls POST /api/jobs
  → Stores verification code in state
```

**Complete Payment:**
```typescript
completePayment()
  → Moves to thank you step
  → Displays verification code
```

**Parse Page Range:**
```typescript
parseCustomPageRange(rangeStr, totalPages)
  → { valid, pages: number[] }
  → Example: "1-3, 5, 7-9" → [1,2,3,5,7,8,9]
```

---

## Important API Endpoints

See AUTOPRINT_ARCHITECTURE.md Section 5 for complete endpoint reference.

**Quick Reference:**
```
POST   /api/jobs                         → Submit job, get code
GET    /api/jobs                         → List all jobs
GET    /api/jobs/:id                     → Get single job
GET    /api/verification/lookup/:code    → Staff lookup
POST   /api/verification/collect-cash    → Record cash
POST   /api/verification/handover        → Confirm handover
POST   /api/payment/digital-attempt      → Record payment
GET    /api/verification/audit-logs      → Audit trail
```

---

## Important Files

**Backend Entry:**
- `backend/src/server.ts` - Start here to understand routing

**Business Logic:**
- `backend/src/services/autoprintService.ts` - Job management
- `backend/src/services/verificationService.ts` - Verification & 3-strike logic
- `backend/src/utils/crypto.ts` - Code generation

**Frontend Entry:**
- `customer-web/src/App.tsx` - Customer kiosk root
- `merchant-desktop/src/App.tsx` - Staff desktop root
- `customer-web/src/context/PrintJobContext.tsx` - State management

**Configuration:**
- `backend/src/config/environment.ts` - Backend config
- `.env` - Environment variables

**Types:**
- `backend/src/types/index.ts` - All TypeScript interfaces

---

## Summary

AutoPrint is a complete system with three interconnected parts:

1. **Backend API** (Express) - Manages jobs, codes, payments, and auditing
2. **Customer Kiosk** (React web) - Customer submission and payment
3. **Merchant Desktop** (Electron) - Staff verification and handover

**Key Design Principles:**
- ✅ Local-only operation (no internet required)
- ✅ Fail-safe 3-strike lockout system
- ✅ Complete audit trail
- ✅ Secure code generation
- ✅ Simple HTTP REST API
- ✅ Stateless backend (easy to scale)

**For Development:**
- Start backend: `npm run dev` in `backend/`
- Start customer kiosk: `npm run dev` in `customer-web/`
- Start merchant desktop: `npm run dev` in `merchant-desktop/`
- Test API: `curl http://localhost:5000/health`

**For Production:**
- Implement persistent database
- Add file storage layer
- Integrate actual printer drivers
- Configure Windows/network deployment
- Add monitoring and logging

---

## Next Steps

1. **Read the Architecture Doc** - Understand complete system design
2. **Trace a Feature** - Follow code from UI to database
3. **Set Up Development** - Run all three components locally
4. **Read the Code** - Comments explain WHY, not just WHAT
5. **Modify a Feature** - Change 3-strike limit or add SMS
6. **Deploy to Production** - Implement persistence and printer integration

Happy coding! 🎉
