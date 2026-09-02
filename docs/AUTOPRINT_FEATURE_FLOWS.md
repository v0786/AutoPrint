# AutoPrint Feature Flows - Complete Traces

This document traces complete real-world workflows through the entire AutoPrint system, showing exactly which files and functions are involved at each step.

---

## Flow 1: Application Startup

### What Happens: System initializes and becomes ready to accept print jobs

```
USER ACTION: System administrator starts all three components

┌─────────────────────────────────────────────────────────────┐
│ FLOW: Backend Service Initialization                        │
└─────────────────────────────────────────────────────────────┘

Terminal: cd backend && npm run dev

FILE: backend/src/server.ts
  ↓
  import express from 'express'
  const app = express()
  
  FUNCTION: (module execution)
  ├─ Load environment config
  │   FILE: backend/src/config/environment.ts
  │   FUNCTION: CONFIG object initialization
  │   └─ Read PORT, MERCHANT_PORT, CUSTOMER_PORT from .env
  │
  ├─ Import middleware
  │   FILE: backend/src/middleware/errorHandler.ts
  │   ├─ requestLogger (log HTTP requests)
  │   └─ errorHandler (catch and format errors)
  │
  ├─ Import controllers
  │   ├─ FILE: backend/src/controllers/jobController.ts
  │   ├─ FILE: backend/src/controllers/verificationController.ts
  │   └─ FILE: backend/src/controllers/paymentController.ts
  │
  ├─ Register routes
  │   app.get('/health', ...)
  │   app.post('/api/jobs', JobController.submitJob)
  │   app.get('/api/verification/lookup/:code', ...)
  │   app.post('/api/payment/digital-attempt', ...)
  │   [... and more ...]
  │
  ├─ Initialize database
  │   FILE: backend/src/database/db.ts
  │   FUNCTION: new InMemoryDatabase()
  │   └─ Create empty Maps: jobs, verificationRecords
  │
  └─ Listen on port
      app.listen(CONFIG.PORT, () => {
        console.log(`API listening on ${CONFIG.PORT}`)
      })

Result: Express server running on http://localhost:5000
Status: ✅ Ready to accept API requests


┌─────────────────────────────────────────────────────────────┐
│ FLOW: Customer Kiosk Initialization                         │
└─────────────────────────────────────────────────────────────┘

Terminal: cd customer-web && npm run dev

FILE: customer-web/src/main.tsx
  ↓
  FILE: customer-web/src/App.tsx
  FUNCTION: App() React component
  ├─ Render PrintJobProvider wrapper
  │   FILE: customer-web/src/context/PrintJobContext.tsx
  │   FUNCTION: PrintJobProvider component
  │   └─ Initialize context state:
  │       currentStep = 'splash'
  │       uploadedFile = null
  │       specs = DEFAULT_SPECS
  │       pricing = calculated
  │       paymentDetails = DEFAULT_PAYMENT
  │       isShopModalOpen = false
  │       isQrModalOpen = false
  │       isPreviewModalOpen = false
  │
  └─ Render MainKioskView
      FUNCTION: MainKioskView()
      ├─ Get currentStep from context
      ├─ If currentStep === 'splash':
      │   FILE: customer-web/src/components/SplashScreen.tsx
      │   ↓ Display: "Welcome to AutoPrint"
      │   Render splash screen with "Start" button
      │
      └─ Render Header, StepIndicator, Footer
          FILE: customer-web/src/components/Header.tsx
          FILE: customer-web/src/components/StepIndicator.tsx

Result: React app running on http://localhost:8085
Display: Splash screen with "Start" button
Status: ✅ Ready for customer interaction


┌─────────────────────────────────────────────────────────────┐
│ FLOW: Merchant Desktop Initialization                       │
└─────────────────────────────────────────────────────────────┘

Terminal: cd merchant-desktop && npm run dev

FILE: merchant-desktop/electron/main.ts
  ↓
  FUNCTION: Electron main process setup
  ├─ Create main window (BrowserWindow)
  │   width: 1400, height: 900
  │   Load: http://localhost:5000 (Vite dev server)
  │
  └─ IPC listeners (Electron ↔ React communication)

FILE: merchant-desktop/src/main.tsx
  ↓
  FILE: merchant-desktop/src/App.tsx
  FUNCTION: App() React component
  ├─ Check if onboarding completed
  │   FILE: merchant-desktop/src/services/localPersistenceService.ts
  │   FUNCTION: isOnboardingCompleted()
  │   └─ Read from localStorage
  │
  ├─ Initialize state
  │   const [currentView, setCurrentView] = useState('queue')
  │   const [printers, setPrinters] = useState([])
  │   const [jobs, setJobs] = useState([])
  │   const [metrics, setMetrics] = useState({...})
  │
  ├─ Fetch initial data
  │   FUNCTION: refreshData() (useCallback)
  │   ├─ Fetch printers: spoolerService.getPrinters()
  │   ├─ Fetch jobs: spoolerService.getJobs()
  │   ├─ Fetch logs: spoolerService.getLogs()
  │   └─ Fetch metrics: spoolerService.getMetrics()
  │
  ├─ If onboarding needed:
  │   FILE: merchant-desktop/src/components/onboarding/OnboardingWizard.tsx
  │   Display: Setup wizard
  │
  └─ If onboarding done:
      Display: Active Queue view
      FILE: merchant-desktop/src/components/ActiveQueueView.tsx

Result: Electron app running
Display: Queue view or onboarding wizard
Status: ✅ Ready for staff interaction

==========================================================
SUMMARY - Application Ready State
==========================================================

✅ Backend API:        http://localhost:5000
   ├─ Health check:    GET /health
   ├─ Routes ready:    /api/jobs, /api/verification, /api/payment
   └─ Database:        Empty in-memory Maps

✅ Customer Kiosk:     http://localhost:8085
   ├─ Display:        Splash screen
   ├─ State:          PrintJobContext initialized
   └─ Ready for:      File upload

✅ Merchant Desktop:   Electron window
   ├─ Display:        Active queue or onboarding
   ├─ Services:       Connected to backend API
   └─ Ready for:      Code verification

NEXT STEP: Customer clicks "Start" on splash screen
```

---

## Flow 2: Customer Submits Print Job

### What Happens: Customer uploads file, selects print options, and submits job with payment

