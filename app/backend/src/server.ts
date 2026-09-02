/**
 * AutoPrint Backend Server
 * Production-grade fail-safe AutoPrint verification and payment backend service.
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { CONFIG, ensureDataDirectories, PATHS } from './config/environment';
import { initDatabase, closeDatabase, getDb } from './database/db';
import { requestLogger, errorHandler } from './middleware/errorHandler';
import { upload } from './middleware/upload';
import { JobController } from './controllers/jobController';
import { VerificationController } from './controllers/verificationController';
import { PaymentController } from './controllers/paymentController';
import { MerchantController } from './controllers/merchantController';
import { SystemController } from './controllers/systemController';
import { ConfigController } from './controllers/configController';
import { PrinterService } from './services/printerService';
import { tunnelService } from './services/tunnelService';

// 1. Initialize data storage directories and database
ensureDataDirectories();
initDatabase();

const app = express();

// 2. CORS configuration (production safe with configurable origin whitelist)
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        CONFIG.CORS_ORIGINS.includes('*') ||
        CONFIG.CORS_ORIGINS.includes(origin) ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:') ||
        origin.includes('.pagekite.me')
      ) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} is not allowed by AutoPrint CORS policy.`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(requestLogger);

// 3. Health Check Endpoint
app.get('/health', (_req, res) => {
  let dbHealthy = false;
  try {
    const row = getDb().prepare('SELECT 1 as ok').get() as { ok: number };
    dbHealthy = row?.ok === 1;
  } catch {
    dbHealthy = false;
  }

  const storageHealthy = fs.existsSync(PATHS.DATA_DIR) && fs.existsSync(PATHS.DB_DIR);
  const tunnelState = tunnelService.getTunnelState();

  const status = dbHealthy && storageHealthy ? 200 : 503;

  res.status(status).json({
    ok: dbHealthy && storageHealthy,
    service: 'autoprint',
    backend: 'running',
    customerWeb: 'running',
    merchantWeb: 'running',
    pagekite: tunnelState.status.toLowerCase(),
    datastore: storageHealthy ? 'ready' : 'degraded',
    version: CONFIG.APP_VERSION,
    timestamp: new Date().toISOString(),
    environment: CONFIG.NODE_ENV,
    currency: CONFIG.CURRENCY,
    storage: {
      healthy: storageHealthy,
      dataDir: PATHS.DATA_DIR,
    },
    database: {
      healthy: dbHealthy,
      engine: 'sqlite3-wal',
    },
    ports: {
      backend: CONFIG.PORT,
      merchant: CONFIG.MERCHANT_PORT,
      customer: CONFIG.CUSTOMER_PORT,
    },
    customerUrl: tunnelService.getActiveCustomerUrl(),
  });
});

// 4. API Routes
const api = express.Router();

// Job Management Routes (supports multipart file upload)
api.post('/jobs', upload.single('file'), JobController.submitJob);
api.get('/jobs', JobController.getAllJobs);
api.get('/jobs/:id', JobController.getJobById);

// Verification & Staff Desk Routes
api.get('/verification/lookup/:code', VerificationController.lookupByCode);
api.post('/verification/lookup', VerificationController.lookupByCode);
api.post('/verification/collect-cash', VerificationController.processCashCollection);
api.post('/verification/handover', VerificationController.confirmHandover);
api.get('/verification/audit-logs', VerificationController.getAuditLogs);

// Merchant Auth & Management Routes
api.get('/merchant/auth/check', MerchantController.checkAuth);
api.post('/merchant/auth/onboard', MerchantController.onboard);
api.post('/merchant/auth/login', MerchantController.login);
api.post('/merchant/auth/logout', MerchantController.logout);
api.get('/merchant/profile', MerchantController.getProfile);
api.put('/merchant/profile', MerchantController.updateProfile);
api.get('/merchant/public-profile', MerchantController.getPublicProfile);
api.post('/merchant/payment-receiver', MerchantController.updatePaymentReceiver);
api.post('/merchant/printer', MerchantController.updatePrinter);
api.post('/merchant/toggle-online', MerchantController.toggleOnline);

// Digital Payment Gateway Routes
api.post('/payment/create-order', PaymentController.createOrder);
api.post('/payment/verify-razorpay', PaymentController.verifyRazorpay);
api.post('/payment/digital-attempt', PaymentController.recordDigitalAttempt);

// System Workload & Dynamic Queue Routes
api.get('/system/workload', SystemController.getWorkload);

// System Configuration & QR Ingress Routes
api.get('/config/public', ConfigController.getPublicConfig);
api.get('/config/qr-code', ConfigController.getQrCodeImage);
api.post('/config/pagekite', ConfigController.updatePageKiteConfig);

// Printer Fleet Discovery
api.get('/printers', async (_req, res, next) => {
  try {
    const printers = await PrinterService.getAvailablePrinters();
    res.json({ ok: true, count: printers.length, data: printers });
  } catch (err) {
    next(err);
  }
});

app.use(CONFIG.API_PREFIX, api);

// 5. Static Frontend Hosting for Production / Local Deployment
const possibleMerchantPaths = [
  path.resolve(__dirname, '../../merchant-desktop/dist'),
  path.resolve(__dirname, '../merchant-desktop/dist'),
  path.resolve(process.cwd(), 'app/merchant-desktop/dist'),
  path.resolve(process.cwd(), 'merchant-desktop/dist'),
];

const possibleCustomerPaths = [
  path.resolve(__dirname, '../../customer-web/dist'),
  path.resolve(__dirname, '../customer-web/dist'),
  path.resolve(process.cwd(), 'app/customer-web/dist'),
  path.resolve(process.cwd(), 'customer-web/dist'),
];

const merchantDistPath = possibleMerchantPaths.find((p) => fs.existsSync(p));
const customerDistPath = possibleCustomerPaths.find((p) => fs.existsSync(p));

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

// 6. Centralized Error Handler (must be registered after routes)
app.use(errorHandler);

// 7. Start Server
const server = app.listen(CONFIG.PORT, '0.0.0.0', () => {
  const banner = [
    '==================================================================',
    '       AUTOPRINT PRINT MANAGEMENT & VERIFICATION SERVER           ',
    '==================================================================',
    ` [API Port]       : http://localhost:${CONFIG.PORT}${CONFIG.API_PREFIX}`,
    ` [Health Check]   : http://localhost:${CONFIG.PORT}/health`,
    ` [Customer Kiosk] : http://localhost:${CONFIG.CUSTOMER_PORT}`,
    ` [Merchant Desk]  : http://localhost:${CONFIG.MERCHANT_PORT}`,
    ` [Datastore Root] : ${PATHS.DATA_DIR}`,
    ` [Public Ingress] : ${tunnelService.getActiveCustomerUrl()}`,
    ` [Environment]    : ${CONFIG.NODE_ENV}`,
    ` [Currency]       : ${CONFIG.CURRENCY}`,
    '==================================================================',
  ];
  console.log(banner.join('\n'));
});

// 8. Graceful Shutdown
function handleShutdown(signal: string): void {
  console.log(`\n[AUTOPRINT] Received ${signal}. Starting graceful shutdown...`);
  server.close(() => {
    console.log('[AUTOPRINT] HTTP server closed.');
    try {
      closeDatabase();
    } catch (e) {
      console.warn('[AUTOPRINT] Database close warning:', e);
    }
    process.exit(0);
  });

  setTimeout(() => {
    console.error('[AUTOPRINT] Forcefully terminating process after 5s timeout.');
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

export { app, server };
