import React, { useState, useEffect } from 'react';
import {
  Store,
  CreditCard,
  QrCode,
  DollarSign,
  Users,
  Settings,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  ShieldCheck,
  RotateCcw,
  Power,
  Copy,
  Check,
  ExternalLink,
  Printer,
  Sparkles,
  Globe,
  Wifi,
  Eye,
  EyeOff,
  Key,
  Loader2,
} from 'lucide-react';
import { UserManagementView } from './UserManagementView';
import { apiFetch } from '../utils/api';
import { Disclosure } from './motion-primitives/Disclosure';

interface SettingsViewProps {
  userRole?: 'admin' | 'staff';
  currentUserId?: string;
  isOnline: boolean;
  onToggleOnline: () => void;
  onProfileUpdated?: (updated: any) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  userRole = 'staff',
  currentUserId,
  isOnline,
  onToggleOnline,
  onProfileUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<'store' | 'pricing' | 'payments' | 'station' | 'factory' | 'users'>('store');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Store Profile State
  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [branch, setBranch] = useState('Main Branch');
  const [kioskNumber, setKioskNumber] = useState('Counter #01');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedPrinter, setSelectedPrinter] = useState('AutoPrint Virtual Spooler');

  // Print Pricing State
  const [bwSingle, setBwSingle] = useState(2.0);
  const [bwDoublePerSide, setBwDoublePerSide] = useState(1.5);
  const [colorSingle, setColorSingle] = useState(10.0);
  const [colorDoublePerSide, setColorDoublePerSide] = useState(8.0);
  const [photoGlossy, setPhotoGlossy] = useState(25.0);

  // Size Multipliers
  const [a3Multiplier, setA3Multiplier] = useState(2.0);
  const [legalMultiplier, setLegalMultiplier] = useState(1.25);
  const [letterMultiplier, setLetterMultiplier] = useState(1.0);

  // Finishing & Binding Rates
  const [stapleRate, setStapleRate] = useState(5.0);
  const [spiralRate, setSpiralRate] = useState(40.0);
  const [hardcoverRate, setHardcoverRate] = useState(150.0);
  const [laminationRate, setLaminationRate] = useState(20.0);
  const [skipVerificationPage, setSkipVerificationPage] = useState(false);

  // Payment State
  const [provider, setProvider] = useState<'UPI_DIRECT' | 'RAZORPAY'>('UPI_DIRECT');
  const [upiId, setUpiId] = useState('');
  const [upiPayeeName, setUpiPayeeName] = useState('');
  const [upiQrDataUrl, setUpiQrDataUrl] = useState<string | null>(null);
  const [razorpayKeyId, setRazorpayKeyId] = useState('');
  const [razorpayKeySecret, setRazorpayKeySecret] = useState('');

  // Station & Kiosk State
  const [kioskUrl, setKioskUrl] = useState('https://autoprint.pagekite.me');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [copiedKioskUrl, setCopiedKioskUrl] = useState(false);

  // PageKite Remote Tunnel State
  const [pagekiteSubdomain, setPagekiteSubdomain] = useState('autoprint');
  const [pagekiteSecret, setPagekiteSecret] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [pagekiteStatus, setPagekiteStatus] = useState<string>('DISABLED');
  const [pagekiteError, setPagekiteError] = useState<string | null>(null);
  const [verifyingPagekite, setVerifyingPagekite] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string } | null>(null);
  const [savingPagekite, setSavingPagekite] = useState(false);
  const [checkingRazorpay, setCheckingRazorpay] = useState(false);
  const [razorpayCheck, setRazorpayCheck] = useState<{ ok: boolean; message: string } | null>(null);

  // Available Windows Printers
  const [availablePrinters, setAvailablePrinters] = useState<string[]>([]);

  const loadAllSettings = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [profileRes, configRes, printersRes] = await Promise.all([
        apiFetch('/api/merchant/profile'),
        apiFetch('/api/config/public').catch(() => null),
        apiFetch('/api/printers?refresh=true').catch(() => null),
      ]);

      if (profileRes.ok) {
        const json = await profileRes.json();
        if (json.ok && json.data) {
          const d = json.data;
          setShopName(d.shopName || '');
          setOwnerName(d.ownerName || '');
          setBranch(d.branch || 'Main Branch');
          setKioskNumber(d.kioskNumber || 'Counter #01');
          setAddress(d.address || '');
          setPhone(d.phone || '');
          if (d.selectedPrinter) setSelectedPrinter(d.selectedPrinter);

          if (d.rates) {
            setBwSingle(d.rates.bwSingle ?? 2.0);
            setBwDoublePerSide(d.rates.bwDoublePerSide ?? 1.5);
            setColorSingle(d.rates.colorSingle ?? 10.0);
            setColorDoublePerSide(d.rates.colorDoublePerSide ?? 8.0);
            setPhotoGlossy(d.rates.photoGlossy ?? 25.0);

            setA3Multiplier(d.rates.a3Multiplier ?? 2.0);
            setLegalMultiplier(d.rates.legalMultiplier ?? 1.25);
            setLetterMultiplier(d.rates.letterMultiplier ?? 1.0);

            if (d.rates.finishing) {
              setStapleRate(d.rates.finishing.staple ?? 5.0);
              setSpiralRate(d.rates.finishing.spiral ?? 40.0);
              setHardcoverRate(d.rates.finishing.hardcover ?? 150.0);
              setLaminationRate(d.rates.finishing.laminationPerSheet ?? 20.0);
            }
            setSkipVerificationPage(Boolean(d.rates.skipVerificationPage));
          }

          if (d.paymentConfig) {
            const p = d.paymentConfig;
            setProvider(p.provider === 'RAZORPAY' ? 'RAZORPAY' : 'UPI_DIRECT');
            setUpiId(p.upiId || d.upiId || '');
            setUpiPayeeName(p.upiPayeeName || d.shopName || '');
            setUpiQrDataUrl(p.upiQrDataUrl || d.upiQrDataUrl || null);
            setRazorpayKeyId(p.razorpayKeyId || '');
          }
        }
      }

      if (configRes && configRes.ok) {
        const cJson = await configRes.json();
        if (cJson.data) {
          if (cJson.data.customerUrl) setKioskUrl(cJson.data.customerUrl);
          if (cJson.data.qrCodeDataUrl) setQrCodeDataUrl(cJson.data.qrCodeDataUrl);
          if (cJson.data.pagekite) {
            if (cJson.data.pagekite.subdomain) setPagekiteSubdomain(cJson.data.pagekite.subdomain);
            setPagekiteStatus(cJson.data.pagekite.status || 'DISABLED');
            if (cJson.data.pagekite.error) setPagekiteError(cJson.data.pagekite.error);
          }
        }
      }

      if (printersRes && printersRes.ok) {
        const pJson = await printersRes.json();
        if (pJson.ok && Array.isArray(pJson.data)) {
          setAvailablePrinters(pJson.data.map((p: any) => p.name));
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load store settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllSettings();
  }, []);

  const handleSaveStoreAndPricing = async () => {
    setSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const payload = {
        shopName: shopName.trim(),
        ownerName: ownerName.trim(),
        branch: branch.trim(),
        kioskNumber: kioskNumber.trim(),
        address: address.trim(),
        phone: phone.trim(),
        selectedPrinter,
        isOnline,
        colorPricePerPage: Number(colorSingle),
        bwPricePerPage: Number(bwSingle),
        photoPricePerPage: Number(photoGlossy),
        rates: {
          bwSingle: Number(bwSingle),
          bwDoublePerSide: Number(bwDoublePerSide),
          colorSingle: Number(colorSingle),
          colorDoublePerSide: Number(colorDoublePerSide),
          photoGlossy: Number(photoGlossy),
          a3Multiplier: Number(a3Multiplier),
          legalMultiplier: Number(legalMultiplier),
          letterMultiplier: Number(letterMultiplier),
          finishing: {
            staple: Number(stapleRate),
            spiral: Number(spiralRate),
            hardcover: Number(hardcoverRate),
            laminationPerSheet: Number(laminationRate),
          },
          skipVerificationPage,
        },
      };

      const res = await apiFetch('/api/merchant/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.error || 'Failed to save settings.');
      }

      setSaveSuccess(true);
      if (onProfileUpdated) onProfileUpdated(json.data);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save store settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePayments = async () => {
    setSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const res = await apiFetch('/api/merchant/payment-receiver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          ...(upiId.trim() ? { upiId: upiId.trim() } : {}),
          ...(upiPayeeName.trim() ? { upiPayeeName: upiPayeeName.trim() } : {}),
          ...(upiQrDataUrl ? { upiQrDataUrl } : {}),
          ...(razorpayKeyId.trim() ? { razorpayKeyId: razorpayKeyId.trim() } : {}),
          ...(razorpayKeySecret.trim() ? { razorpayKeySecret: razorpayKeySecret.trim() } : {}),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(`${json.error || 'Failed to save payment configuration.'}${json.traceId ? ` (Trace: ${json.traceId})` : ''}`);
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save payment receiver.');
    } finally {
      setSaving(false);
    }
  };

  const handleCheckRazorpay = async () => {
    setCheckingRazorpay(true);
    setRazorpayCheck(null);
    try {
      const res = await apiFetch('/api/payment/razorpay/check', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.ok) throw new Error(json.error || 'Razorpay credentials could not be verified.');
      setRazorpayCheck({ ok: true, message: `Razorpay is connected (${json.keyId || 'key configured'}).` });
    } catch (error: any) {
      setRazorpayCheck({ ok: false, message: error.message || 'Razorpay connection check failed.' });
    } finally {
      setCheckingRazorpay(false);
    }
  };

  const handleCopyKioskLink = () => {
    navigator.clipboard.writeText(kioskUrl);
    setCopiedKioskUrl(true);
    setTimeout(() => setCopiedKioskUrl(false), 2000);
  };

  const handlePrintStandee = () => {
    if (!qrCodeDataUrl) {
      setErrorMessage('QR code is not available yet. Please refresh the Station settings and try again.');
      return;
    }
    const printWindow = window.open('', '_blank', 'width=850,height=1000');
    if (!printWindow) {
      setErrorMessage('Please allow pop-ups to print the QR standee.');
      return;
    }
    const safeShopName = (shopName || 'AutoPrint Store').replace(/[<>&\"]/g, '');
    const safeCounter = (kioskNumber || 'Counter #01').replace(/[<>&\"]/g, '');
    printWindow.document.write(`<!doctype html><html><head><title>AutoPrint QR Standee</title><style>
      @page{size:A4 portrait;margin:0}*{box-sizing:border-box}body{margin:0;background:#fff;color:#111;font-family:Arial,sans-serif;text-align:center}
      .page{width:210mm;min-height:297mm;padding:24mm 18mm;display:flex;align-items:center;justify-content:center}.card{width:100%;border:3px solid #381e72;border-radius:18px;padding:18mm 12mm}.brand{font-size:18px;font-weight:800;letter-spacing:3px;color:#381e72}.shop{font-size:30px;font-weight:800;margin:10mm 0 4mm}.qr{width:125mm;height:125mm;object-fit:contain;border:1px solid #ddd;padding:5mm}.counter{font-size:22px;font-weight:700;letter-spacing:2px;margin-top:8mm}.url{font-size:12px;color:#555;margin-top:4mm;word-break:break-all}@media print{.page{min-height:100vh}}
    </style></head><body><main class="page"><section class="card"><div class="brand">AUTOPRINT</div><div class="shop">${safeShopName}</div><img class="qr" src="${qrCodeDataUrl}"/><div class="counter">${safeCounter} &bull; SCAN TO PRINT</div><div class="url">${kioskUrl}</div></section></main><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script></body></html>`);
    printWindow.document.close();
  };

  const handleVerifyPageKite = async () => {
    if (!pagekiteSubdomain.trim() || !pagekiteSecret.trim()) {
      setVerifyResult({
        success: false,
        message: 'Please provide both Kite Name and Secret Key before verifying.',
      });
      return;
    }

    setVerifyingPagekite(true);
    setVerifyResult(null);
    setErrorMessage(null);
    try {
      const res = await apiFetch('/api/config/pagekite/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain: pagekiteSubdomain.trim(),
          secret: pagekiteSecret.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setVerifyResult({
          success: true,
          message: data.message || 'PageKite credentials verified! Tunnel is ready to fly.',
        });
        if (data.publicUrl) setKioskUrl(data.publicUrl);
      } else {
        setVerifyResult({
          success: false,
          message: data.error || 'Verification failed. Please check your Secret Key.',
        });
      }
    } catch (err: any) {
      setVerifyResult({
        success: false,
        message: err.message || 'Failed to connect to verification engine.',
      });
    } finally {
      setVerifyingPagekite(false);
    }
  };

  const handleTogglePageKite = async (enable: boolean) => {
    if (enable && (!pagekiteSubdomain.trim() || !pagekiteSecret.trim())) {
      setErrorMessage('Please enter Kite Name and Secret Key before starting the tunnel.');
      return;
    }

    setSavingPagekite(true);
    setErrorMessage(null);
    try {
      const res = await apiFetch('/api/config/pagekite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subdomain: pagekiteSubdomain.trim(),
          secret: pagekiteSecret.trim(),
          enabled: enable,
        }),
      });

      const data = await res.json();
      if (res.ok && data.ok) {
        setPagekiteStatus(enable ? 'CONNECTING' : 'DISABLED');
        if (data.data?.publicUrl) setKioskUrl(data.data.publicUrl);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        setTimeout(() => loadAllSettings(), 2000);
      } else {
        throw new Error(data.error || 'Failed to update PageKite tunnel.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to toggle PageKite tunnel.');
    } finally {
      setSavingPagekite(false);
    }
  };

  const tabs = [
    { id: 'store', label: 'Store & Counter', icon: Store },
    { id: 'pricing', label: 'Print Pricing', icon: DollarSign },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'station', label: 'Station & Kiosk', icon: QrCode },
    { id: 'factory', label: 'Factory Reset', icon: RotateCcw },
    ...(userRole === 'admin'
      ? [{ id: 'users', label: 'Staff & Users', icon: Users, badge: 'Admin' }]
      : []),
  ] as const;

  return (
    <div className="space-y-6 max-w-6xl mx-auto font-sans pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#1e1f26] p-6 rounded-3xl border border-white/10 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Station Settings & Configuration</h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Manage store profile, dynamic rate cards, payment receivers, and staff access.
            </p>
          </div>
        </div>

        {/* Global Save Button (for store, pricing, payments) */}
        {activeTab !== 'users' && activeTab !== 'station' && activeTab !== 'factory' && (
          <button
            onClick={activeTab === 'payments' ? handleSavePayments : handleSaveStoreAndPricing}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/30 transition-all cursor-pointer active:scale-95 disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        )}
      </div>

      {/* Status Alerts */}
      {saveSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-3 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span>Configuration saved successfully to SQLite and synchronized with customer kiosk.</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-3 animate-fade-in">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-[#141419] rounded-2xl border border-white/10 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {'badge' in tab && tab.badge && (
                <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* TAB 1: STORE & COUNTER */}
      {activeTab === 'store' && (
        <div className="bg-[#141419] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="border-b border-white/5 pb-4">
            <h2 className="text-sm font-bold text-white">Store Identity & Counter Location</h2>
            <p className="text-xs text-zinc-400">Printed on receipt headers and visible on customer mobile phones.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Shop / Store Name *</label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                placeholder="e.g. AutoPrint Express Store"
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Owner / Manager Name</label>
              <input
                type="text"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="e.g. Rajesh Kumar"
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Branch Name</label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="e.g. Campus Gate 1 Branch"
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Counter Number / Label</label>
              <input
                type="text"
                value={kioskNumber}
                onChange={(e) => setKioskNumber(e.target.value)}
                placeholder="e.g. Counter #01"
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono font-bold"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Physical Address / Pickup Point</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Shop 12, Student Activity Arcade, Campus Gate 1"
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Store Support Phone</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Default Target Hardware</label>
              <select
                value={selectedPrinter}
                onChange={(e) => setSelectedPrinter(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                {availablePrinters.length > 0 ? (
                  availablePrinters.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))
                ) : (
                  <option value="AutoPrint Virtual Spooler">AutoPrint Virtual Spooler</option>
                )}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: PRINT PRICING */}
      {activeTab === 'pricing' && (
        <div className="bg-[#141419] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="border-b border-white/5 pb-4">
            <h2 className="text-sm font-bold text-white">Dynamic Rate Card Matrix</h2>
            <p className="text-xs text-zinc-400">
              Set per-page pricing, duplex rates, photo rates, paper multipliers, and binding add-ons.
            </p>
          </div>

          {/* Core Page Rates */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* B&W Single & Duplex */}
            <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-3">
              <div className="text-xs font-bold text-zinc-200">Black & White (A4)</div>
              <div>
                <label className="text-[11px] text-zinc-400">Single-sided (₹/pg)</label>
                <input
                  type="number"
                  step="0.5"
                  value={bwSingle}
                  onChange={(e) => setBwSingle(Number(e.target.value))}
                  className="w-full px-3 py-1.5 mt-1 rounded-xl bg-[#141419] border border-white/10 text-xs font-bold text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400">Duplex (₹/side)</label>
                <input
                  type="number"
                  step="0.5"
                  value={bwDoublePerSide}
                  onChange={(e) => setBwDoublePerSide(Number(e.target.value))}
                  className="w-full px-3 py-1.5 mt-1 rounded-xl bg-[#141419] border border-white/10 text-xs font-bold text-white"
                />
              </div>
            </div>

            {/* Color Single & Duplex */}
            <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-3">
              <div className="text-xs font-bold text-blue-300">Full Color (A4)</div>
              <div>
                <label className="text-[11px] text-zinc-400">Single-sided (₹/pg)</label>
                <input
                  type="number"
                  step="0.5"
                  value={colorSingle}
                  onChange={(e) => setColorSingle(Number(e.target.value))}
                  className="w-full px-3 py-1.5 mt-1 rounded-xl bg-[#141419] border border-white/10 text-xs font-bold text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400">Duplex (₹/side)</label>
                <input
                  type="number"
                  step="0.5"
                  value={colorDoublePerSide}
                  onChange={(e) => setColorDoublePerSide(Number(e.target.value))}
                  className="w-full px-3 py-1.5 mt-1 rounded-xl bg-[#141419] border border-white/10 text-xs font-bold text-white"
                />
              </div>
            </div>

            {/* Photo Glossy */}
            <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-3">
              <div className="text-xs font-bold text-purple-300">Glossy HD Photo</div>
              <div>
                <label className="text-[11px] text-zinc-400">Photo Rate (₹/pg)</label>
                <input
                  type="number"
                  step="1"
                  value={photoGlossy}
                  onChange={(e) => setPhotoGlossy(Number(e.target.value))}
                  className="w-full px-3 py-1.5 mt-1 rounded-xl bg-[#141419] border border-white/10 text-xs font-bold text-white"
                />
              </div>
              <p className="text-[10px] text-zinc-500 mt-2">
                Applied when customer selects glossy photographic paper.
              </p>
            </div>
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-white/10 bg-black/30 p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={skipVerificationPage}
              onChange={(e) => setSkipVerificationPage(e.target.checked)}
              className="mt-1 h-4 w-4 accent-blue-500"
            />
            <span>
              <span className="block text-xs font-bold text-white">Do not print verification page</span>
              <span className="block mt-1 text-[11px] text-zinc-400">When unchecked, a black-and-white landscape verification page is added after the document.</span>
            </span>
          </label>

          {/* Finishing & Binding Add-ons */}
          <div className="pt-2">
            <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider text-[10px] mb-3">
              Finishing & Binding Add-ons:
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1">
                <label className="text-[11px] text-zinc-400">Stapling (₹)</label>
                <input
                  type="number"
                  value={stapleRate}
                  onChange={(e) => setStapleRate(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#141419] border border-white/10 text-xs font-bold text-white"
                />
              </div>

              <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1">
                <label className="text-[11px] text-zinc-400">Spiral Binding (₹)</label>
                <input
                  type="number"
                  value={spiralRate}
                  onChange={(e) => setSpiralRate(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#141419] border border-white/10 text-xs font-bold text-white"
                />
              </div>

              <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1">
                <label className="text-[11px] text-zinc-400">Hardcover Binding (₹)</label>
                <input
                  type="number"
                  value={hardcoverRate}
                  onChange={(e) => setHardcoverRate(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#141419] border border-white/10 text-xs font-bold text-white"
                />
              </div>

              <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1">
                <label className="text-[11px] text-zinc-400">Lamination (₹/sheet)</label>
                <input
                  type="number"
                  value={laminationRate}
                  onChange={(e) => setLaminationRate(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg bg-[#141419] border border-white/10 text-xs font-bold text-white"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PAYMENTS */}
      {activeTab === 'payments' && (
        <div className="bg-[#141419] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="border-b border-white/5 pb-4">
            <h2 className="text-sm font-bold text-white">Payment Receiver & UPI Gateway</h2>
            <p className="text-xs text-zinc-400">
              Configure your merchant UPI VPA, QR standee code, or Razorpay API keys.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Merchant UPI ID (VPA) *</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. autoprint.store@okaxis"
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">UPI Payee Business Name</label>
              <input
                type="text"
                value={upiPayeeName}
                onChange={(e) => setUpiPayeeName(e.target.value)}
                placeholder="e.g. AutoPrint Express Store"
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Razorpay Gateway Expansion */}
          <Disclosure
            title={
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-xs text-white">Online Gateway (Razorpay Integration)</span>
                <span className="text-[10px] font-normal text-zinc-400 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">Optional</span>
              </div>
            }
            defaultOpen={Boolean(razorpayKeyId)}
            className="w-full"
            headerClassName="p-4 rounded-2xl bg-black/40 border border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
            contentClassName="p-4 bg-black/30 rounded-2xl border border-white/5 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Razorpay Key ID</label>
              <input
                type="text"
                value={razorpayKeyId}
                onChange={(e) => setRazorpayKeyId(e.target.value)}
                placeholder="rzp_live_..."
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-300">Razorpay Secret</label>
              <input
                type="password"
                value={razorpayKeySecret}
                onChange={(e) => setRazorpayKeySecret(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <div className="sm:col-span-2 flex flex-wrap items-center gap-3 pt-1">
              <button
                type="button"
                onClick={handleCheckRazorpay}
                disabled={checkingRazorpay}
                className="inline-flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs font-bold text-blue-300 transition-colors hover:bg-blue-500/20 disabled:cursor-wait disabled:opacity-60"
              >
                {checkingRazorpay ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                {checkingRazorpay ? 'Checking Razorpay...' : 'Confirm Razorpay Integration'}
              </button>
              {razorpayCheck && <span className={`text-xs ${razorpayCheck.ok ? 'text-emerald-300' : 'text-rose-300'}`}>{razorpayCheck.message}</span>}
            </div>
          </Disclosure>
        </div>
      )}

      {activeTab === 'factory' && (
        <div className="bg-[#141419] border border-rose-500/25 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="border-b border-white/5 pb-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-rose-500/15 text-rose-300 flex items-center justify-center"><RotateCcw className="h-5 w-5" /></div>
            <div><h2 className="text-sm font-bold text-white">Factory Reset</h2><p className="text-xs text-zinc-400 mt-1">Reset AutoPrint to a clean installation state.</p></div>
          </div>
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 space-y-2">
            <p className="font-bold">Destructive operation — backup first.</p>
            <p>This removes merchant accounts, payment settings, print history, verification records, uploaded documents, sessions, and local operational state. Application binaries remain installed.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 text-xs">
            <div className="rounded-xl border border-white/10 bg-black/30 p-4"><h3 className="font-bold text-white mb-2">Reset includes</h3><ul className="list-disc list-inside space-y-1 text-zinc-400"><li>SQLite database and merchant users</li><li>Jobs, payments, audits, and codes</li><li>Uploaded and processed documents</li><li>Runtime queue and sessions</li></ul></div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-4"><h3 className="font-bold text-white mb-2">Preserved</h3><ul className="list-disc list-inside space-y-1 text-zinc-400"><li>Application binaries and source</li><li>Configuration templates</li><li>Backups made before reset</li></ul></div>
          </div>
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4 text-xs text-blue-200">Stop AutoPrint, create a backup, then run:<code className="block mt-2 rounded-lg bg-black/40 p-3 font-mono text-blue-100">npm run reset</code><span className="block mt-2 text-blue-300/80">The command requires explicit confirmation. Use --force only for controlled deployments.</span></div>
        </div>
      )}

      {/* TAB 4: STATION & KIOSK */}
      {activeTab === 'station' && (
        <div className="bg-[#141419] border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="border-b border-white/5 pb-4">
            <h2 className="text-sm font-bold text-white">Station & Customer Kiosk Controls</h2>
            <p className="text-xs text-zinc-400">
              Manage shop visibility, copy public portal URLs, and inspect the standee QR.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
            <div className="space-y-4">
              <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-2">
                <div className="text-xs text-zinc-400 font-semibold">Live Customer Portal URL:</div>
                <div className="font-mono text-xs text-blue-300 bg-black/50 p-2.5 rounded-xl border border-white/5 select-all">
                  {kioskUrl}
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleCopyKioskLink}
                    className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-200 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copiedKioskUrl ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedKioskUrl ? 'Copied URL' : 'Copy Customer Link'}</span>
                  </button>
                  <a
                    href={kioskUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="py-2 px-3 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-xs font-bold text-blue-300 hover:text-white flex items-center justify-center gap-1.5 transition-all"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Open Kiosk</span>
                  </a>
                </div>
              </div>

              <div className="p-4 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Order Receiving Status</div>
                  <div className="text-[11px] text-zinc-400">
                    {isOnline ? 'Kiosk is currently open for print jobs' : 'Kiosk is paused'}
                  </div>
                </div>
                <button
                  onClick={onToggleOnline}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    isOnline
                      ? 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  {isOnline ? 'Pause Kiosk' : 'Open Kiosk'}
                </button>
              </div>
            </div>

            {/* Standee QR Preview */}
            <div className="p-6 bg-gradient-to-b from-white to-[#ede8f5] rounded-3xl text-gray-900 shadow-xl border-4 border-white/20 max-w-[260px] mx-auto text-center">
              <div className="text-[10px] font-black uppercase tracking-widest text-[#381E72] mb-1">
                AUTOPRINT PHYSICAL STANDEE
              </div>
              <div className="text-xs font-black text-gray-900 leading-tight mb-2 truncate">
                {shopName || 'AutoPrint Store'}
              </div>
              <div className="bg-white p-2.5 rounded-2xl shadow-inner border border-gray-200 inline-block mb-2">
                {qrCodeDataUrl ? (
                  <img src={qrCodeDataUrl} alt="Kiosk QR" className="w-36 h-36 object-contain rounded-lg" />
                ) : (
                  <div className="w-36 h-36 bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                    QR Ready
                  </div>
                )}
              </div>
              <div className="text-[10px] font-bold text-gray-700 uppercase tracking-wider">
                {kioskNumber} • SCAN TO PRINT
              </div>
              <button
                type="button"
                onClick={handlePrintStandee}
                disabled={!qrCodeDataUrl}
                className="mt-4 w-full rounded-xl bg-[#381E72] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#4b2a91] disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                Print QR Standee
              </button>
            </div>
          </div>

          {/* PageKite Remote Access Configuration Card */}
          <div className="pt-6 border-t border-white/5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">Remote Customer Access (PageKite Tunnel)</h3>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      pagekiteStatus === 'CONNECTED'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : pagekiteStatus === 'CONNECTING'
                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        : pagekiteStatus === 'ERROR'
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-zinc-800 text-zinc-400 border-white/5'
                    }`}
                  >
                    {pagekiteStatus}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                  Expose your kiosk server to the web so remote customers can upload print files from anywhere.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="btn-verify-pagekite"
                  onClick={handleVerifyPageKite}
                  disabled={verifyingPagekite || !pagekiteSubdomain.trim() || !pagekiteSecret.trim()}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:pointer-events-none text-xs font-bold text-white flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${verifyingPagekite ? 'animate-spin' : ''}`} />
                  <span>{verifyingPagekite ? 'Testing Connection...' : 'Verify Tunnel'}</span>
                </button>

                <button
                  type="button"
                  id="btn-toggle-pagekite"
                  onClick={() => handleTogglePageKite(pagekiteStatus !== 'CONNECTED' && pagekiteStatus !== 'CONNECTING')}
                  disabled={savingPagekite || verifyingPagekite || !pagekiteSubdomain.trim() || !pagekiteSecret.trim()}
                  className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    pagekiteStatus === 'CONNECTED' || pagekiteStatus === 'CONNECTING'
                      ? 'bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>
                    {pagekiteStatus === 'CONNECTED' || pagekiteStatus === 'CONNECTING'
                      ? 'Stop Tunnel'
                      : 'Start Tunnel'}
                  </span>
                </button>
              </div>
            </div>

            {/* Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-black/40 p-5 rounded-2xl border border-white/5">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-zinc-400" />
                  Kite Subdomain (Kite Name) *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500 select-none">
                    https://
                  </span>
                  <input
                    type="text"
                    id="input-pagekite-subdomain"
                    value={pagekiteSubdomain}
                    onChange={(e) => setPagekiteSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                    placeholder="yourshop"
                    className="w-full pl-20 pr-28 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-mono text-zinc-500 select-none">
                    .pagekite.me
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500">
                  Must match the Kite registered on your pagekite.net dashboard.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-zinc-400" />
                  PageKite Secret Key *
                </label>
                <div className="relative">
                  <input
                    type={showSecret ? 'text' : 'password'}
                    id="input-pagekite-secret"
                    value={pagekiteSecret}
                    onChange={(e) => setPagekiteSecret(e.target.value)}
                    placeholder="Enter kite secret key"
                    className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-black/50 border border-white/10 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white cursor-pointer"
                  >
                    {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-zinc-500">
                  Find your secret key in your account email or at pagekite.net/xml/
                </p>
              </div>
            </div>

            {/* Verification & Tunnel Feedback */}
            {verifyResult && (
              <div
                className={`p-4 rounded-2xl border flex items-start gap-3 transition-all ${
                  verifyResult.success
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                }`}
              >
                {verifyResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                )}
                <div className="text-xs space-y-1">
                  <div className="font-bold">
                    {verifyResult.success ? 'PageKite Verified Successfully' : 'PageKite Verification Failed'}
                  </div>
                  <div className="text-zinc-300 font-mono text-[11px] leading-relaxed">
                    {verifyResult.message}
                  </div>
                </div>
              </div>
            )}

            {pagekiteError && !verifyResult && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-200 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-bold">PageKite Tunnel Error</div>
                  <div className="text-zinc-300 text-[11px] mt-0.5 font-mono">{pagekiteError}</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: STAFF & USERS (Admin Only) */}
      {activeTab === 'users' && userRole === 'admin' && (
        <UserManagementView currentUserId={currentUserId} />
      )}
    </div>
  );
};