```
USER ACTION: Customer clicks "Start" on splash screen

┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Upload & Specifications                            │
└─────────────────────────────────────────────────────────────┘

FILE: customer-web/src/components/SplashScreen.tsx
  ↓
  USER CLICKS "Start"
  ├─ Call: setStep('specs')
  │   FILE: customer-web/src/context/PrintJobContext.tsx
  │   FUNCTION: setStep('specs')
  │   └─ Update context state: currentStep = 'specs'
  │
  └─ Navigate to UploadAndSpecsStep

FILE: customer-web/src/components/UploadAndSpecsStep.tsx
  FUNCTION: UploadAndSpecsStep()
  ├─ Render file upload area (drag-drop or click)
  ├─ Render sample docs (Semester_Assignment.pdf, Resume.docx, etc.)
  └─ Render print options:
      ├─ Color mode: B&W / Color
      ├─ Paper size: A4 / A3 / Letter
      ├─ Copies: 1-999
      ├─ Page range: All / Custom
      └─ Finishing: None / Staple / Laminate

USER UPLOADS FILE
  (or selects sample document)

FILE INPUT HANDLER
  FUNCTION: handleFile(file: File)
  ├─ Validate file
  ├─ Simulate page count: Math.round(file.size / 150000)
  ├─ Create UploadedFileDetails:
  │   {
  │     name: "resume.pdf",
  │     size: 450000,
  │     type: "application/pdf",
  │     totalPages: 3,
  │     uploadTimestamp: Date.now()
  │   }
  │
  └─ Call: setUploadedFile(details)
      FILE: customer-web/src/context/PrintJobContext.tsx
      FUNCTION: setUploadedFile(file)
      ├─ Update context: uploadedFile = file
      ├─ Reset specs: pageRangeType = 'all'
      ├─ Call: calculatePricing()
      │   FILE: customer-web/src/utils/pricing.ts
      │   FUNCTION: calculatePricing(shop, specs, file.totalPages)
      │   ├─ Calculate rate per page based on shop.rates
      │   ├─ Calculate effective sheets (based on duplex)
      │   ├─ Calculate page total cost
      │   ├─ Apply paper size surcharge
      │   ├─ Add finishing cost
      │   ├─ Calculate GST (18%)
      │   └─ Return: PriceBreakdown
      │       {
      │         ratePerPage: 2.00,
      │         effectiveSheets: 3,
      │         pageTotalCost: 6.00,
      │         paperSizeSurcharge: 0,
      │         finishingCost: 0,
      │         subtotal: 6.00,
      │         gstAmount: 1.08,
      │         totalAmount: 7.08
      │       }
      │
      └─ Update context: pricing = calculated

DISPLAY FILE DETAILS
  Show:
  ├─ File name: "resume.pdf"
  ├─ Size: "450 KB"
  ├─ Total pages: "3"
  └─ Price breakdown with total amount

USER ADJUSTS PRINT SPECS
  (e.g., change color mode, copies)

SPEC UPDATE HANDLER
  FUNCTION: updateSpecs(partial: Partial<PrintSpecifications>)
  ├─ Update context: specs[key] = value
  ├─ Call: calculatePricing() again
  └─ Display updated price

USER CLICKS "Continue to Payment"
  ├─ Validate file is selected
  ├─ Call: setStep('payment')
  └─ Navigate to PaymentStep

==========================================================
END OF STEP 1: Upload & Specifications Complete
==========================================================
```

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Payment Selection                                  │
└─────────────────────────────────────────────────────────────┘

FILE: customer-web/src/components/PaymentStep.tsx
  FUNCTION: PaymentStep()
  ├─ Display payment method options:
  │   ├─ UPI (default)
  │   │   ├─ Show QR code
  │   │   ├─ Display shop UPI VPA
  │   │   ├─ Show 3-minute countdown timer
  │   │   ├─ Display UPI app options:
  │   │   │   (Google Pay, PhonePe, Paytm, CRED, BHIM, Generic)
  │   │   └─ "Scan or copy to pay" instruction
  │   │
  │   └─ Cash payment
  │       └─ "Pay at counter" instruction
  │
  ├─ Display order summary
  │   ├─ File: "resume.pdf"
  │   ├─ Specifications: "3 pages, B&W, A4"
  │   ├─ Total amount: "₹7.08"
  │   └─ Shop info
  │
  └─ Buttons:
      ├─ "Edit Specs" (go back to step 1)
      └─ "Proceed with [UPI/Cash]" (submit payment)

USER SELECTS PAYMENT METHOD
  (UPI or Cash)

USER CLICKS "Proceed"
  ├─ Call: initiatePayment(selectedMethod, upiApp?)
  │   FILE: customer-web/src/context/PrintJobContext.tsx
  │   FUNCTION: initiatePayment(method, upiApp)
  │   └─ Update context:
  │       paymentDetails = {
  │         method: "upi" | "cash",
  │         upiApp: "gpay" | "phonepe" | ...
  │         paymentVerified: false
  │       }
  │
  ├─ Show confirmation modal
  │   FUNCTION: setShowConfirmModal(true)
  │   Display: Order details + payment method
  │   Buttons: "Cancel" or "Confirm Payment"
  │
  └─ USER CLICKS "Confirm Payment"
      ├─ Set isProcessing = true
      ├─ Simulate payment gateway delay (1.2 seconds)
      ├─ Call: completePayment()
      │   FUNCTION: completePayment()
      │   ├─ Call API: POST /api/jobs with order details
      │   │   (See detailed trace below)
      │   │
      │   ├─ Receive response with verification code
      │   ├─ Store in context: currentOrder = response.data
      │   └─ Update context: currentStep = 'thankyou'
      │
      └─ Navigate to ThankYouStep

