import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4100);

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const queue: Array<{
  id: string;
  fileName: string;
  mimeType: string;
  colorMode: 'bw' | 'color';
  copies: number;
  pageRange: string;
  paymentMethod: 'cash' | 'upi';
  customerName: string;
  verificationCode: string;
  status: 'queued' | 'printing' | 'verified' | 'completed';
  createdAt: string;
}> = [];

app.get('/health', (_req, res) => {
  res.json({ ok: true, service: 'qrprint-merchant', timestamp: new Date().toISOString() });
});

app.get('/api/orders', (_req, res) => {
  res.json({ ok: true, orders: queue });
});

app.post('/api/orders', (req, res) => {
  const body = req.body ?? {};
  const fileName = typeof body.fileName === 'string' ? body.fileName : '';
  const mimeType = typeof body.mimeType === 'string' ? body.mimeType : 'application/octet-stream';
  const colorMode = body.colorMode === 'color' ? 'color' : 'bw';
  const copies = Number(body.copies ?? 1);
  const pageRange = typeof body.pageRange === 'string' ? body.pageRange : '1';
  const paymentMethod = body.paymentMethod === 'upi' ? 'upi' : 'cash';
  const customerName = typeof body.customerName === 'string' ? body.customerName : 'Customer';

  if (!fileName || copies < 1 || !pageRange.trim()) {
    return res.status(400).json({ ok: false, error: 'Invalid print request' });
  }

  const verificationCode = `${Math.floor(10000000 + Math.random() * 90000000)}`;
  const order = {
    id: `QRT-${Math.floor(1000 + Math.random() * 9000)}`,
    fileName,
    mimeType,
    colorMode,
    copies,
    pageRange,
    paymentMethod,
    customerName,
    verificationCode,
    status: 'queued' as const,
    createdAt: new Date().toISOString(),
  };

  queue.push(order);

  return res.status(201).json({ ok: true, order });
});

app.listen(port, '0.0.0.0', () => {
  console.log(`QRPrint merchant API running on http://localhost:${port}`);
});
