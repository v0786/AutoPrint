import React, { useState, useEffect } from 'react';
import {
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Laptop,
  Check,
  RefreshCw,
  FileText,
  Cloud,
  CloudOff,
  Store,
  Fingerprint,
  DollarSign,
  CreditCard,
  QrCode,
  Download,
  Copy,
} from 'lucide-react';
import { apiFetch } from '../../utils/api';

interface FirstRunOnboardingProps {
  onSetupComplete: (token: string, merchant: any) => void;
  onGoToLogin?: () => void;
}

type OnboardingStep =
  | 'welcome'
  | 'storeInfo'
  | 'identity'
  | 'printerSelect'
  | 'testPrint'
  | 'configureRates'
  | 'configurePayment'
  | 'cloudActivation'
  | 'storeQr'
  | 'complete';

interface DetectedPrinter {
  id: string;
  name: string;
  isDefault: boolean;
  isOnline: boolean;
  driverName?: string;
  portName?: string;
}

export const FirstRunOnboarding: React.FC<FirstRunOnboardingProps> = ({
  onSetupComplete,
  onGoToLogin,
}) => {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // ─── Step 2: Store Information ─────────────────────────────────────────────
  const [fullName, setFullName] = useState<string>('');
  const [shopName, setShopName] = useState<string>('');
  const [mobileNumber, setMobileNumber] = useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [rememberMe, setRememberMe] = useState<boolean>(true);

  // ─── Session State ─────────────────────────────────────────────────────────
  const [createdSession, setCreatedSession] = useState<{
    token: string;
    merchant: any;
  } | null>(null);

  // ─── Step 4: Printer Detection ─────────────────────────────────────────────
  const [printers, setPrinters] = useState<DetectedPrinter[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('AutoPrint System Spooler');
  const [detectingPrinters, setDetectingPrinters] = useState<boolean>(false);

  // ─── Step 5: Test Print ────────────────────────────────────────────────────
  const [testPrintState, setTestPrintState] = useState<'idle' | 'printing' | 'success' | 'error'>('idle');
  const [testPrintMsg, setTestPrintMsg] = useState<string>('');

  // ─── Step 6: Rates Configuration ───────────────────────────────────────────
  const [bwSingle, setBwSingle] = useState<number>(2.0);
  const [bwDoublePerSide, setBwDoublePerSide] = useState<number>(1.5);
  const [colorSingle, setColorSingle] = useState<number>(10.0);
  const [colorDoublePerSide, setColorDoublePerSide] = useState<number>(8.0);

  // ─── Step 7: Payment Configuration ─────────────────────────────────────────
  const [paymentChoice, setPaymentChoice] = useState<'CASH_ONLY' | 'UPI_DIRECT'>('CASH_ONLY');
  const [upiId, setUpiId] = useState<string>('');

  // ─── Step 8: Cloud Activation ──────────────────────────────────────────────
  const [cloudStatus, setCloudStatus] = useState<'OFFLINE' | 'ONLINE'>('OFFLINE');
  const [activationCode, setActivationCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState<boolean>(false);

  // ─── Step 9: Store QR ──────────────────────────────────────────────────────
  const [storeQrDataUrl, setStoreQrDataUrl] = useState<string | null>(null);
  const [storeUrl, setStoreUrl] = useState<string>('');
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);

  // Validation for Step 2
  const validateStoreInfo = (): boolean => {
    setErrorMessage(null);
    if (!fullName.trim() || fullName.trim().length < 2) {
      setErrorMessage('Full Name is required (at least 2 characters).');
      return false;
    }
    if (!shopName.trim() || shopName.trim().length < 2) {
      setErrorMessage('Shop / Store Name is required (at least 2 characters).');
      return false;
    }
    if (!mobileNumber.trim() || mobileNumber.trim().length < 7) {
      setErrorMessage('Mobile / Phone Number is required.');
      return false;
    }
    const cleanEmail = email.trim();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return false;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return false;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return false;
    }
    return true;
  };

  // Submit Step 2
  const handleStoreInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStoreInfo()) return;

    setErrorMessage(null);
    setLoading(true);

    try {
      const res = await apiFetch('/api/setup/create-first-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          shopName: shopName.trim(),
          mobileNumber: mobileNumber.trim(),
          email: email.trim().toLowerCase(),
          username: username.trim() ? username.trim().toLowerCase() : email.trim().split('@')[0],
          password,
          confirmPassword,
          rememberMe,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        if (res.status === 403 || json.error?.includes('already been completed')) {
          setErrorMessage('AutoPrint setup has already been completed. Please proceed to sign in.');
          return;
        }
        throw new Error(json.error || 'Failed to create merchant account. Please try again.');
      }

      try {
        localStorage.setItem('autoprint_merchant_session_token', json.data.token);
      } catch {}

      setCreatedSession({
        token: json.data.token,
        merchant: json.data.merchant,
      });

      setCurrentStep('identity');
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during setup.');
    } finally {
      setLoading(false);
    }
  };

  // Detect printers
  const fetchPrinters = async () => {
    setDetectingPrinters(true);
    try {
      const res = await apiFetch('/api/printers?refresh=true');
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        setPrinters(json.data);
        const def = json.data.find((p: DetectedPrinter) => p.isDefault) || json.data[0];
        if (def) {
          setSelectedPrinter(def.name);
        }
      }
    } catch (err) {
      console.warn('Printer detection failed:', err);
    } finally {
      setDetectingPrinters(false);
    }
  };

  const handleProceedToPrinters = () => {
    setCurrentStep('printerSelect');
    fetchPrinters();
  };

  // Confirm printer selection
  const handleConfirmPrinter = async () => {
    setLoading(true);
    try {
      await apiFetch('/api/merchant/printer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printerName: selectedPrinter }),
      });
      setCurrentStep('testPrint');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to configure printer.');
    } finally {
      setLoading(false);
    }
  };

  // Hardware Test Print
  const handleTriggerTestPrint = async () => {
    setTestPrintState('printing');
    setTestPrintMsg('Generating diagnostic test page and sending to spooler...');
    try {
      const res = await apiFetch('/api/printers/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printerName: selectedPrinter }),
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setTestPrintState('success');
        setTestPrintMsg(
          json.data?.message || `Diagnostic page successfully dispatched to ${selectedPrinter}!`
        );
      } else {
        setTestPrintState('error');
        setTestPrintMsg(json.error || 'Failed to dispatch test print.');
      }
    } catch (err: any) {
      setTestPrintState('error');
      setTestPrintMsg(err.message || 'Error communicating with print spooler.');
    }
  };

  // Save Rates
  const handleSaveRates = async () => {
    setLoading(true);
    try {
      await apiFetch('/api/merchant/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rates: {
            bwSingle: Number(bwSingle),
            bwDoublePerSide: Number(bwDoublePerSide),
            colorSingle: Number(colorSingle),
            colorDoublePerSide: Number(colorDoublePerSide),
          },
        }),
      });
      setCurrentStep('configurePayment');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save print pricing.');
    } finally {
      setLoading(false);
    }
  };

  // Save Payment
  const handleSavePayment = async () => {
    setLoading(true);
    try {
      if (paymentChoice === 'UPI_DIRECT' && upiId.trim()) {
        await apiFetch('/api/merchant/payment-receiver', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            provider: 'UPI_DIRECT',
            upiId: upiId.trim(),
            upiPayeeName: shopName.trim(),
          }),
        });
      }
      setCurrentStep('cloudActivation');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save payment configuration.');
    } finally {
      setLoading(false);
    }
  };

  // Generate Cloud Pairing Code
  const handleGenerateActivationCode = async () => {
    setGeneratingCode(true);
    try {
      const res = await apiFetch('/api/cloud/activation/code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        setActivationCode(json.data.code);
      } else {
        setErrorMessage(json.error || 'Could not generate cloud pairing code.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to connect to cloud activation service.');
    } finally {
      setGeneratingCode(false);
    }
  };

  // Load Store QR before displaying Step 9
  const handleProceedToStoreQr = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/config/public');
      const json = await res.json();
      if (json.ok && json.data) {
        setStoreQrDataUrl(json.data.qrCodeDataUrl || null);
        setStoreUrl(json.data.kioskUrl || `http://localhost:7000/store/${merchantId}`);
      }
      setCurrentStep('storeQr');
    } catch {
      setCurrentStep('storeQr');
    } finally {
      setLoading(false);
    }
  };

  // Standee Print in Step 9
  const handlePrintStandee = () => {
    if (!storeQrDataUrl) return;
    const printWindow = window.open('', '_blank', 'width=850,height=1000');
    if (!printWindow) return;
    const safeShopName = (shopName || 'AutoPrint Store').replace(/[<>&\"]/g, '');
    printWindow.document.write(`<!doctype html><html><head><title>AutoPrint QR Standee</title><style>
      @page{size:A4 portrait;margin:0}*{box-sizing:border-box}body{margin:0;background:#fff;color:#111;font-family:Arial,sans-serif;text-align:center}
      .page{width:210mm;min-height:297mm;padding:24mm 18mm;display:flex;align-items:center;justify-content:center}.card{width:100%;border:3px solid #381e72;border-radius:18px;padding:18mm 12mm}.brand{font-size:18px;font-weight:800;letter-spacing:3px;color:#381e72}.shop{font-size:30px;font-weight:800;margin:10mm 0 4mm}.qr{width:125mm;height:125mm;object-fit:contain;border:1px solid #ddd;padding:5mm}.counter{font-size:22px;font-weight:700;letter-spacing:2px;margin-top:8mm}.url{font-size:12px;color:#555;margin-top:4mm;word-break:break-all}@media print{.page{min-height:100vh}}
    </style></head><body><main class="page"><section class="card"><div class="brand">AUTOPRINT</div><div class="shop">${safeShopName}</div><img class="qr" src="${storeQrDataUrl}"/><div class="counter">SCAN TO PRINT</div><div class="url">${storeUrl}</div></section></main><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script></body></html>`);
    printWindow.document.close();
  };

  const handleDownloadQr = () => {
    if (!storeQrDataUrl) return;
    const a = document.createElement('a');
    a.href = storeQrDataUrl;
    a.download = `autoprint-store-qr-${merchantId}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopyUrl = () => {
    if (!storeUrl) return;
    navigator.clipboard.writeText(storeUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleOpenDashboard = () => {
    if (createdSession) {
      onSetupComplete(createdSession.token, createdSession.merchant);
    }
  };

  useEffect(() => {
    apiFetch('/api/cloud/status')
      .then((res) => res.json())
      .then((json) => {
        if (json.ok && json.status === 'ONLINE') {
          setCloudStatus('ONLINE');
        }
      })
      .catch(() => {});
  }, []);

  const merchantId = createdSession?.merchant?.merchantId || 'AP-M001';
  const deviceId = createdSession?.merchant?.deviceId || 'DEV-001';
  const installationId = createdSession?.merchant?.installationId || 'INST-LOCAL';

  const stepList: OnboardingStep[] = [
    'welcome',
    'storeInfo',
    'identity',
    'printerSelect',
    'testPrint',
    'configureRates',
    'configurePayment',
    'cloudActivation',
    'storeQr',
    'complete',
  ];
  const stepIndex = stepList.indexOf(currentStep);

  return (
    <div className="min-h-screen bg-[#0d0e12] text-white flex flex-col justify-center items-center p-4 sm:p-6 font-sans relative overflow-hidden selection:bg-blue-600 selection:text-white">
      {/* Background Ambience */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[580px] h-[360px] bg-gradient-to-tr from-blue-600/10 via-indigo-600/15 to-purple-600/10 blur-[130px] pointer-events-none -z-0" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-500/5 blur-[120px] pointer-events-none -z-0" />

      {/* Progress Bar */}
      {currentStep !== 'welcome' && currentStep !== 'complete' && (
        <div className="w-full max-w-xl mb-6 flex items-center justify-between relative px-2">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-zinc-400">
            <span className="text-blue-400">Step {stepIndex} of 8</span>
            <span className="text-zinc-600">•</span>
            <span className="capitalize text-zinc-300">
              {currentStep === 'storeInfo' && 'Store Information'}
              {currentStep === 'identity' && 'Merchant Identity'}
              {currentStep === 'printerSelect' && 'Printer Detection'}
              {currentStep === 'testPrint' && 'Hardware Test Print'}
              {currentStep === 'configureRates' && 'Print Pricing'}
              {currentStep === 'configurePayment' && 'Payment Setup'}
              {currentStep === 'cloudActivation' && 'Optional Cloud Sync'}
              {currentStep === 'storeQr' && 'Store QR Standee'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === stepIndex
                    ? 'w-6 bg-blue-500 shadow-sm shadow-blue-500/50'
                    : i < stepIndex
                    ? 'w-2 bg-emerald-500'
                    : 'w-2 bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>
      )}

      {/* Main Container Card */}
      <div className="w-full max-w-xl bg-[#14161f]/90 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl p-8 sm:p-10 relative z-10 transition-all duration-300">
        {/* Error Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-sm animate-in fade-in duration-200">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">{errorMessage}</p>
              {errorMessage.includes('already been completed') && onGoToLogin && (
                <button
                  type="button"
                  onClick={onGoToLogin}
                  className="mt-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Go to Sign In
                </button>
              )}
            </div>
          </div>
        )}

        {/* ─── 1. WELCOME ────────────────────────────────────────────────── */}
        {currentStep === 'welcome' && (
          <div className="text-center py-2 animate-in fade-in zoom-in-95 duration-300">
            <div className="relative inline-flex items-center justify-center mb-6">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-blue-600/30 ring-4 ring-white/10">
                <Printer className="w-10 h-10 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#14161f] flex items-center justify-center text-white">
                <Sparkles className="w-3 h-3" />
              </div>
            </div>

            <h1 className="text-3xl font-extrabold text-white tracking-tight mb-2">
              AutoPrint Express
            </h1>
            <p className="text-sm font-medium text-blue-400 mb-6 uppercase tracking-wider">
              Print-Shop Operating System (v2.0.0)
            </p>

            <p className="text-sm text-zinc-300 leading-relaxed mb-8 max-w-md mx-auto">
              Autonomous, local-first print station. Runs 100% offline without internet,
              Vercel, or external servers. Complete setup in under 2 minutes.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-8 text-left">
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-xs font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  V1 Offline Engine
                </div>
                <div className="text-[11px] text-zinc-400">
                  Local kiosk, SQLite queue, and physical printer dispatch work autonomously without network.
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="text-xs font-bold text-cyan-400 mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                  V2 Cloud Sync
                </div>
                <div className="text-[11px] text-zinc-400">
                  Optional central customer web link with SHA-256 verification and Realtime pickup codes.
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setCurrentStep('storeInfo');
              }}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-500 active:scale-[0.99] transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 group"
            >
              <span>Begin First-Time Setup</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {onGoToLogin && (
              <div className="mt-5 text-center">
                <button
                  type="button"
                  onClick={onGoToLogin}
                  className="text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                >
                  Already initialized? <span className="text-blue-400 underline">Sign in to Merchant Desk</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ─── 2. STORE INFORMATION ──────────────────────────────────────── */}
        {currentStep === 'storeInfo' && (
          <form onSubmit={handleStoreInfoSubmit} className="animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-left mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3">
                <Store className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Store Information</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Enter your print shop details and administrator account credentials.
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                  Print Shop / Store Name <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g. Apex Print & Xerox Hub"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#0e1017] border border-white/10 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Owner Full Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Rajesh Sharma"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0e1017] border border-white/10 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Mobile Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={mobileNumber}
                    onChange={(e) => setMobileNumber(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0e1017] border border-white/10 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Email Address <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@printshop.com"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0e1017] border border-white/10 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Username <span className="text-zinc-500">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="e.g. admin"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0e1017] border border-white/10 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Password <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl bg-[#0e1017] border border-white/10 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                    Confirm Password <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-4 py-2.5 rounded-xl bg-[#0e1017] border border-white/10 text-white text-sm placeholder-zinc-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 pt-1 cursor-pointer select-none text-xs text-zinc-300">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-zinc-700 text-blue-600 bg-[#0d0e12] focus:ring-blue-500"
                />
                <span>Remember this workstation session (Keep operator logged in)</span>
              </label>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep('welcome')}
                className="py-3 px-4 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-6 rounded-xl font-semibold text-sm text-white bg-blue-600 hover:bg-blue-500 active:scale-[0.99] transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Create Account & Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* ─── 3. MERCHANT IDENTITY ──────────────────────────────────────── */}
        {currentStep === 'identity' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 text-left">
            <div className="mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                <Fingerprint className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Merchant & Device Identity</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Your store identity is permanent and stored in the local SQLite engine.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">
                  Store Identity (Shared Across Devices)
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white">{shopName}</span>
                  <span className="px-2.5 py-1 rounded bg-blue-600/20 text-blue-300 font-mono text-xs font-semibold">
                    {merchantId}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">
                    Device ID
                  </div>
                  <span className="text-xs font-mono text-emerald-400 font-bold">{deviceId}</span>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold mb-1">
                    Installation ID
                  </div>
                  <span className="text-xs font-mono text-zinc-300">{installationId.slice(0, 16)}...</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2.5 text-xs text-blue-200">
                <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">
                  Strict Merchant Isolation: Devices sharing <strong>{merchantId}</strong> only process
                  jobs for this store. Reboots and hardware replacements preserve this identity.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleProceedToPrinters}
              className="w-full py-3 px-6 rounded-xl font-semibold text-sm text-white bg-blue-600 hover:bg-blue-500 active:scale-[0.99] transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
            >
              <span>Next: Detect Printers</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ─── 4. PRINTER DETECTION ───────────────────────────────────────── */}
        {currentStep === 'printerSelect' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 text-left">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Printer Detection</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Select your physical or default thermal/laser printer.
                </p>
              </div>
              <button
                type="button"
                onClick={fetchPrinters}
                disabled={detectingPrinters}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 transition-colors flex items-center gap-1.5 text-xs font-medium"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${detectingPrinters ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            <div className="space-y-2 mb-6 max-h-64 overflow-y-auto pr-1">
              {printers.length === 0 ? (
                <div className="p-6 rounded-xl bg-white/[0.02] border border-white/5 text-center">
                  <Printer className="w-8 h-8 text-zinc-500 mx-auto mb-2" />
                  <p className="text-xs text-zinc-400">
                    {detectingPrinters
                      ? 'Scanning system printers...'
                      : 'Defaulting to AutoPrint System Spooler'}
                  </p>
                </div>
              ) : (
                printers.map((p) => {
                  const isSelected = selectedPrinter === p.name;
                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPrinter(p.name)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-blue-600/10 border-blue-500 text-white shadow-sm'
                          : 'bg-[#0e1017] border-white/10 text-zinc-300 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            isSelected ? 'bg-blue-600 text-white' : 'bg-white/5 text-zinc-400'
                          }`}
                        >
                          <Printer className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold flex items-center gap-2">
                            <span>{p.name}</span>
                            {p.isDefault && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-medium">
                                Windows Default
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            {p.driverName || p.portName || 'System Print Spooler'}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-[11px] text-zinc-400">Ready</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep('identity')}
                className="py-3 px-4 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmPrinter}
                className="flex-1 py-3 px-6 rounded-xl font-semibold text-sm text-white bg-blue-600 hover:bg-blue-500 active:scale-[0.99] transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Confirm Default Printer</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ─── 5. HARDWARE TEST PRINT ────────────────────────────────────── */}
        {currentStep === 'testPrint' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 text-left">
            <div className="mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-3">
                <FileText className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Test Print Verification</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Verify physical print dispatch to <strong>{selectedPrinter}</strong>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 mb-6 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Target Spooler:</span>
                <span className="font-semibold text-white">{selectedPrinter}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Document Type:</span>
                <span className="text-zinc-300">1-Page Diagnostic Self-Test (A4)</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Verification Engine:</span>
                <span className="text-emerald-400 font-medium">8-Digit PIN Idempotent Desk</span>
              </div>

              {testPrintMsg && (
                <div
                  className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                    testPrintState === 'success'
                      ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
                      : testPrintState === 'error'
                      ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
                      : 'bg-blue-500/10 border border-blue-500/20 text-blue-300'
                  }`}
                >
                  {testPrintState === 'printing' && (
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
                  )}
                  {testPrintState === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                  {testPrintState === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{testPrintMsg}</span>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button
                type="button"
                disabled={testPrintState === 'printing'}
                onClick={handleTriggerTestPrint}
                className="w-full py-3 px-6 rounded-xl font-semibold text-sm text-white bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] transition-all shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4" />
                <span>{testPrintState === 'success' ? 'Print Test Page Again' : 'Send Test Print'}</span>
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setCurrentStep('printerSelect')}
                  className="py-2.5 px-4 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Change Printer
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentStep('configureRates')}
                  className="flex-1 py-2.5 px-4 rounded-xl font-semibold text-xs text-white bg-white/10 hover:bg-white/15 transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Next: Configure Rates</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─── 6. CONFIGURE RATES ────────────────────────────────────────── */}
        {currentStep === 'configureRates' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 text-left">
            <div className="mb-6">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
                <DollarSign className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Configure Print Rates</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Set baseline printing rates per page (in INR). These can be modified anytime in Settings.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-300">B/W Single Sided</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">₹</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={bwSingle}
                    onChange={(e) => setBwSingle(parseFloat(e.target.value) || 2)}
                    className="w-full pl-7 pr-3 py-2 rounded-lg bg-[#0e1017] border border-white/10 text-white text-sm font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="text-[10px] text-zinc-500">Standard A4 page</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-300">B/W Double Sided</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">₹</span>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={bwDoublePerSide}
                    onChange={(e) => setBwDoublePerSide(parseFloat(e.target.value) || 1.5)}
                    className="w-full pl-7 pr-3 py-2 rounded-lg bg-[#0e1017] border border-white/10 text-white text-sm font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="text-[10px] text-zinc-500">Per side duplex</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-300">Color Single Sided</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">₹</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={colorSingle}
                    onChange={(e) => setColorSingle(parseFloat(e.target.value) || 10)}
                    className="w-full pl-7 pr-3 py-2 rounded-lg bg-[#0e1017] border border-white/10 text-white text-sm font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="text-[10px] text-zinc-500">Standard color page</div>
              </div>

              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-1.5">
                <label className="block text-xs font-semibold text-zinc-300">Color Double Sided</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">₹</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={colorDoublePerSide}
                    onChange={(e) => setColorDoublePerSide(parseFloat(e.target.value) || 8)}
                    className="w-full pl-7 pr-3 py-2 rounded-lg bg-[#0e1017] border border-white/10 text-white text-sm font-semibold focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="text-[10px] text-zinc-500">Per side duplex</div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep('testPrint')}
                className="py-3 px-4 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleSaveRates}
                className="flex-1 py-3 px-6 rounded-xl font-semibold text-sm text-white bg-blue-600 hover:bg-blue-500 active:scale-[0.99] transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Save Rates & Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ─── 7. CONFIGURE PAYMENT ──────────────────────────────────────── */}
        {currentStep === 'configurePayment' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 text-left">
            <div className="mb-6">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-3">
                <CreditCard className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Configure Payment Mode</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Choose how customers pay for orders at your print station.
              </p>
            </div>

            <div className="space-y-3 mb-6">
              <div
                onClick={() => setPaymentChoice('CASH_ONLY')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  paymentChoice === 'CASH_ONLY'
                    ? 'bg-blue-600/10 border-blue-500 text-white'
                    : 'bg-[#0e1017] border-white/10 text-zinc-300 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-sm">Cash at Counter (Duty Desk)</div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-medium">
                    Recommended
                  </span>
                </div>
                <div className="text-xs text-zinc-400 mt-1">
                  Customer submits document at kiosk; counter staff collects cash and confirms handover via 8-digit pickup key.
                </div>
              </div>

              <div
                onClick={() => setPaymentChoice('UPI_DIRECT')}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  paymentChoice === 'UPI_DIRECT'
                    ? 'bg-blue-600/10 border-blue-500 text-white'
                    : 'bg-[#0e1017] border-white/10 text-zinc-300 hover:border-white/20'
                }`}
              >
                <div className="font-semibold text-sm">UPI Direct QR Payment</div>
                <div className="text-xs text-zinc-400 mt-1 mb-2">
                  Customer scans dynamic UPI QR to pay directly into your store's bank account.
                </div>

                {paymentChoice === 'UPI_DIRECT' && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Store UPI ID / VPA <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. yourstore@okhdfcbank"
                      className="w-full px-3 py-2 rounded-lg bg-[#14161f] border border-white/15 text-white text-xs font-mono placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep('configureRates')}
                className="py-3 px-4 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={handleSavePayment}
                className="flex-1 py-3 px-6 rounded-xl font-semibold text-sm text-white bg-blue-600 hover:bg-blue-500 active:scale-[0.99] transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Continue</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ─── 8. OPTIONAL CLOUD ACTIVATION ──────────────────────────────── */}
        {currentStep === 'cloudActivation' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 text-left">
            <div className="mb-6">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-3">
                <Cloud className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Optional Cloud Activation</h2>
              <p className="text-xs text-zinc-400 mt-1">
                V1 local printing is completely operational. Cloud sync (V2) connects your central customer web portal.
              </p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {cloudStatus === 'ONLINE' ? (
                    <Cloud className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <CloudOff className="w-5 h-5 text-amber-400" />
                  )}
                  <div>
                    <div className="text-xs font-semibold text-white">
                      {cloudStatus === 'ONLINE' ? 'Cloud Connected' : 'Local-Only Mode (Offline)'}
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      {cloudStatus === 'ONLINE'
                        ? 'Synced with Supabase central hub'
                        : 'Local customer kiosk & desk continue working autonomously'}
                    </div>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold tracking-wide ${
                    cloudStatus === 'ONLINE'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {cloudStatus}
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                <div className="text-xs font-semibold text-white mb-1">
                  Connect Station to Central Web
                </div>
                <p className="text-[11px] text-zinc-400 mb-3 leading-relaxed">
                  Generate a zero-config 8-character pairing code to connect this workstation to your
                  central customer web storefront.
                </p>

                {activationCode ? (
                  <div className="p-3 rounded-lg bg-blue-600/15 border border-blue-500/30 text-center">
                    <div className="text-[10px] uppercase font-bold text-blue-300 tracking-wider mb-1">
                      Your Device Pairing Code
                    </div>
                    <div className="text-xl font-mono font-extrabold text-white tracking-widest">
                      {activationCode}
                    </div>
                    <div className="text-[10px] text-zinc-400 mt-1">Valid for 15 minutes</div>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={generatingCode}
                    onClick={handleGenerateActivationCode}
                    className="w-full py-2.5 px-4 rounded-lg bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors flex items-center justify-center gap-2"
                  >
                    {generatingCode ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Generate Pairing Code</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep('configurePayment')}
                className="py-3 px-4 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleProceedToStoreQr}
                className="flex-1 py-3 px-6 rounded-xl font-semibold text-sm text-white bg-blue-600 hover:bg-blue-500 active:scale-[0.99] transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
              >
                <span>Next: Store QR Standee</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─── 9. STORE QR STANDEE ───────────────────────────────────────── */}
        {currentStep === 'storeQr' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300 text-left">
            <div className="mb-5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-2">
                <QrCode className="w-5 h-5" />
              </div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Your Store QR Code</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Permanent QR representing your store. Customers scan this QR to upload documents.
              </p>
            </div>

            {/* Standee Card */}
            <div className="p-5 bg-gradient-to-b from-white to-[#ede8f5] rounded-2xl text-gray-900 shadow-xl border-2 border-white/20 max-w-[240px] mx-auto text-center mb-5">
              <div className="text-[9px] font-black uppercase tracking-widest text-[#381E72] mb-1">
                AUTOPRINT STANDEE
              </div>
              <div className="text-xs font-bold text-gray-900 truncate mb-2">
                {shopName || 'AutoPrint Store'}
              </div>
              <div className="bg-white p-2 rounded-xl border border-gray-200 inline-block mb-2">
                {storeQrDataUrl ? (
                  <img src={storeQrDataUrl} alt="Store QR" className="w-32 h-32 object-contain" />
                ) : (
                  <div className="w-32 h-32 bg-gray-100 flex items-center justify-center text-xs text-gray-400 font-mono">
                    {merchantId}
                  </div>
                )}
              </div>
              <div className="text-[9px] font-bold text-gray-700 tracking-wider">
                SCAN TO PRINT
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-2 mb-5">
              <button
                type="button"
                onClick={handlePrintStandee}
                disabled={!storeQrDataUrl}
                className="w-full py-2.5 rounded-xl bg-[#381E72] hover:bg-[#4b2a91] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print QR Standee</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  disabled={!storeQrDataUrl}
                  className="py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </button>
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="py-2 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedUrl ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setCurrentStep('cloudActivation')}
                className="py-3 px-4 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep('complete')}
                className="flex-1 py-3 px-6 rounded-xl font-semibold text-sm text-white bg-blue-600 hover:bg-blue-500 active:scale-[0.99] transition-all shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2"
              >
                <span>Complete Onboarding</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ─── 10. ALL SET / DASHBOARD READY ─────────────────────────────── */}
        {currentStep === 'complete' && (
          <div className="text-center py-2 animate-in fade-in zoom-in-95 duration-400">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto mb-5 shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>

            <h2 className="text-3xl font-extrabold text-white tracking-tight mb-2">
              AutoPrint Ready! 🎉
            </h2>
            <p className="text-sm font-medium text-zinc-300 mb-6">
              Your print-shop operating system is configured and active.
            </p>

            <div className="grid grid-cols-3 gap-2.5 mb-6 text-left">
              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Printer
                </div>
                <div className="text-[11px] text-emerald-400 font-medium">Ready</div>
                <div className="text-[10px] text-zinc-500 truncate mt-0.5">{selectedPrinter}</div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Local Print
                </div>
                <div className="text-[11px] text-emerald-400 font-medium">Operational</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">SQLite Spooler</div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white mb-0.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      cloudStatus === 'ONLINE' ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  Cloud
                </div>
                <div
                  className={`text-[11px] font-medium ${
                    cloudStatus === 'ONLINE' ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {cloudStatus === 'ONLINE' ? 'Online' : 'Offline (V1)'}
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5">
                  {cloudStatus === 'ONLINE' ? 'Supabase Sync' : 'Local Autonomous'}
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10 text-left mb-6 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-zinc-400">Store:</span>
                <span className="font-semibold text-white">{shopName || 'Apex Print Center'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Merchant ID:</span>
                <span className="font-mono text-blue-400 font-semibold">{merchantId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Device ID:</span>
                <span className="font-mono text-emerald-400 font-semibold">{deviceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">B/W Rate:</span>
                <span className="font-semibold text-zinc-200">₹{bwSingle.toFixed(2)}/page</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleOpenDashboard}
              className="w-full py-3.5 px-6 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 group"
            >
              <span>Launch AutoPrint Dashboard</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