==========================================================
END OF STEP 2: Payment Selection Complete
==========================================================
```

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Backend Processing (POST /api/jobs)               │
└─────────────────────────────────────────────────────────────┘

FRONTEND SENDS REQUEST

FILE: customer-web/src/context/PrintJobContext.tsx
  FUNCTION: completePayment()
  ├─ Build request body:
  │   {
  │     fileName: "resume.pdf",
  │     mimeType: "application/pdf",
  │     customerName: context.currentShop?.name || "Walk-In",
  │     customerPhone: context.currentShop?.upiDetails?.vpa,
  │     printerName: "Default AutoPrint Thermal/Laser Printer",
  │     specs: {
  │       colorMode: "bw",
  │       copies: 1,
  │       paperSize: "a4",
  │       duplex: "single"
  │     },
  │     paymentMethod: "UPI" | "CASH",
  │     amountTotal: 7.08,
  │     rawContentHtml: "<h1>Resume</h1>..." (optional)
  │   }
  │
  └─ fetch('http://localhost:5000/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })

BACKEND RECEIVES REQUEST

FILE: backend/src/server.ts
  ├─ Route: app.post('/api/jobs', JobController.submitJob)
  └─ Pass request to JobController

FILE: backend/src/controllers/jobController.ts
  FUNCTION: JobController.submitJob(req, res, next)
  ├─ Extract body: req.body
  ├─ Call: AutoPrintService.submitJob(req.body)
  │   (detailed trace below)
  │
  ├─ Catch errors in next(err)
  │   FILE: backend/src/middleware/errorHandler.ts
  │   └─ Format error response
  │
  └─ Send response to frontend:
      {
        ok: true,
        message: "Print job successfully queued with verification code",
        data: { ...job with verification code... }
      }

BACKEND SERVICE: AUTO PRINT SERVICE

FILE: backend/src/services/autoprintService.ts
  FUNCTION: AutoPrintService.submitJob(request: PrintJobRequest)
  ├─ Validate request
  │   if (!request.fileName || request.amountTotal <= 0) {
  │     throw new Error('Invalid print job submission payload.')
  │   }
  │
  ├─ Generate jobId: "QRT-" + random 4-digit
  │   Example: "QRT-5678"
  │
  ├─ Generate jobNo: "#" + random 4-digit
  │   Example: "#1234"
  │
  ├─ Create title:
  │   "resume.pdf (1 copies, bw)"
  │
  ├─ Get created timestamp
  │
  ├─ Call: VerificationService.createVerificationRecord(jobId, jobNo, request)
  │   FILE: backend/src/services/verificationService.ts
  │   (detailed trace below)
  │
  ├─ Create job record:
  │   {
  │     id: "QRT-5678",
  │     jobNo: "#1234",
  │     title: "resume.pdf (1 copies, bw)",
  │     customerName: "Walk-In Customer",
  │     printerName: "Default AutoPrint Thermal/Laser Printer",
  │     status: "queued",
  │     verification: { ...verification record... },
  │     createdAt: "2026-09-02T10:00:00Z"
  │   }
  │
  ├─ Store in database:
  │   db.jobs.set("QRT-5678", job)
  │
  └─ Return job record to controller

BACKEND SERVICE: VERIFICATION SERVICE

FILE: backend/src/services/verificationService.ts
  FUNCTION: VerificationService.createVerificationRecord(jobId, jobNo, request)
  ├─ Generate 8-digit verification code
  │   FILE: backend/src/utils/crypto.ts
  │   FUNCTION: generateSecureVerificationCode()
  │   ├─ Use crypto.randomBytes(4)
  │   ├─ Apply rejection sampling
  │   ├─ Map to range [10000000, 99999999]
  │   └─ Return:
  │       {
  │         raw: "48291057",
  │         formatted: "4829 1057"
  │       }
  │
  ├─ Generate security checksum
  │   FILE: backend/src/utils/crypto.ts
  │   FUNCTION: computeSecurityChecksum(code, jobId, amount)
  │   ├─ Create payload: "48291057:QRT-5678:7.08:AP_VERIFY_..."
  │   ├─ Hash with SHA-256
  │   ├─ Extract 8 chars: "A1B2C3D4"
  │   └─ Return: "SEC-A1B2-C3D4"
  │
  ├─ Determine initial payment status
  │   if (request.paymentMethod === 'CASH') {
  │     initialStatus = 'CASH_REQUIRED'
  │   } else {
  │     initialStatus = 'PENDING'
  │   }
  │
  ├─ Create verification record:
  │   {
  │     verificationCode: "48291057",
  │     formattedCode: "4829 1057",
  │     jobId: "QRT-5678",
  │     jobNo: "#1234",
  │     jobTitle: "resume.pdf",
  │     printerName: "Default AutoPrint...",
  │     customerName: "Walk-In Customer",
  │     amountTotal: 7.08,
  │     failedDigitalAttemptsCount: 0,
  │     maxDigitalAttemptsAllowed: 3,
  │     isCashLocked: false,
  │     paymentStatus: "PENDING" | "CASH_REQUIRED",
  │     paymentAttempts: [],
  │     handoverStatus: "PENDING_PRINT",
  │     securityChecksum: "SEC-A1B2-C3D4",
  │     createdAt: "2026-09-02T10:00:00Z",
  │     updatedAt: "2026-09-02T10:00:00Z"
  │   }
  │
  ├─ Store in database:
  │   db.verificationRecords.set("48291057", record)
  │
  ├─ Log: CODE_GENERATED event
  │   FILE: backend/src/utils/auditLogger.ts
  │   FUNCTION: auditLogger.logEvent({
  │     verificationCode: "48291057",
  │     jobId: "QRT-5678",
  │     jobNo: "#1234",
  │     action: "CODE_GENERATED",
  │     actor: "SYSTEM_AUTOPRINT",
  │     details: {
  │       amountTotal: 7.08,
  │       customerName: "Walk-In Customer",
  │       paymentStatus: "PENDING",
  │       securityChecksum: "SEC-A1B2-C3D4"
  │     }
  │   })
  │   └─ Add to auditLogger.auditLogs array
  │
  ├─ Embed watermark on document
  │   FILE: backend/src/services/pdfOverlayService.ts
  │   FUNCTION: PdfOverlayService.embedVerificationCodeOnFinalPage(
  │     rawHtml, "48291057", "4829 1057", "SEC-A1B2-C3D4"
  │   )
  │   ├─ Create footer HTML div
  │   │   <div class="autoprint-final-page-footer">
  │   │     <div>VERIFICATION CODE: <span>4829 1057</span></div>
  │   │     <div>AUTOPRINT VERIFICATION STAMP...</div>
  │   │     <div>CHECKSUM: SEC-A1B2-C3D4</div>
  │   │     <div>TIMESTAMP: ...</div>
  │   │   </div>
  │   │
  │   ├─ Append to HTML
  │   └─ Return modified HTML
  │
  ├─ Log: DOCUMENT_EMBEDDED event
  │   FILE: backend/src/utils/auditLogger.ts
  │   FUNCTION: auditLogger.logEvent({
  │     ...
  │     action: "DOCUMENT_EMBEDDED",
  │     ...
  │   })
  │
  └─ Return verification record to AutoPrintService

BACKEND RESPONSE

FILE: backend/src/controllers/jobController.ts
  ├─ Receive job record from AutoPrintService
  ├─ Format response:
  │   {
  │     ok: true,
  │     message: "Print job successfully queued with verification code.",
  │     data: {
  │       id: "QRT-5678",
  │       jobNo: "#1234",
  │       title: "resume.pdf (1 copies, bw)",
  │       customerName: "Walk-In Customer",
  │       printerName: "Default AutoPrint Thermal/Laser Printer",
  │       status: "queued",
  │       verification: {
  │         verificationCode: "48291057",
  │         formattedCode: "4829 1057",
  │         paymentStatus: "PENDING",
  │         securityChecksum: "SEC-A1B2-C3D4",
  │         ...
  │       },
  │       createdAt: "2026-09-02T10:00:00Z"
  │     }
  │   }
  │
  └─ Send response (HTTP 201 Created)

==========================================================
END OF STEP 3: Backend Processing Complete
==========================================================
```

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Thank You Screen & Code Display                    │
└─────────────────────────────────────────────────────────────┘

