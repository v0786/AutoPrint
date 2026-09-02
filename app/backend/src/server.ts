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
import { PrinterService } from './services/printerService';

// 1. Initialize data storage directories and database
ensureDataDirectories();
initDatabase();

const app = express();

// 2. CORS configuration (production safe with configurable origin whitelist)
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, electron, server-to-server)
      if (!origin) return callback(null, true);
      if (
        CONFIG.CORS_ORIGINS.includes('*') ||
        CONFIG.CORS_ORIGINS.includes(origin) ||
        origin.startsWith('http://localhost:') ||
        origin.startsWith('http://127.0.0.1:')
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

  const status = dbHealthy && storageHealthy ? 200 : 503;

  res.status(status).json({
    ok: dbHealthy && storageHealthy,
    service: 'autoprint-fail-safe-verification-backend',
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
      api: CONFIG.PORT,
      merchant: CONFIG.MERCHANT_PORT,
      customer: CONFIG.CUSTOMER_PORT,
    },
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

// Digital Payment Gateway Attempt Routes
api.post('/payment/digital-attempt', PaymentController.recordDigitalAttempt);

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
  path.resolve(process.cwd(), '../merchant-desktop/dist'),
  path.resolve(process.cwd(), 'merchant-desktop/dist'),
];

const possibleCustomerPaths = [
  path.resolve(__dirname, '../../customer-web/dist'),
  path.resolve(__dirname, '../customer-web/dist'),
  path.resolve(process.cwd(), '../customer-web/dist'),
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

// 6. Error Handling Middleware
app.use(errorHandler);

// 7. Start Primary API Engine Server
const server = app.listen(CONFIG.PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`  AUTOPRINT FAIL-SAFE VERIFICATION BACKEND SERVICE     `);
  console.log(`  Running on: http://localhost:${CONFIG.PORT}`);
  console.log(`  API Base:   http://localhost:${CONFIG.PORT}${CONFIG.API_PREFIX}`);
  console.log(`  Data Path:  ${PATHS.DATA_DIR}`);
  console.log(`  Currency:   ${CONFIG.CURRENCY}`);
  console.log(`  Max Digital Attempts: ${CONFIG.MAX_DIGITAL_ATTEMPTS}`);
  console.log(`=======================================================`);
});

// 8. Graceful Shutdown
function handleShutdown(signal: string) {
  console.log(`\n[SERVER] Received ${signal}. Starting graceful shutdown...`);
  server.close(() => {
    console.log('[SERVER] HTTP server closed.');
    closeDatabase();
    console.log('[SERVER] Graceful shutdown complete.');
    process.exit(0);
  });

  // Force shutdown after 10s if hung
  setTimeout(() => {
    console.error('[SERVER] Forcing shutdown after timeout.');
    closeDatabase();
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

export default app;
export { server };
