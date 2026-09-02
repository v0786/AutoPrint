import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { CONFIG } from './config/environment';
import { requestLogger, errorHandler } from './middleware/errorHandler';
import { JobController } from './controllers/jobController';
import { VerificationController } from './controllers/verificationController';
import { PaymentController } from './controllers/paymentController';

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(requestLogger);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'autoprint-fail-safe-verification-backend',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    env: CONFIG.NODE_ENV,
    ports: {
      api: CONFIG.PORT,
      merchant: CONFIG.MERCHANT_PORT,
      customer: CONFIG.CUSTOMER_PORT,
    },
  });
});

import { MerchantController } from './controllers/merchantController';

// Serve uploaded merchant QR images statically
const uploadsDir = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// API Routes
const api = express.Router();

// Job Management Routes
api.post('/jobs', JobController.submitJob);
api.get('/jobs', JobController.getAllJobs);
api.get('/jobs/:id', JobController.getJobById);

// Verification & Staff Desk Routes
api.get('/verification/lookup/:code', VerificationController.lookupByCode);
api.post('/verification/lookup', VerificationController.lookupByCode);
api.post('/verification/collect-cash', VerificationController.processCashCollection);
api.post('/verification/handover', VerificationController.confirmHandover);
api.get('/verification/audit-logs', VerificationController.getAuditLogs);

// Merchant Payment Setup & Configuration Routes
api.get('/merchant/payment-config', MerchantController.getPaymentConfig);
api.post('/merchant/payment-config', MerchantController.updatePaymentConfig);
api.post('/merchant/upload-qr', MerchantController.uploadQrCode);

// Digital Payment Gateway Attempt & Webhook Routes
api.post('/payment/digital-attempt', PaymentController.recordDigitalAttempt);
api.post('/payment/webhook', PaymentController.recordDigitalAttempt);

app.use(CONFIG.API_PREFIX, api);

// Resolve static dist paths for production hosting
const possibleMerchantPaths = [
  path.resolve(__dirname, '../../merchant-desktop/dist'),
  path.resolve(__dirname, '../merchant-desktop/dist'),
  path.resolve(process.cwd(), '../merchant-desktop/dist'),
  path.resolve(process.cwd(), 'merchant-desktop/dist'),
  'C:\\AutoPrint\\App\\merchant-desktop\\dist'
];

const possibleCustomerPaths = [
  path.resolve(__dirname, '../../customer-web/dist'),
  path.resolve(__dirname, '../customer-web/dist'),
  path.resolve(process.cwd(), '../customer-web/dist'),
  path.resolve(process.cwd(), 'customer-web/dist'),
  'C:\\AutoPrint\\App\\customer-web\\dist'
];

let merchantDistPath = possibleMerchantPaths.find(p => fs.existsSync(p));
let customerDistPath = possibleCustomerPaths.find(p => fs.existsSync(p));

// Serve static apps on primary API port as fallback routes
if (merchantDistPath) {
  app.use('/merchant', express.static(merchantDistPath));
  app.get('/merchant/*', (_req, res) => {
    res.sendFile(path.join(merchantDistPath!, 'index.html'));
  });
}

if (customerDistPath) {
  app.use('/customer', express.static(customerDistPath));
  app.get('/customer/*', (_req, res) => {
    res.sendFile(path.join(customerDistPath!, 'index.html'));
  });
}

// Error Handling Middleware
app.use(errorHandler);

// 1. Start Primary API Engine Server
app.listen(CONFIG.PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`  AUTOPRINT FAIL-SAFE VERIFICATION BACKEND SERVICE     `);
  console.log(`  Running on: http://localhost:${CONFIG.PORT}`);
  console.log(`  API Base:   http://localhost:${CONFIG.PORT}${CONFIG.API_PREFIX}`);
  console.log(`  Max Digital Attempts Allowed: ${CONFIG.MAX_DIGITAL_ATTEMPTS}`);
  console.log(`=======================================================`);
});

// 2. Start Dedicated Static Host for Merchant Desktop Manager
if (merchantDistPath) {
  const merchantApp = express();
  merchantApp.use(cors({ origin: '*' }));
  merchantApp.use(express.static(merchantDistPath));
  merchantApp.get('*', (_req, res) => {
    res.sendFile(path.join(merchantDistPath!, 'index.html'));
  });
  merchantApp.listen(CONFIG.MERCHANT_PORT, '0.0.0.0', () => {
    console.log(`  Merchant Desktop Portal active: http://localhost:${CONFIG.MERCHANT_PORT}`);
  });
} else {
  console.warn(`  Warning: Merchant Desktop dist folder not found. Build merchant-desktop first.`);
}

// 3. Start Dedicated Static Host for Customer Web Interface
if (customerDistPath) {
  const customerApp = express();
  customerApp.use(cors({ origin: '*' }));
  customerApp.use(express.static(customerDistPath));
  customerApp.get('*', (_req, res) => {
    res.sendFile(path.join(customerDistPath!, 'index.html'));
  });
  customerApp.listen(CONFIG.CUSTOMER_PORT, '0.0.0.0', () => {
    console.log(`  Customer Web Portal active:     http://localhost:${CONFIG.CUSTOMER_PORT}`);
  });
} else {
  console.warn(`  Warning: Customer Web dist folder not found. Build customer-web first.`);
}

export default app;