FRONTEND RECEIVES RESPONSE

FILE: customer-web/src/context/PrintJobContext.tsx
  FUNCTION: completePayment() [continued]
  ├─ Receive API response
  ├─ Extract verification code from response.data.verification
  ├─ Store in context:
  │   currentOrder = response.data
  │   jobStatus = 'queued'
  │
  └─ Update step:
      currentStep = 'thankyou'

FILE: customer-web/src/components/ThankYouStep.tsx
  FUNCTION: ThankYouStep()
  ├─ Get context: currentOrder
  ├─ Display:
  │   ┌────────────────────────────────────┐
  │   │ ✓ PRINT ORDER SUBMITTED            │
  │   │                                    │
  │   │ VERIFICATION CODE:                 │
  │   │ ┌──────────────────────────────┐   │
  │   │ │  4829 1057                   │   │
  │   │ └──────────────────────────────┘   │
  │   │                                    │
  │   │ Job #1234                         │
  │   │ Amount: ₹7.08                     │
  │   │                                    │
  │   │ → Take this code to the counter   │
  │   │ → Your prints are queued          │
  │   │ → Staff will verify your code     │
  │   │ → Collect your prints             │
  │   │                                    │
  │   │ [New Print Job]  [Return Home]    │
  │   └────────────────────────────────────┘
  │
  ├─ Auto-reset after timeout
  │   setTimeout(() => {
  │     setStep('splash')
  │     resetJob()
  │   }, 30000)  // 30 seconds
  │
  └─ Handle user actions
      ├─ "New Print Job" → resetJob() → setStep('splash')
      └─ "Return Home" → resetJob() → setStep('splash')

==========================================================
CUSTOMER WORKFLOW COMPLETE
==========================================================

Customer now has:
  • Printed document with verification code & checksum footer
  • Display showing: "VERIFICATION CODE: 4829 1057"
  • Instructions: Take to counter
  
Database state:
  ✅ db.jobs["QRT-5678"] = complete job record
  ✅ db.verificationRecords["48291057"] = complete verification record
  ✅ auditLogger has 2 entries: CODE_GENERATED, DOCUMENT_EMBEDDED
  
Next step: Customer walks to staff counter with printed document
```

---

## Flow 3: Staff Verifies Code & Confirms Handover

### What Happens: Staff enters verification code, checks payment status, collects cash if needed, confirms handover

```
USER ACTION: Customer arrives at staff counter with printed document showing code "4829 1057"

┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Staff Looks Up Code                                │
└─────────────────────────────────────────────────────────────┘

FILE: merchant-desktop/src/components/StaffVerificationView.tsx
  FUNCTION: StaffVerificationView()
  ├─ Display staff verification interface
  │   ┌──────────────────────────────┐
  │   │ STAFF VERIFICATION SYSTEM    │
  │   │                              │
  │   │ Enter Code: [4829 1057    ]  │
  │   │ [                      Search]│
  │   │                              │
  │   │ Active Tray (5 jobs pending) │
  │   │ ├─ Job #1234 - ₹7.08        │
  │   │ ├─ Job #5678 - ₹50.00       │
  │   │ └─ ...                       │
  │   └──────────────────────────────┘
  │
  ├─ Handle code input
  │   FUNCTION: handleCodeInput(event)
  │   ├─ Format code: "4829 1057" → auto-add space after 4th digit
  │   └─ Update codeInput state
  │
  └─ STAFF CLICKS "Search" or presses Enter
      FUNCTION: handleLookup()
      ├─ Get code from input: "4829 1057"
      ├─ Sanitize: remove spaces/dashes → "48291057"
      ├─ Call: verificationService.lookupByCode("48291057")
      │   (detailed trace below)
      │
      └─ Update state with response
          setActiveRecord = response

STAFF SERVICE: VERIFICATION LOOKUP

FILE: merchant-desktop/src/services/verificationService.ts
  FUNCTION: lookupByCode(code: string)
  ├─ Send HTTP request:
  │   GET http://localhost:5000/api/verification/lookup/48291057
  │
  └─ Return response

BACKEND ROUTE HANDLER

FILE: backend/src/controllers/verificationController.ts
  FUNCTION: VerificationController.lookupByCode(req, res, next)
  ├─ Extract code from req.params.code
  ├─ Extract staffId from req.query.staffId (optional)
  ├─ Call: VerificationService.lookupByCode(code, staffId)
  │   FILE: backend/src/services/verificationService.ts
  │   (detailed trace below)
  │
  ├─ Catch errors
  └─ Return response

BACKEND SERVICE: CODE LOOKUP

FILE: backend/src/services/verificationService.ts
  FUNCTION: VerificationService.lookupByCode(code, staffId)
  ├─ Validate code provided
  │   if (!code) throw new Error('Code required')
  │
  ├─ Sanitize code: remove spaces/dashes → "48291057"
  │
  ├─ Validate format: exactly 8 digits
  │   if (!/^\d{8}$/.test(sanitized)) {
  │     throw new Error('Invalid format')
  │   }
  │
  ├─ Lookup in database
  │   const record = db.verificationRecords.get("48291057")
  │
  ├─ If not found:
  │   throw new Error('No job found for code: 48291057')
  │
  ├─ Log: STAFF_LOOKUP_INITIATED event
  │   FILE: backend/src/utils/auditLogger.ts
  │   FUNCTION: auditLogger.logEvent({
  │     verificationCode: "48291057",
  │     jobId: "QRT-5678",
  │     jobNo: "#1234",
  │     action: "STAFF_LOOKUP_INITIATED",
  │     actor: "STAFF_TERMINAL",
  │     staffId: "STAFF-DESK-01",
  │     details: {
  │       currentPaymentStatus: "PENDING",
  │       isCashLocked: false,
  │       handoverStatus: "PENDING_PRINT"
  │     }
  │   })
  │
  └─ Return record to controller

