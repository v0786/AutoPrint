'use client';

import { useMemo, useState } from 'react';
import { buildVerificationCode, buildOrderId, type PaymentMethod } from '../../shared/src';

const fileTypes = ['DOCX', 'PPTX', 'XLSX', 'PDF', 'JPG'];
const validMimeTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'application/vnd.ms-excel'];

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [colorMode, setColorMode] = useState<'bw' | 'color'>('bw');
  const [copies, setCopies] = useState(1);
  const [pageRange, setPageRange] = useState('1-10');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [submitted, setSubmitted] = useState(false);

  const orderCode = useMemo(() => buildVerificationCode(), []);
  const orderId = useMemo(() => buildOrderId(), []);

  const isFileValid =
    !!selectedFile &&
    (validMimeTypes.includes(selectedFile.type) || /\.(pdf|docx|pptx|xlsx|xls|jpg|jpeg)$/i.test(selectedFile.name));

  const canSubmit = isFileValid && copies >= 1 && pageRange.trim().length > 0;

  const onSubmit = async () => {
    if (!canSubmit || !selectedFile) return;

    setSubmitted(false);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: selectedFile.name,
          mimeType: selectedFile.type || 'application/octet-stream',
          colorMode,
          copies,
          pageRange,
          paymentMethod,
          customerName: 'Customer',
        })
      });

      const payload = await response.json();
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'Could not submit order');
      }

      setSubmitted(true);
    } catch (error) {
      console.error('Order submission failed', error);
      setSubmitted(false);
      alert(error instanceof Error ? error.message : 'Could not submit order');
    }
  };

  return (
    <main className="customer-shell">
      <div className={`splash-screen ${isLoading ? 'visible' : 'hidden'}`}>
        <div className="logo">QR</div>
        <h1>QRPrint</h1>
        <p>Preparing your print order</p>
        <button onClick={() => setIsLoading(false)}>Continue</button>
      </div>

      {!isLoading && (
        <div className="customer-panel">
          <section className="hero-card">
            <p className="eyebrow">Customer Portal</p>
            <h2>Upload and print in minutes</h2>
            <p>Scan your store QR code and submit a print job with secure payment and verification.</p>
          </section>

          <section className="upload-card">
            <label className="upload-box">
              <input type="file" accept=".docx,.pptx,.xlsx,.xls,.pdf,.jpg,.jpeg" onChange={e => setSelectedFile(e.target.files?.[0] ?? null)} />
              <span>{selectedFile ? selectedFile.name : 'Choose a file to print'}</span>
            </label>

            {!isFileValid && selectedFile && (
              <p className="error-text">Unsupported file type. Please use PDF, DOCX, PPTX, XLS/XLSX, or JPG.</p>
            )}

            <div className="supported-files">
              {fileTypes.map(type => (
                <span key={type}>{type}</span>
              ))}
            </div>
          </section>

          <section className="options-grid">
            <div className="field">
              <label>Color mode</label>
              <select value={colorMode} onChange={e => setColorMode(e.target.value as 'bw' | 'color')}>
                <option value="bw">Black & White</option>
                <option value="color">Color</option>
              </select>
            </div>

            <div className="field">
              <label>Copies</label>
              <input type="number" min={1} max={20} value={copies} onChange={e => setCopies(Math.max(1, Number(e.target.value) || 1))} />
            </div>

            <div className="field">
              <label>Page range</label>
              <input value={pageRange} onChange={e => setPageRange(e.target.value)} />
            </div>
          </section>

          <div className="payment-card">
            <h3>Payment options</h3>
            <div className="payment-options">
              <button type="button" className={paymentMethod === 'cash' ? 'secondary-btn active' : 'secondary-btn'} onClick={() => setPaymentMethod('cash')}>Cash payment</button>
              <button type="button" className={paymentMethod === 'upi' ? 'primary-btn active' : 'primary-btn'} onClick={() => setPaymentMethod('upi')}>Pay with Razorpay</button>
            </div>

            <div className="verification-box">
              <span>Verification code</span>
              <strong>{orderCode}</strong>
              <small>{paymentMethod === 'cash' ? 'Present this at the counter for merchant verification.' : 'UPI payment is verified server-side before print begins.'}</small>
            </div>

            <div className="summary-row">
              <span>Order ID: {orderId}</span>
              <span>File: {selectedFile ? selectedFile.name : 'Not selected'}</span>
            </div>

            <button type="button" className="submit-btn" onClick={onSubmit} disabled={!canSubmit}>
              {submitted ? 'Submitted' : 'Submit order'}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
