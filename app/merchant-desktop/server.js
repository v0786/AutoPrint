/**
 * AutoPrint Merchant Desktop Production Static Server
 * Serves compiled merchant dashboard operator assets on port 8000
 */

import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.MERCHANT_PORT || 8000);
const distPath = path.join(__dirname, 'dist');

// 1. Serve Static Frontend Assets
app.use(express.static(distPath));

// 2. SPA Fallback
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[MERCHANT DESKTOP] Running on http://0.0.0.0:${PORT}`);
});