BACKEND RESPONSE

FILE: backend/src/controllers/verificationController.ts
  ├─ Format response:
  │   {
  │     ok: true,
  │     data: {
  │       verificationCode: "48291057",
  │       formattedCode: "4829 1057",
  │       jobId: "QRT-5678",
  │       jobNo: "#1234",
  │       jobTitle: "resume.pdf",
  │       customerName: "Walk-In Customer",
  │       amountTotal: 7.08,
  │       paymentStatus: "PENDING",
  │       failedDigitalAttemptsCount: 0,
  │       isCashLocked: false,
  │       handoverStatus: "PENDING_PRINT",
  │       securityChecksum: "SEC-A1B2-C3D4",
  │       ...
  │     }
  │   }
  │
  └─ Send response (HTTP 200 OK)

==========================================================
END OF STEP 1: Staff Code Lookup Complete
==========================================================
```

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Display Job Details & Payment Status               │
└─────────────────────────────────────────────────────────────┘

FRONTEND RECEIVES RESPONSE

FILE: merchant-desktop/src/components/StaffVerificationView.tsx
  FUNCTION: handleLookup() [continued]
  ├─ Receive response from backend
  ├─ Update state:
  │   setActiveRecord = response.data
  │
  └─ Display job details:
      ┌──────────────────────────────────────────────┐
      │ JOB FOUND: #1234                             │
      │                                              │
      │ Customer: Walk-In Customer                   │
      │ Document: resume.pdf                         │
      │ Amount: ₹7.08                                │
      │ Code: 4829 1057                              │
      │ Checksum: SEC-A1B2-C3D4                      │
      │                                              │
      │ PAYMENT STATUS: [Depends on paymentStatus]   │
      │                                              │
      │ ┌─ If PENDING:                               │
      │ │  Yellow banner: "PAYMENT PENDING"          │
      │ │  Button: "Mark as Paid" or wait            │
      │ │                                            │
      │ ├─ If UPI_SUCCESS:                           │
      │ │  Green banner: ✓ PAYMENT VERIFIED (UPI)    │
      │ │  Button: "Confirm Handover"                │
      │ │                                            │
      │ ├─ If CASH_REQUIRED:                         │
      │ │  Orange banner: "CASH PAYMENT REQUIRED"    │
      │ │  Button: "Collect Cash"                    │
      │ │                                            │
      │ └─ If CASH_LOCKED:                           │
      │    Red banner: "🔒 CASH ONLY (3 STRIKES)"    │
      │    Button: "Collect Cash"                    │
      │                                              │
      │ [Collect Cash]  [Confirm Handover]           │
      │ [View Receipt]  [View Audit Log]             │
      └──────────────────────────────────────────────┘

DISPLAY LOGIC (PAYMENT STATUS HANDLING)

FILE: merchant-desktop/src/components/StaffVerificationView.tsx
  FUNCTION: Render payment status banner
  ├─ Switch on activeRecord.paymentStatus:
  │
  │  case 'PENDING':
  │  ├─ Show: "Payment not yet verified"
  │  ├─ Color: Yellow/orange
  │  └─ Action: Wait for customer to complete payment
  │
  │  case 'UPI_SUCCESS':
  │  ├─ Show: "✓ PAYMENT VERIFIED (UPI)"
  │  ├─ Color: Green
  │  ├─ Show transaction ID (if available)
  │  └─ Enable: "Confirm Handover" button
  │
  │  case 'CASH_REQUIRED':
  │  ├─ Show: "💰 CASH PAYMENT REQUIRED"
  │  ├─ Color: Orange
  │  ├─ Show amount due: "₹7.08"
  │  └─ Enable: "Collect Cash" button
  │
  │  case 'CASH_LOCKED':
  │  ├─ Show: "🔒 CASH ONLY (3 STRIKES)"
  │  ├─ Color: Red
  │  ├─ Show: "Digital payment failed 3 times"
  │  ├─ Show amount due: "₹7.08"
  │  └─ Enable: "Collect Cash" button (REQUIRED)
  │
  │  case 'CASH_COLLECTED':
  │  ├─ Show: "✓ CASH COLLECTED"
  │  ├─ Color: Green
  │  ├─ Show tendered amount & change
  │  └─ Enable: "Confirm Handover" button
  │
  └─ End switch

==========================================================
PAYMENT STATUS SCENARIOS
==========================================================

Scenario A: Customer paid via UPI (most common)
  ├─ paymentStatus = "UPI_SUCCESS"
  ├─ Display: Green "✓ PAYMENT VERIFIED" banner
  ├─ Staff action: Click "Confirm Handover"
  └─ Prints handed over immediately

Scenario B: Customer chose cash payment
  ├─ paymentStatus = "CASH_REQUIRED"
  ├─ Display: Orange "💰 CASH REQUIRED" banner
  ├─ Staff action: Click "Collect Cash" → Cash dialog
  │   ├─ Enter tendered amount
  │   ├─ System calculates change
  │   ├─ POST /api/verification/collect-cash
  │   └─ paymentStatus → "CASH_COLLECTED"
  │
  └─ Then: Click "Confirm Handover"

Scenario C: Customer failed UPI 3 times (3-strike lockout)
  ├─ paymentStatus = "CASH_LOCKED"
  ├─ isCashLocked = true
  ├─ Display: Red "🔒 CASH ONLY" banner
  ├─ Disable all UPI options (visually)
  ├─ Staff action: Click "Collect Cash" → Cash dialog
  │   └─ Same process as Scenario B
  │
  └─ Then: Click "Confirm Handover"

==========================================================
END OF STEP 2: Payment Status Display Complete
==========================================================
```

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Collect Cash (if needed)                           │
└─────────────────────────────────────────────────────────────┘

CONDITION: paymentStatus is CASH_REQUIRED or CASH_LOCKED

