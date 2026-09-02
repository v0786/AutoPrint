import React, { useEffect, useState } from 'react';
import { usePrintJob } from '../context/PrintJobContext';
import { useLanguage } from '../context/LanguageContext';
import { PaymentMethod, UpiAppId, GatewayType } from '../types';
import {
  QrCode,
  Smartphone,
  Banknote,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  Clock,
  Copy,
  Check,
  Store,
  FileText,
  AlertCircle,
  Sparkles,
  RefreshCw,
  CreditCard,
  Zap,
  Lock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RazorpayModal } from './RazorpayModal';

export const PaymentStep: React.FC = () => {
  const {
    currentShop,
    uploadedFile,
    specs,
    pricing,
    paymentDetails,
    isShopOnline,
    initiatePayment,
    completePayment,
    setStep,
  } = usePrintJob();
  const { t } = useLanguage();

  const isRazorpayConfigured = Boolean(currentShop?.paymentGateways?.razorpayEnabled);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>('upi');
  const [selectedUpiApp, setSelectedUpiApp] = useState<UpiAppId>(paymentDetails.upiApp || 'gpay');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [upiTimerSeconds, setUpiTimerSeconds] = useState(180);

  // Razorpay Gateway state
  const [isRazorpayOpen, setIsRazorpayOpen] = useState(false);

  // Timer countdown for UPI QR
  useEffect(() => {
    if (selectedMethod !== 'upi') return;
    const interval = setInterval(() => {
      setUpiTimerSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [selectedMethod]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleCopyUpi = () => {
    if (currentShop?.upiDetails?.vpa) {
      navigator.clipboard.writeText(currentShop.upiDetails.vpa);
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    }
  };

  const handleProceed = () => {
    if (selectedMethod === 'razorpay') {
      initiatePayment('razorpay', { gateway: 'razorpay' });
      setIsRazorpayOpen(true);
      return;
    }

    initiatePayment(selectedMethod, { upiApp: selectedMethod === 'upi' ? selectedUpiApp : undefined });
    setShowConfirmModal(true);
  };

  const handleGatewaySuccess = (_gateway: GatewayType, paymentId: string) => {
    setIsRazorpayOpen(false);
    completePayment({
      method: 'razorpay',
      gateway: 'razorpay',
      gatewayPaymentId: paymentId,
    });
  };

  const handleFinalConfirm = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setShowConfirmModal(false);
      completePayment({
        method: selectedMethod,
      });
    }, 1000);
  };

  const upiApps: { id: UpiAppId; name: string; iconBg: string; textColor: string }[] = [
    { id: 'gpay', name: 'Google Pay', iconBg: 'bg-[#4285F4]/20', textColor: 'text-[#8ab4f8]' },
    { id: 'phonepe', name: 'PhonePe', iconBg: 'bg-[#5f259f]/30', textColor: 'text-[#d0bcff]' },
    { id: 'paytm', name: 'Paytm UPI', iconBg: 'bg-[#00baf2]/20', textColor: 'text-[#7cd4fd]' },
    { id: 'cred', name: 'CRED UPI', iconBg: 'bg-[#1e1f23]', textColor: 'text-[#e2e2e7]' },
    { id: 'bhim', name: 'BHIM UPI', iconBg: 'bg-[#00897b]/20', textColor: 'text-[#80cbc4]' },
  ];

  const shopName = currentShop?.name || 'AutoPrint Shop';
  const shopNumber = currentShop ? currentShop.kioskNumber.replace(/Kiosk/gi, 'Shop') : 'Shop #01';
  const upiVpa = currentShop?.upiDetails?.vpa || 'autoprint@upi';
  const payeeName = currentShop?.upiDetails?.payeeName || shopName;
  const upiIntentUri = `upi://pay?pa=${encodeURIComponent(upiVpa)}&pn=${encodeURIComponent(payeeName)}&am=${pricing.totalAmount.toFixed(2)}&cu=INR&tn=AutoPrint%20Order`;

  return (
    <div className="max-w-4xl mx-auto px-4 pb-32 sm:px-6 pt-2 space-y-6 font-sans">
      
      {/* Top Nav: Back to Specs */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep('specs')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md text-xs font-semibold text-zinc-300 hover:text-[#D0BCFF] hover:border-[#D0BCFF]/30 transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('back')}</span>
        </button>

        <div className="text-xs text-zinc-400 flex items-center gap-1.5 bg-white/5 px-3.5 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
          <Store className="w-3.5 h-3.5 text-[#D0BCFF]" />
          <span>{t('shopLabel')}</span>
          <span className="text-white font-semibold">{shopName}</span>
        </div>
      </div>

      {/* SECTION 1: ORDER SUMMARY OVERVIEW */}
      <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-xl shadow-black/40 space-y-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#D0BCFF]/15 text-[#D0BCFF] flex items-center justify-center border border-[#D0BCFF]/30">
              <FileText className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white">{t('orderSummary')}</h2>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#D0BCFF]/10 text-[#D0BCFF] border border-[#D0BCFF]/20">
            {shopNumber}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5">
            <span className="text-zinc-400 block text-[10px] uppercase font-bold tracking-wider">{t('uploadDocument')}</span>
            <span className="text-white font-bold truncate block mt-0.5" title={uploadedFile?.name}>
              {uploadedFile?.name || 'Document'}
            </span>
            <span className="text-zinc-400 text-[11px]">
              {specs.selectedPagesCount} {t('pages')} × {specs.copies}
            </span>
          </div>

          <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5">
            <span className="text-zinc-400 block text-[10px] uppercase font-bold tracking-wider">{t('colorMode')}</span>
            <span className="text-white font-bold capitalize block mt-0.5">
              {specs.colorMode === 'bw' ? t('bw') : specs.colorMode === 'color' ? t('color') : t('photo')}
            </span>
            <span className="text-zinc-400 text-[11px] capitalize">
              {specs.duplex === 'single' ? t('singleSided') : t('doubleSided')}
            </span>
          </div>

          <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5">
            <span className="text-zinc-400 block text-[10px] uppercase font-bold tracking-wider">{t('paperSize')}</span>
            <span className="text-white font-bold uppercase block mt-0.5">
              {specs.paperSize}
            </span>
            <span className="text-zinc-400 text-[11px] capitalize">
              {specs.orientation}
            </span>
          </div>

          <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5">
            <span className="text-zinc-400 block text-[10px] uppercase font-bold tracking-wider">{t('finishing')}</span>
            <span className="text-white font-bold capitalize block mt-0.5">
              {specs.finishing === 'none' ? t('noFinishing') : specs.finishing}
            </span>
            <span className="text-[#6dd58c] text-[11px] font-semibold">
              Ready
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-zinc-400 font-medium">{t('total')}:</span>
          <span className="text-3xl font-black font-mono text-[#D0BCFF]">
            ₹{pricing.totalAmount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* SECTION 2: PAYMENT METHOD SELECTION */}
      <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-xl shadow-black/40 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-white">{t('selectPayment')}</h2>
          <p className="text-xs text-zinc-400">
            {t('secureCheckout')}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          
          {/* Option 1: Shop Direct UPI QR (Primary Default) */}
          <div
            onClick={() => setSelectedMethod('upi')}
            className={`p-5 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
              selectedMethod === 'upi'
                ? 'bg-[#2B1B4A]/60 border-[#D0BCFF] text-white shadow-xl shadow-[#D0BCFF]/10'
                : 'bg-black/30 border-white/10 hover:border-white/20 text-zinc-300'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  selectedMethod === 'upi' ? 'bg-[#D0BCFF] text-[#381E72]' : 'bg-white/5 text-[#D0BCFF]'
                }`}>
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold flex items-center gap-1.5">
                    <span>{t('upiDirectTitle')}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#6dd58c]/20 text-[#8cf6aa] border border-[#6dd58c]/30">
                      INSTANT
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400">{t('upiDirectSubtitle')}</div>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedMethod === 'upi' ? 'border-[#D0BCFF] bg-[#D0BCFF]' : 'border-white/20'
              }`}>
                {selectedMethod === 'upi' && <div className="w-2 h-2 rounded-full bg-[#381E72]" />}
              </div>
            </div>

            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Scan with GPay, PhonePe, Paytm, CRED or BHIM to pay directly to shop UPI ID: <span className="font-mono text-[#D0BCFF]">{upiVpa}</span>
            </p>
          </div>

          {/* Option 2: Cash at Counter */}
          <div
            onClick={() => setSelectedMethod('cash')}
            className={`p-5 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
              selectedMethod === 'cash'
                ? 'bg-[#3A2A10]/60 border-amber-400 text-white shadow-xl shadow-amber-500/10'
                : 'bg-black/30 border-white/10 hover:border-white/20 text-zinc-300'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  selectedMethod === 'cash' ? 'bg-amber-400 text-[#3a2000]' : 'bg-white/5 text-amber-400'
                }`}>
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold flex items-center gap-1.5">
                    <span>{t('cashTitle')}</span>
                  </div>
                  <div className="text-xs text-zinc-400">{t('cashSubtitle')}</div>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedMethod === 'cash' ? 'border-amber-400 bg-amber-400' : 'border-white/20'
              }`}>
                {selectedMethod === 'cash' && <div className="w-2 h-2 rounded-full bg-[#3a2000]" />}
              </div>
            </div>

            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Get your 8-digit collection code instantly and pay exact cash at the shop counter upon handover.
            </p>
          </div>

          {/* Option 3: Razorpay (Shown only if merchant configured Razorpay) */}
          {isRazorpayConfigured && (
            <div
              onClick={() => setSelectedMethod('razorpay')}
              className={`p-5 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between sm:col-span-2 ${
                selectedMethod === 'razorpay'
                  ? 'bg-[#0F3260]/40 border-blue-400 text-white shadow-xl shadow-blue-500/10'
                  : 'bg-black/30 border-white/10 hover:border-white/20 text-zinc-300'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    selectedMethod === 'razorpay' ? 'bg-blue-500 text-white' : 'bg-white/5 text-blue-400'
                  }`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-sm font-bold flex items-center gap-1.5">
                      <span>{t('razorpayTitle')}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                        GATEWAY
                      </span>
                    </div>
                    <div className="text-xs text-zinc-400">{t('razorpaySubtitle')}</div>
                  </div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                  selectedMethod === 'razorpay' ? 'border-blue-400 bg-blue-500' : 'border-white/20'
                }`}>
                  {selectedMethod === 'razorpay' && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Dynamic Details for Selected Mode */}
        {selectedMethod === 'upi' && (
          <div className="mt-4 p-5 rounded-3xl bg-black/40 border border-white/10 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                <span className="text-xs text-zinc-400">Shop VPA / UPI ID:</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-bold text-white bg-white/5 px-3 py-1 rounded-xl border border-white/10">
                    {upiVpa}
                  </span>
                  <button
                    onClick={handleCopyUpi}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-[#D0BCFF] transition-all cursor-pointer text-xs flex items-center gap-1"
                  >
                    {copiedUpi ? <Check className="w-3.5 h-3.5 text-[#6dd58c]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUpi ? t('vpaCopied') : t('copyVpa')}</span>
                  </button>
                </div>
              </div>

              <div className="text-center sm:text-right">
                <span className="text-[11px] text-zinc-400 block">{t('expiresIn')}</span>
                <span className="font-mono text-xs font-bold text-amber-400 flex items-center justify-center sm:justify-end gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {formatTimer(upiTimerSeconds)}
                </span>
              </div>
            </div>

            {/* Direct App Launch Pills on Mobile */}
            <div className="pt-2 border-t border-white/5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                1-Click Open UPI App on Mobile:
              </span>
              <div className="flex flex-wrap gap-2">
                {upiApps.map((app) => (
                  <a
                    key={app.id}
                    href={upiIntentUri}
                    className={`px-3 py-1.5 rounded-xl border border-white/10 ${app.iconBg} ${app.textColor} text-xs font-bold flex items-center gap-1.5 hover:scale-105 transition-all cursor-pointer`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>{app.name}</span>
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      {/* STICKY BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#0F0F12]/90 backdrop-blur-xl border-t border-white/10 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div>
            <span className="text-[11px] text-zinc-400 block">{t('total')}:</span>
            <span className="font-mono text-2xl font-black text-[#D0BCFF]">
              ₹{pricing.totalAmount.toFixed(2)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleProceed}
            className="py-3.5 px-8 rounded-2xl bg-[#D0BCFF] hover:bg-[#decbf7] text-[#381E72] font-black text-sm shadow-xl shadow-[#D0BCFF]/15 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>
              {selectedMethod === 'cash' ? t('proceedWithCash') : t('payAndGenerateCode')}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* RAZORPAY MODAL (IF ENABLED) */}
      {isRazorpayConfigured && (
        <RazorpayModal
          isOpen={isRazorpayOpen}
          onClose={() => setIsRazorpayOpen(false)}
          onSuccess={(paymentId) => handleGatewaySuccess('razorpay', paymentId)}
        />
      )}

      {/* CONFIRMATION MODAL FOR CASH / DIRECT UPI */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-[#141419]/95 rounded-3xl p-6 border border-white/10 backdrop-blur-2xl shadow-2xl space-y-5"
            >
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-[#D0BCFF]/15 text-[#D0BCFF] mx-auto flex items-center justify-center mb-2 border border-[#D0BCFF]/30">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-white">Authorize Print Job</h3>
                <p className="text-xs text-zinc-400">
                  Verify print configuration before queuing to shop printer
                </p>
              </div>

              <div className="bg-black/40 rounded-2xl p-4 border border-white/10 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Print Shop:</span>
                  <span className="text-white font-semibold">{shopName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Document:</span>
                  <span className="text-white font-semibold truncate max-w-[180px]">{uploadedFile?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Specs:</span>
                  <span className="text-[#D0BCFF] font-semibold capitalize">
                    {specs.colorMode} • {specs.duplex} • {specs.copies} {specs.copies === 1 ? 'copy' : 'copies'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Payment Mode:</span>
                  <span className="text-[#6dd58c] font-semibold uppercase">
                    {selectedMethod === 'upi' ? `UPI (${selectedUpiApp.toUpperCase()})` : 'CASH AT COUNTER'}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white/10 font-bold text-sm">
                  <span className="text-white">Total Amount:</span>
                  <span className="text-[#D0BCFF] font-mono text-base">₹{pricing.totalAmount.toFixed(2)}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-300 transition-colors cursor-pointer"
                >
                  {t('cancel')}
                </button>
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={handleFinalConfirm}
                  className="flex-1 py-3.5 rounded-2xl bg-[#D0BCFF] hover:bg-[#decbf7] text-[#381E72] text-xs font-black shadow-lg shadow-[#D0BCFF]/15 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Transmitting...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm & Queue</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
