/**
 * AutoPrint Customer Web Production Server & API Reverse Proxy
 * Serves compiled customer kiosk assets and proxies /api requests to configured local backend.
 * Authoritative single source of truth: C:\ProgramData\AutoPrint\config\appsettings.json
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── AppSettings Loader ────────────────────────────────────────────────────────
function loadAppSettings() {
  const possiblePaths = [
    process.env.AUTOPRINT_CONFIG_FILE,
    'C:\\ProgramData\\AutoPrint\\config\\appsettings.json',
    path.resolve(__dirname, '../../config/appsettings.json'),
    path.resolve(process.cwd(), 'config/appsettings.json'),
  ].filter(Boolean);

  for (const configPath of possiblePaths) {
    if (fs.existsSync(configPath)) {
      try {
        const raw = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(raw.replace(/^\uFEFF/, ''));
      } catch (err) {
        console.warn(`[CONFIG] Failed to parse ${configPath}:`, err);
      }
    }
  }
  return {};
}

const appSettings = loadAppSettings();

const app = express();
const PORT = Number(process.env.CUSTOMER_PORT || appSettings.customerWebPort || appSettings.ports?.customer || 7000);
const BACKEND_PORT = Number(process.env.BACKEND_PORT || appSettings.backendPort || appSettings.ports?.backend || 5000);
const BACKEND_HOST = process.env.BACKEND_HOST || '127.0.0.1';

// 0. Health Check Endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'customer-web',
    port: PORT,
    timestamp: new Date().toISOString(),
  });
});

// 1. Dynamic Runtime Config Endpoint
app.get('/config/runtime.json', (_req, res) => {
  res.json({
    customerWebPort: PORT,
    backendPort: BACKEND_PORT,
    apiBaseUrl: '/api',
    updatedAt: new Date().toISOString(),
  });
});

// 2. Transparent API Reverse Proxy to Local Backend
app.use('/api', (req, res) => {
  const options = {
    hostname: BACKEND_HOST,
    port: BACKEND_PORT,
    path: `/api${req.url}`,
    method: req.method,
    headers: {
      ...req.headers,
      host: `${BACKEND_HOST}:${BACKEND_PORT}`,
      'x-forwarded-for': req.ip,
      'x-forwarded-proto': req.protocol,
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error(`[PROXY ERROR] Customer web to backend (: ${BACKEND_PORT}) failure:`, err.message);
    if (!res.headersSent) {
      res.status(502).json({
        ok: false,
        error: `AutoPrint backend service is currently unreachable on ${BACKEND_HOST}:${BACKEND_PORT}.`,
      });
    }
  });

  req.pipe(proxyReq);
});

// 3. Serve Static Frontend Assets
const distPath = path.join(__dirname, 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// 4. SPA Fallback
app.get('*', (_req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send('AutoPrint Customer Kiosk is ready. Please build customer-web frontend.');
  }
});

process.on('uncaughtException', (err) => {
  console.error('[CUSTOMER WEB FATAL]', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[CUSTOMER WEB UNHANDLED REJECTION]', reason);
});

const server = http.createServer(app);

server.on('error', (err) => {
  console.error(`[CUSTOMER WEB ERROR] Failed to bind on 0.0.0.0:${PORT}:`, err.message);
  if (err.code === 'EADDRNOTAVAIL' || err.code === 'EACCES') {
    console.log(`[CUSTOMER WEB FALLBACK] Attempting fallback bind to 127.0.0.1:${PORT}...`);
    server.listen(PORT, '127.0.0.1', () => {
      console.log(`[CUSTOMER WEB] Running on http://127.0.0.1:${PORT} (Proxying /api -> ${BACKEND_HOST}:${BACKEND_PORT})`);
    });
  } else {
    process.exit(1);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[CUSTOMER WEB] Running on http://0.0.0.0:${PORT} (Proxying /api -> ${BACKEND_HOST}:${BACKEND_PORT})`);
});