STAFF CLICKS "Collect Cash"
  ├─ FUNCTION: handleOpenCashModal()
  └─ Display cash collection dialog:
      ┌─────────────────────────────────────┐
      │ CASH COLLECTION                     │
      │                                     │
      │ Amount Due: ₹7.08                   │
      │                                     │
      │ Tendered: [_________]               │
      │           [Clear]                   │
      │                                     │
      │ Quick buttons:                      │
      │ [₹10] [₹20] [₹50] [₹100]           │
      │ [₹200] [₹500] [₹2000]              │
      │                                     │
      │ Change Due: ₹2.92 (calculated)      │
      │                                     │
      │ [Cancel]  [Confirm Payment]         │
      └─────────────────────────────────────┘

STAFF ENTERS CASH AMOUNT
  (via keyboard or quick buttons)

FILE: merchant-desktop/src/components/StaffVerificationView.tsx
  FUNCTION: handleCashInput(amount)
  ├─ Set tenderedAmountStr = amount
  ├─ Calculate change:
  │   changeDue = parseInt(amount) - activeRecord.amountTotal
  │
  └─ Display:
      Amount Due: ₹7.08
      Tendered: ₹10
      Change Due: ₹2.92

STAFF CLICKS "Confirm Payment"
  ├─ Validate input:
  │   if (!tenderedAmount || tenderedAmount < amountTotal) {
  │     Show error: "Tendered amount must be >= ₹7.08"
  │     return
  │   }
  │
  ├─ Set isProcessing = true
  ├─ Call: verificationService.collectCash()
  │   FILE: merchant-desktop/src/services/verificationService.ts
  │   FUNCTION: collectCash(verificationCode, tenderedAmount, staffId)
  │   ├─ Send HTTP request:
  │   │   POST /api/verification/collect-cash
  │   │   Body: {
  │   │     verificationCode: "48291057",
  │   │     tenderedAmount: 10,
  │   │     staffId: "STAFF-DESK-01",
  │   │     staffName: "Ram"
  │   │   }
  │   │
  │   └─ Return response
  │
  └─ Handle response

BACKEND ROUTE HANDLER

FILE: backend/src/controllers/verificationController.ts
  FUNCTION: VerificationController.processCashCollection(req, res, next)
  ├─ Validate required fields
  │   if (!verificationCode || tenderedAmount === undefined) {
  │     throw Error('Required fields missing')
  │   }
  │
  ├─ Call: VerificationService.processCashCollection(...)
  │   FILE: backend/src/services/verificationService.ts
  │   (detailed trace below)
  │
  └─ Return response

BACKEND SERVICE: CASH COLLECTION

FILE: backend/src/services/verificationService.ts
  FUNCTION: VerificationService.processCashCollection(
    verificationCode, tenderedAmount, staffId, staffName
  )
  ├─ Lookup record by code
  │   const record = db.verificationRecords.get("48291057")
  │
  ├─ Validate payment status
  │   if (record.paymentStatus === 'UPI_SUCCESS') {
  │     throw Error('Already paid via UPI')
  │   }
  │
  │   if (record.paymentStatus !== 'CASH_REQUIRED' &&
  │       record.paymentStatus !== 'CASH_LOCKED') {
  │     throw Error('Invalid state for cash collection')
  │   }
  │
  ├─ Calculate change
  │   changeDue = tenderedAmount - record.amountTotal
  │
  ├─ Update record
  │   record.cashTenderedAmount = tenderedAmount
  │   record.cashChangeDue = changeDue
  │   record.paymentStatus = 'CASH_COLLECTED'
  │   record.verifiedByStaffId = staffId
  │   record.verifiedByStaffName = staffName
  │   record.updatedAt = new Date().toISOString()
  │
  ├─ Log: CASH_COLLECTION_COMPLETED
  │   FILE: backend/src/utils/auditLogger.ts
  │   FUNCTION: auditLogger.logEvent({
  │     verificationCode: "48291057",
  │     jobId: "QRT-5678",
  │     jobNo: "#1234",
  │     action: "CASH_COLLECTION_COMPLETED",
  │     actor: "STAFF_TERMINAL",
  │     staffId: "STAFF-DESK-01",
  │     staffName: "Ram",
  │     details: {
  │       amountTotal: 7.08,
  │       tenderedAmount: 10,
  │       changeDue: 2.92
  │     }
  │   })
  │
  └─ Return updated record

BACKEND RESPONSE

FILE: backend/src/controllers/verificationController.ts
  ├─ Format response:
  │   {
  │     ok: true,
  │     message: "Cash collection completed successfully.",
  │     data: {
  │       verificationCode: "48291057",
  │       paymentStatus: "CASH_COLLECTED",
  │       cashTenderedAmount: 10,
  │       cashChangeDue: 2.92,
  │       verifiedByStaffName: "Ram",
  │       ...
  │     }
  │   }
  │
  └─ Send response (HTTP 200 OK)

FRONTEND RECEIVES RESPONSE

FILE: merchant-desktop/src/components/StaffVerificationView.tsx
  FUNCTION: handleCashConfirm() [continued]
  ├─ Receive response
  ├─ Update state:
  │   setActiveRecord = response.data
  │   setIsCashModalOpen = false
  │   Show success toast: "Cash collected successfully"
  │
  └─ Display updated status:
      Amount Due: ₹7.08
      Tendered: ₹10
      Change Due: ₹2.92
      Status: ✓ CASH COLLECTED
      Staff: Ram
      
      [Confirm Handover]

==========================================================
END OF STEP 3: Cash Collection Complete
==========================================================

Database state after cash collection:
  ✅ activeRecord.paymentStatus = "CASH_COLLECTED"
  ✅ activeRecord.cashTenderedAmount = 10
  ✅ activeRecord.cashChangeDue = 2.92
  ✅ auditLog has new entry: CASH_COLLECTION_COMPLETED
