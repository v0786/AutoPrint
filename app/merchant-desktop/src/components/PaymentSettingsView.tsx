import React, { useState, useEffect, useRef } from 'react';
import {
  CreditCard,
  QrCode,
  Upload,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Eye,
  Trash2,
  Key,
  Lock,
} from 'lucide-react';

export const PaymentSettingsView: React.FC = () => {
  const [provider, setProvider] = useState<'UPI_DIRECT' | 'RAZORPAY'>('UPI_DIRECT');
  const [upiId, setUpiId] = useState<string>('');
  const [upiPayeeName, setUpiPayeeName] = useState<string>('');
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string | null>(null);
  const [razorpayKeyId, setRazorpayKeyId] = useState<string>('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing configuration from SQLite backend
  const loadConfig = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/merchant/profile');
      if (res.ok) {
        const json = await res.json();
        if (json.ok && json.data) {
          const p = json.data.paymentConfig || {};
          setProvider(p.provider === 'RAZORPAY' ? 'RAZORPAY' : 'UPI_DIRECT');
          setUpiId(p.upiId || json.data.upiId || '');
          setUpiPayeeName(p.upiPayeeName || json.data.shopName || '');
          setUpiQrDataUrl(p.upiQrDataUrl || json.data.upiQrDataUrl || null);
          setRazorpayKeyId(p.razorpayKeyId || '');
        }
      }
    } catch (e: any) {
      setErrorMessage('Failed to load payment configuration.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  // Handle Custom QR Image Upload and UPI extraction
  const handleQrUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setUpiQrDataUrl(dataUrl);

      // Attempt to extract UPI ID from filename or known pattern if VPA is empty
      if (!upiId) {
        const match = file.name.match(/([a-zA-Z0-9.\-_]+@[a-zA-Z0-9]+)/);
        if (match) {
          setUpiId(match[1]);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/merchant/payment-receiver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          upiId: upiId.trim(),
          upiPayeeName: upiPayeeName.trim(),
          upiQrDataUrl,
          razorpayKeyId: razorpayKeyId.trim() || undefined,
          razorpayKeySecret: razorpayKeySecret.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Failed to save payment configuration.');
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (e: any) {
      setErrorMessage(e.message || 'Failed to save payment configuration.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-4xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Payment Receiver Configuration</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure the real UPI VPA, QR code, and Payment Gateway credentials used on the customer checkout screen.
          </p>
        </div>
        <button
          onClick={loadConfig}
          className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
          title="Refresh configuration"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Alert Messages */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>Payment receiver configuration successfully updated and saved to SQLite datastore!</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Method 1: UPI ID & Payee Details */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">1. Direct UPI Configuration (Instant Settlement)</h3>
              <p className="text-xs text-slate-500">Payments are received directly into your merchant bank account</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Merchant UPI VPA / ID *</label>
              <input
                type="text"
                required
                placeholder="e.g. autoprint.shop@okhdfcbank"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
              />
              <span className="text-[10px] text-slate-400">Must be a valid UPI handle (e.g. @upi, @okaxis, @icici)</span>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Payee Display Name</label>
              <input
                type="text"
                placeholder="AutoPrint Store Counter"
                value={upiPayeeName}
                onChange={(e) => setUpiPayeeName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
              />
              <span className="text-[10px] text-slate-400">Name displayed to customers on Google Pay / PhonePe</span>
            </div>
          </div>
        </div>

        {/* Method 2: Custom UPI QR Standee Image */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">2. Merchant Counter QR Code Image</h3>
                <p className="text-xs text-slate-500">Upload your physical shop UPI QR standee to display on customer kiosk</p>
              </div>
            </div>

            {upiQrDataUrl && (
              <button
                type="button"
                onClick={() => setUpiQrDataUrl(null)}
                className="text-xs text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove QR</span>
              </button>
            )}
          </div>

          {upiQrDataUrl ? (
            <div className="flex items-center gap-5 p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <img
                src={upiQrDataUrl}
                alt="Merchant UPI QR"
                className="w-28 h-28 object-contain rounded-xl border border-slate-300 bg-white p-1 shadow-sm"
              />
              <div className="space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-1.5 text-emerald-600 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Custom UPI QR Active</span>
                </div>
                <p className="text-slate-500 text-[11px] max-w-sm">
                  This QR code will be displayed directly to customers on the payment screen.
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 cursor-pointer"
                >
                  Replace Image
                </button>
              </div>
            </div>
          ) : (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-purple-400 rounded-2xl p-6 text-center cursor-pointer bg-slate-50/50 hover:bg-purple-50/20 transition-all"
            >
              <Upload className="w-8 h-8 text-purple-600 mx-auto mb-2 opacity-75" />
              <p className="text-xs font-bold text-slate-800">Click to upload your UPI QR Code image</p>
              <p className="text-[11px] text-slate-400 mt-0.5">PNG, JPG, or WebP exported from your banking app</p>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleQrUpload(e.target.files[0]);
              }
            }}
          />
        </div>

        {/* Method 3: Razorpay Payment Gateway Integration */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">3. Razorpay Gateway (Cards, NetBanking, Auto-Verification)</h3>
              <p className="text-xs text-slate-500">Optional: Enable automated payment webhook and card processing</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Razorpay Key ID</label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="rzp_live_..."
                  value={razorpayKeyId}
                  onChange={(e) => setRazorpayKeyId(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Razorpay Key Secret</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  placeholder="••••••••••••••••"
                  value={razorpayKeySecret}
                  onChange={(e) => setRazorpayKeySecret(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-600 focus:bg-white"
                />
              </div>
              <span className="text-[10px] text-slate-400">Stored strictly server-side; never exposed to frontend clients</span>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="py-3 px-8 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-blue-600/20 flex items-center gap-2 cursor-pointer transition-all"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving to Datastore...' : 'Save Payment Configuration'}</span>
          </button>
        </div>

      </form>
    </div>
  );
};
