/**
 * AutoPrint Customer Web Production Server & API Reverse Proxy
 * Serves compiled customer kiosk assets on port 7000 and proxies /api requests to local backend (:5000)
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.CUSTOMER_PORT || 7000);
const BACKEND_PORT = Number(process.env.PORT || 5000);
const BACKEND_HOST = process.env.BACKEND_HOST || '127.0.0.1';

// 1. Transparent API Reverse Proxy to Local Backend
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
    console.error('[PROXY ERROR] Backend communication failure:', err.message);
    if (!res.headersSent) {
      res.status(502).json({
        ok: false,
        error: 'AutoPrint backend service is currently unreachable on localhost.',
      });
    }
  });

  req.pipe(proxyReq);
});

// 2. Serve Static Frontend Assets
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// 3. SPA Fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[CUSTOMER WEB] Running on http://0.0.0.0:${PORT} (Proxying /api -> :${BACKEND_PORT})`);
});