```

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: Confirm Handover                                   │
└─────────────────────────────────────────────────────────────┘

STAFF CLICKS "Confirm Handover"
  ├─ FUNCTION: handleConfirmHandover()
  ├─ Get staffId, staffName from input/state
  ├─ Call: verificationService.confirmHandover(code, staffId, staffName)
  │   FILE: merchant-desktop/src/services/verificationService.ts
  │   FUNCTION: confirmHandover(code, staffId, staffName)
  │   ├─ Send HTTP request:
  │   │   POST /api/verification/handover
  │   │   Body: {
  │   │     verificationCode: "48291057",
  │   │     staffId: "STAFF-DESK-01",
  │   │     staffName: "Ram"
  │   │   }
  │   │
  │   └─ Return response
  │
  └─ Handle response

BACKEND ROUTE HANDLER

FILE: backend/src/controllers/verificationController.ts
  FUNCTION: VerificationController.confirmHandover(req, res, next)
  ├─ Validate verificationCode provided
  ├─ Call: VerificationService.confirmHandover(...)
  │   FILE: backend/src/services/verificationService.ts
  │   (detailed trace below)
  │
  └─ Return response

BACKEND SERVICE: HANDOVER CONFIRMATION

FILE: backend/src/services/verificationService.ts
  FUNCTION: VerificationService.confirmHandover(
    verificationCode, staffId, staffName
  )
  ├─ Lookup record by code
  │   const record = db.verificationRecords.get("48291057")
  │
  ├─ Validate handover status
  │   if (record.handoverStatus === 'COLLECTED') {
  │     throw Error('Already handed over')
  │   }
  │
  ├─ Validate payment is complete
  │   if (record.paymentStatus not in 
  │       ['UPI_SUCCESS', 'CASH_COLLECTED']) {
  │     throw Error('Payment not verified')
  │   }
  │
  ├─ Update record
  │   record.handoverStatus = 'COLLECTED'
  │   record.handoverCompletedAt = new Date().toISOString()
  │   record.verifiedByStaffId = staffId
  │   record.verifiedByStaffName = staffName
  │   record.updatedAt = new Date().toISOString()
  │
  ├─ Log: PRINTS_HANDED_OVER
  │   FILE: backend/src/utils/auditLogger.ts
  │   FUNCTION: auditLogger.logEvent({
  │     verificationCode: "48291057",
  │     jobId: "QRT-5678",
  │     jobNo: "#1234",
  │     action: "PRINTS_HANDED_OVER",
  │     actor: "STAFF_TERMINAL",
  │     staffId: "STAFF-DESK-01",
  │     staffName: "Ram",
  │     details: {
  │       handoverTime: "2026-09-02T10:05:00Z",
  │       paymentStatus: "CASH_COLLECTED",
  │       staffName: "Ram"
  │     }
  │   })
  │
  └─ Return updated record

BACKEND RESPONSE

FILE: backend/src/controllers/verificationController.ts
  ├─ Format response:
  │   {
  │     ok: true,
  │     message: "Document handover confirmed successfully.",
  │     data: {
  │       verificationCode: "48291057",
  │       handoverStatus: "COLLECTED",
  │       handoverCompletedAt: "2026-09-02T10:05:00Z",
  │       verifiedByStaffName: "Ram",
  │       ...
  │     }
  │   }
  │
  └─ Send response (HTTP 200 OK)

FRONTEND RECEIVES RESPONSE

FILE: merchant-desktop/src/components/StaffVerificationView.tsx
  FUNCTION: handleConfirmHandover() [continued]
  ├─ Receive response
  ├─ Update state:
  │   setActiveRecord = response.data
  │   Show success notification/banner
  │       "✓ HANDOVER CONFIRMED"
  │       "Customer received prints"
  │
  ├─ Clear input:
  │   setCodeInput = ''
  │
  ├─ Clear active record:
  │   After 3 seconds:
  │   setActiveRecord = null
  │
  └─ Display updated tray
      Remove completed job from "READY_IN_TRAY" list
      Show next pending job (if any)

==========================================================
STAFF WORKFLOW COMPLETE
==========================================================

Final database state:
  ✅ db.verificationRecords["48291057"].handoverStatus = "COLLECTED"
  ✅ db.verificationRecords["48291057"].paymentStatus = "CASH_COLLECTED"
  ✅ db.verificationRecords["48291057"].cashTenderedAmount = 10
  ✅ db.verificationRecords["48291057"].cashChangeDue = 2.92
  ✅ auditLogger has complete transaction history:
      1. CODE_GENERATED (customer kiosk)
      2. DOCUMENT_EMBEDDED (customer kiosk)
      3. STAFF_LOOKUP_INITIATED (staff desktop)
      4. CASH_COLLECTION_COMPLETED (staff desktop)
      5. PRINTS_HANDED_OVER (staff desktop)

Customer has received prints
Staff transaction complete
```

---

## Flow 4: 3-Strike Fail-Safe (Payment Lockout)

### What Happens: Customer fails UPI payment 3 times, system locks job to cash-only

