import React, { useState, useRef } from 'react';
import {
  QrCode,
  Smartphone,
  Upload,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Check,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import { MerchantPaymentConfigState } from '../../types/onboarding';

interface StepPaymentSetupProps {
  config: MerchantPaymentConfigState;
  onChange: (config: Partial<MerchantPaymentConfigState>) => void;
  shopName?: string;
}

export const StepPaymentSetup: React.FC<StepPaymentSetupProps> = ({
  config,
  onChange,
  shopName = 'AutoPrint Express',
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'QR' | 'UPI' | 'BOTH'>(
    config.paymentMethod || 'BOTH'
  );
  const [upiInput, setUpiInput] = useState<string>(config.upiId || '');
  const [upiError, setUpiError] = useState<string | null>(null);

  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(config.qrImageUrl || null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(Boolean(config.qrImageUrl));
  const [uploadError, setUploadError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_BASE_URL = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:9000/api`
    : 'http://localhost:9000/api';

  const handleSelectMethod = (method: 'QR' | 'UPI' | 'BOTH') => {
    setSelectedMethod(method);
    onChange({ paymentMethod: method });
    syncBackendConfig({ paymentMethod: method });
  };

  const syncBackendConfig = async (payload: { paymentMethod?: string; upiId?: string }) => {
    try {
      await fetch(`${API_BASE_URL}/merchant/payment-config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod: payload.paymentMethod || selectedMethod,
          upiId: payload.upiId !== undefined ? payload.upiId : upiInput,
          shopName,
        }),
      });
    } catch (err) {
      console.warn('Failed to sync payment config to backend:', err);
    }
  };

  const handleUpiChange = (val: string) => {
    setUpiInput(val);
    setUpiError(null);
    const upiRegex = /^[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}$/;
    if (val.trim() && !upiRegex.test(val.trim())) {
      setUpiError('Please enter a valid UPI ID (e.g., yourshop@upi)');
    } else {
      onChange({ upiId: val.trim() });
      syncBackendConfig({ upiId: val.trim() });
    }
  };

  const handleQrUpload = async (file: File) => {
    setUploadError(null);
    if (!file.type.match(/^image\/(png|jpe?g|webp)$/i)) {
      setUploadError('Invalid format. Please upload PNG, JPG, JPEG, or WebP images.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size exceeds 5MB limit.');
      return;
    }

    setIsUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64Data = reader.result as string;
        setQrPreviewUrl(base64Data);

        // Upload to Backend API
        const res = await fetch(`${API_BASE_URL}/merchant/upload-qr`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: file.name,
            base64Data,
          }),
        });

        const data = await res.json();
        if (data.ok) {
          setUploadSuccess(true);
          onChange({
            qrImageUrl: data.data.qrImageUrl,
            qrFileName: file.name,
          });
        } else {
          setUploadError(data.error || 'Failed to upload QR Code');
        }
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('QR upload failed', err);
      setUploadError('Network error uploading QR code image.');
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Step Header */}
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-emerald-600/10 border border-emerald-600/20 text-emerald-600 flex items-center justify-center mx-auto text-xl font-bold shadow-xs">
          💳
        </div>
        <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Where do you want to receive payments?
        </h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto font-medium">
          Choose how customers pay at your store counter or online portal.
        </p>
      </div>

      {/* Payment Method Cards Selection */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Option: BOTH (Recommended) */}
        <button
          type="button"
          onClick={() => handleSelectMethod('BOTH')}
          className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
            selectedMethod === 'BOTH'
              ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-sm'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              Recommended
            </span>
            {selectedMethod === 'BOTH' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">QR Code + UPI ID</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Maximum payment flexibility for counter customers</p>
          </div>
        </button>

        {/* Option: QR CODE */}
        <button
          type="button"
          onClick={() => handleSelectMethod('QR')}
          className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
            selectedMethod === 'QR'
              ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-sm'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <QrCode className="w-5 h-5 text-slate-700" />
            {selectedMethod === 'QR' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">QR Code Only</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Upload your Paytm / GPay / PhonePe QR Standee</p>
          </div>
        </button>

        {/* Option: UPI ID */}
        <button
          type="button"
          onClick={() => handleSelectMethod('UPI')}
          className={`p-4 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
            selectedMethod === 'UPI'
              ? 'border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-sm'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <Smartphone className="w-5 h-5 text-slate-700" />
            {selectedMethod === 'UPI' && (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            )}
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">UPI ID Only</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">Enter Virtual Payment Address (e.g. shop@upi)</p>
          </div>
        </button>
      </div>

      {/* OPTION A: QR Code Upload Section */}
      {(selectedMethod === 'QR' || selectedMethod === 'BOTH') && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-600" />
              <h4 className="text-sm font-bold text-slate-900">Upload Store Payment QR Code</h4>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">PNG, JPG, WebP (Max 5MB)</span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/webp"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleQrUpload(e.target.files[0]);
              }
            }}
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              qrPreviewUrl
                ? 'border-emerald-400 bg-emerald-50/30'
                : 'border-slate-300 hover:border-emerald-500 bg-slate-50 hover:bg-emerald-50/20'
            }`}
          >
            {qrPreviewUrl ? (
              <div className="flex flex-col items-center justify-center space-y-3">
                <img
                  src={qrPreviewUrl}
                  alt="Merchant QR Preview"
                  className="w-36 h-36 object-contain rounded-lg border border-slate-200 bg-white p-2 shadow-xs"
                />
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                  <Check className="w-3.5 h-3.5" />
                  <span>QR Code Stored & Verified</span>
                </div>
                <p className="text-[11px] text-slate-400">Click to replace QR image</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-800">
                  {isUploading ? 'Uploading QR Code...' : 'Click or Drag & Drop QR Image'}
                </p>
                <p className="text-[11px] text-slate-400">
                  Upload your Paytm, PhonePe, Google Pay, or Bank QR standee image
                </p>
              </div>
            )}
          </div>

          {uploadError && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 text-red-700 text-xs font-semibold border border-red-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      )}

      {/* OPTION B: UPI ID Section */}
      {(selectedMethod === 'UPI' || selectedMethod === 'BOTH') && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-600" />
              <h4 className="text-sm font-bold text-slate-900">Virtual Payment Address (UPI ID)</h4>
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Merchant Account</span>
          </div>

          <div>
            <input
              type="text"
              value={upiInput}
              onChange={(e) => handleUpiChange(e.target.value)}
              placeholder="e.g. autoprint@upi or 9876543210@paytm"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-slate-900 font-mono tracking-wide focus:outline-none focus:ring-2 ${
                upiError
                  ? 'border-red-300 ring-red-500/20 bg-red-50/30'
                  : 'border-slate-300 focus:border-emerald-600 focus:ring-emerald-500/20 bg-white'
              }`}
            />
            {upiError ? (
              <p className="text-[11px] text-red-600 font-semibold mt-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {upiError}
              </p>
            ) : (
              <p className="text-[11px] text-slate-400 mt-1">
                Customers will send digital payments directly to this UPI address.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