```
SCENARIO: Customer attempts UPI payment but experiences failures
          (network issues, insufficient funds, bank timeout, etc.)

Attempt 1: Customer initiates UPI payment
  ├─ Frontend: POST /api/payment/digital-attempt
  │   {
  │     verificationCode: "48291057",
  │     status: "FAILED",
  │     errorCode: "INSUFFICIENT_FUNDS",
  │     errorMessage: "Your account has insufficient balance"
  │   }
  │
  └─ Backend processes:
      FILE: backend/src/services/verificationService.ts
      FUNCTION: processDigitalPaymentAttempt()
      ├─ record.failedDigitalAttemptsCount = 0
      ├─ Increment: failedDigitalAttemptsCount = 1
      ├─ Log: DIGITAL_PAYMENT_FAILED
      ├─ Check: count >= 3? NO
      └─ Return to customer:
          {
            strikeLockoutTriggered: false,
            data: {
              failedDigitalAttemptsCount: 1,
              maxDigitalAttemptsAllowed: 3,
              remainingAttempts: 2
            }
          }
      
  Display to customer:
    "❌ Payment Failed (Insufficient Funds)"
    "Attempts remaining: 2 of 3"
    [Retry Payment]


Attempt 2: Customer tries again (different UPI app)
  ├─ Frontend: POST /api/payment/digital-attempt
  │   {
  │     verificationCode: "48291057",
  │     status: "TIMED_OUT",
  │     errorCode: "GATEWAY_TIMEOUT"
  │   }
  │
  └─ Backend processes:
      FUNCTION: processDigitalPaymentAttempt()
      ├─ record.failedDigitalAttemptsCount = 1
      ├─ Increment: failedDigitalAttemptsCount = 2
      ├─ Log: DIGITAL_PAYMENT_FAILED
      ├─ Check: count >= 3? NO
      └─ Return to customer:
          {
            strikeLockoutTriggered: false,
            remainingAttempts: 1
          }
      
  Display to customer:
    "❌ Payment Timed Out (Network Error)"
    "⚠️ LAST ATTEMPT - After this, cash payment only"
    "Attempts remaining: 1 of 3"
    [Retry Payment]


Attempt 3: Customer makes final attempt
  ├─ Frontend: POST /api/payment/digital-attempt
  │   {
  │     verificationCode: "48291057",
  │     status: "FAILED",
  │     errorCode: "INVALID_PIN",
  │     errorMessage: "Incorrect PIN entered"
  │   }
  │
  └─ Backend processes:
      FUNCTION: processDigitalPaymentAttempt()
      ├─ record.failedDigitalAttemptsCount = 2
      ├─ Increment: failedDigitalAttemptsCount = 3
      ├─ Log: DIGITAL_PAYMENT_FAILED
      ├─ Check: count >= 3? ⭐ YES! TRIGGER LOCKOUT
      │
      ├─ Update record:
      │   record.isCashLocked = true
      │   record.paymentStatus = 'CASH_LOCKED'
      │   record.lockoutReason = 'MAX_ATTEMPTS_EXCEEDED'
      │
      ├─ Log: THREE_STRIKE_LOCKOUT_TRIGGERED
      │   FILE: backend/src/utils/auditLogger.ts
      │   FUNCTION: auditLogger.logEvent({
      │     verificationCode: "48291057",
      │     action: "THREE_STRIKE_LOCKOUT_TRIGGERED",
      │     actor: "PAYMENT_GATEWAY",
      │     details: {
      │       failedAttempts: 3,
      │       reason: "MAX_ATTEMPTS_EXCEEDED",
      │       lockedAt: "2026-09-02T10:04:30Z"
      │     }
      │   })
      │
      └─ Return to customer:
          {
            strikeLockoutTriggered: ✓ true,
            message: "Payment locked to cash collection",
            data: {
              isCashLocked: true,
              paymentStatus: "CASH_LOCKED",
              failedAttemptCount: 3
            }
          }

CUSTOMER FRONTEND UPDATE

FILE: customer-web/src/components/PaymentStep.tsx
  ├─ Receive response with strikeLockoutTriggered = true
  ├─ Display lockout message:
  │   ┌──────────────────────────────────────┐
  │   │ 🔒 PAYMENT LOCKED                    │
  │   │                                      │
  │   │ Your payment could not be processed  │
  │   │ after 3 attempts.                    │
  │   │                                      │
  │   │ This job is now CASH-ONLY.           │
  │   │                                      │
  │   │ Please pay at the counter in cash.   │
  │   │ Show this verification code:         │
  │   │                                      │
  │   │     4829 1057                        │
  │   │                                      │
  │   │ Staff will collect payment.          │
  │   │                                      │
  │   │ [Proceed to Thank You Screen]        │
  │   └──────────────────────────────────────┘
  │
  ├─ Disable all UPI options (greyed out)
  ├─ Disable cash payment option too
  │   (customer must go to counter)
  │
  └─ User clicks "Proceed"
      └─ Move to thank you step

CUSTOMER ARRIVES AT COUNTER

FILE: merchant-desktop/src/components/StaffVerificationView.tsx
  FUNCTION: handleLookup()
  ├─ Staff enters code "4829 1057"
  ├─ GET /api/verification/lookup/48291057
  ├─ Receive response:
  │   {
  │     paymentStatus: "CASH_LOCKED",
  │     isCashLocked: true,
  │     failedDigitalAttemptsCount: 3,
  │     ...
  │   }
  │
  └─ Display to staff:
      ┌──────────────────────────────────────┐
      │ JOB #1234                            │
      │                                      │
      │ 🔒 PAYMENT STATUS: CASH ONLY         │
      │ (Failed 3 digital payment attempts)  │
      │                                      │
      │ Amount Due: ₹7.08                    │
      │                                      │
      │ Staff Action:                        │
      │ ✓ Open cash drawer                   │
      │ ✓ Collect ₹7.08 from customer       │
      │ ✓ Return change (if applicable)      │
      │ ✓ Confirm handover                   │
      │                                      │
      │ [Collect Cash] [View Audit Log]      │
      └──────────────────────────────────────┘

STAFF COLLECTS CASH
  (Same process as Flow 3, Step 3)

HANDOVER CONFIRMED
  (Same process as Flow 3, Step 4)

==========================================================
FINAL STATE AFTER LOCKOUT HANDLING
==========================================================

✅ auditLogger entries:
   1. CODE_GENERATED
   2. DOCUMENT_EMBEDDED
   3. DIGITAL_PAYMENT_FAILED (attempt 1)
   4. DIGITAL_PAYMENT_FAILED (attempt 2)
   5. DIGITAL_PAYMENT_FAILED (attempt 3)
   6. THREE_STRIKE_LOCKOUT_TRIGGERED ⭐
   7. STAFF_LOOKUP_INITIATED
   8. CASH_COLLECTION_COMPLETED
   9. PRINTS_HANDED_OVER

Key Design Benefits:
  ✅ Prevents infinite retry loops
  ✅ Forces manual recovery (staff intervention)
  ✅ Creates audit trail of failure
  ✅ Ensures merchant can process cash manually
  ✅ Protects payment gateway from overload
  ✅ Customer can still get prints (cash fallback)

```

---

## Complete System Trace Summary

Every feature flow follows the same pattern:

```
CUSTOMER/STAFF ACTION
    ↓
FRONTEND COMPONENT (React)
    ↓
CONTEXT STATE or SERVICE (JavaScript logic)
    ↓
HTTP REQUEST (JSON REST)
    ↓
BACKEND CONTROLLER (Express)
    ↓
BUSINESS LOGIC SERVICE (TypeScript)
    ↓
DATABASE (In-memory Map)
    ↓
AUDIT LOGGING (Immutable trail)
    ↓
HTTP RESPONSE (JSON)
    ↓
FRONTEND UPDATE (Display change)
    ↓
USER SEES RESULT
```

This pattern ensures:
- **Stateless**: Each request is independent
- **Traceable**: Every action logged with timestamp & actor
- **Auditable**: Complete history for compliance
- **Debuggable**: Follow any trace from UI to database

---

## How to Use This Document

1. **Understand a Feature**: Read the relevant flow (1-4)
2. **Trace an Action**: Follow the step-by-step breakdown
3. **Find Code**: File paths show exactly where logic lives
4. **Debug Issues**: See which step might be failing
5. **Add Features**: Use similar flow pattern for new features

Good luck! 🎉
