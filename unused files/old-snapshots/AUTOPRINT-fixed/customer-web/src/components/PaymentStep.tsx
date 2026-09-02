import React, { useEffect, useState } from 'react';
import { usePrintJob } from '../context/PrintJobContext';
import { PaymentMethod, UpiAppId } from '../types';
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
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const PaymentStep: React.FC = () => {
  const {
    currentShop,
    uploadedFile,
    specs,
    pricing,
    paymentDetails,
    initiatePayment,
    completePayment,
    setStep,
  } = usePrintJob();

  const [merchantConfig, setMerchantConfig] = useState<{
    paymentMethod?: 'QR' | 'UPI' | 'BOTH';
    upiId?: string;
    qrImageUrl?: string;
    shopName?: string;
  }>({});

  const API_BASE_URL = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:9000/api`
    : 'http://localhost:9000/api';

  useEffect(() => {
    async function fetchMerchantConfig() {
      try {
        const res = await fetch(`${API_BASE_URL}/merchant/payment-config`);
        const data = await res.json();
        if (data.ok && data.data) {
          setMerchantConfig(data.data);
        }
      } catch (err) {
        console.warn('Could not fetch backend merchant payment config:', err);
      }
    }
    fetchMerchantConfig();
  }, []);

  const upiVpa = merchantConfig.upiId || currentShop.upiDetails.vpa;

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiVpa);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleProceed = () => {
    initiatePayment(selectedMethod, selectedMethod === 'upi' ? selectedUpiApp : undefined);
    setShowConfirmModal(true);
  };

  const handleFinalConfirm = async () => {
    setIsProcessing(true);
    try {
      if (paymentDetails.verificationCode) {
        await fetch(`${API_BASE_URL}/payment/digital-attempt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            verificationCode: paymentDetails.verificationCode,
            status: selectedMethod === 'upi' ? 'UPI_INITIATED' : 'CASH_REQUIRED',
            vpa: upiVpa,
          }),
        });
      }
    } catch (err) {
      console.warn('Backend payment record error:', err);
    } finally {
      setIsProcessing(false);
      setShowConfirmModal(false);
      completePayment();
    }
  };

  const upiApps: { id: UpiAppId; name: string; iconBg: string; textColor: string }[] = [
    { id: 'gpay', name: 'Google Pay', iconBg: 'bg-[#4285F4]/20', textColor: 'text-[#8ab4f8]' },
    { id: 'phonepe', name: 'PhonePe', iconBg: 'bg-[#5f259f]/30', textColor: 'text-[#d0bcff]' },
    { id: 'paytm', name: 'Paytm UPI', iconBg: 'bg-[#00baf2]/20', textColor: 'text-[#7cd4fd]' },
    { id: 'cred', name: 'CRED UPI', iconBg: 'bg-[#1e1f23]', textColor: 'text-[#e2e2e7]' },
    { id: 'bhim', name: 'BHIM UPI', iconBg: 'bg-[#00897b]/20', textColor: 'text-[#80cbc4]' },
    { id: 'generic', name: 'Any UPI App', iconBg: 'bg-[#ffb77c]/20', textColor: 'text-[#ffb77c]' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 pb-32 sm:px-6 pt-2 space-y-6 font-sans">
      
      {/* Top Nav: Back to Specs */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep('specs')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md text-xs font-semibold text-zinc-300 hover:text-[#D0BCFF] hover:border-[#D0BCFF]/30 transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Edit Specs</span>
        </button>

        <div className="text-xs text-zinc-400 flex items-center gap-1.5 bg-white/5 px-3.5 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
          <Store className="w-3.5 h-3.5 text-[#D0BCFF]" />
          <span>Paying to:</span>
          <span className="text-white font-semibold">{currentShop.name}</span>
        </div>
      </div>

      {/* SECTION 1: ORDER SUMMARY OVERVIEW */}
      <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-xl shadow-black/40 space-y-5">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#D0BCFF]/15 text-[#D0BCFF] flex items-center justify-center border border-[#D0BCFF]/30">
              <FileText className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-white">Print Order Summary</h2>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-[#D0BCFF]/10 text-[#D0BCFF] border border-[#D0BCFF]/20">
            {currentShop.kioskNumber}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5">
            <span className="text-zinc-400 block text-[10px] uppercase font-bold tracking-wider">Document</span>
            <span className="text-white font-bold truncate block mt-0.5" title={uploadedFile?.name}>
              {uploadedFile?.name}
            </span>
            <span className="text-zinc-400 text-[11px]">
              {specs.selectedPagesCount} pgs × {specs.copies} {specs.copies === 1 ? 'copy' : 'copies'}
            </span>
          </div>

          <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5">
            <span className="text-zinc-400 block text-[10px] uppercase font-bold tracking-wider">Color & Sides</span>
            <span className="text-white font-bold capitalize block mt-0.5">
              {specs.colorMode === 'bw' ? 'Black & White' : specs.colorMode === 'color' ? 'Full Color' : 'Photo Glossy'}
            </span>
            <span className="text-zinc-400 text-[11px] capitalize">
              {specs.duplex === 'single' ? 'Single-Sided' : 'Double-Sided'}
            </span>
          </div>

          <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5">
            <span className="text-zinc-400 block text-[10px] uppercase font-bold tracking-wider">Paper & Format</span>
            <span className="text-white font-bold uppercase block mt-0.5">
              {specs.paperSize}
            </span>
            <span className="text-zinc-400 text-[11px] capitalize">
              {specs.orientation} layout
            </span>
          </div>

          <div className="bg-black/30 p-3.5 rounded-2xl border border-white/5">
            <span className="text-zinc-400 block text-[10px] uppercase font-bold tracking-wider">Finishing</span>
            <span className="text-white font-bold capitalize block mt-0.5">
              {specs.finishing === 'none' ? 'Standard' : specs.finishing}
            </span>
            <span className="text-[#6dd58c] text-[11px] font-semibold">
              Ready for queue
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-zinc-400 font-medium">Total Amount to Pay:</span>
          <span className="text-3xl font-black font-mono text-[#D0BCFF]">
            ₹{pricing.totalAmount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* SECTION 2: PAYMENT METHOD SELECTION */}
      <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-xl shadow-black/40 space-y-5">
        <div>
          <h2 className="text-lg font-bold text-white">Choose Payment Method</h2>
          <p className="text-xs text-zinc-400">Select UPI instant payment or cash at the shop counter</p>
        </div>

        {/* 2 Main Options */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Option 1: UPI App Payment */}
          <div
            onClick={() => setSelectedMethod('upi')}
            className={`p-5 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
              selectedMethod === 'upi'
                ? 'bg-[#381E72]/40 border-[#D0BCFF] text-white shadow-xl shadow-[#D0BCFF]/10'
                : 'bg-black/30 border-white/10 hover:border-white/20 text-zinc-300'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  selectedMethod === 'upi' ? 'bg-[#D0BCFF] text-[#381E72]' : 'bg-white/5 text-[#D0BCFF]'
                }`}>
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold flex items-center gap-1.5">
                    <span>UPI App Payment</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#6dd58c]/15 text-[#6dd58c] border border-[#6dd58c]/30">
                      FASTEST
                    </span>
                  </div>
                  <div className="text-xs text-zinc-400">GPay, PhonePe, Paytm, BHIM</div>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedMethod === 'upi' ? 'border-[#D0BCFF] bg-[#D0BCFF]' : 'border-white/20'
              }`}>
                {selectedMethod === 'upi' && <div className="w-2 h-2 rounded-full bg-[#381E72]" />}
              </div>
            </div>

            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Scan dynamic QR code or launch your installed UPI app to pay ₹{pricing.totalAmount.toFixed(2)} instantly.
            </p>
          </div>

          {/* Option 2: Cash at Counter */}
          <div
            onClick={() => setSelectedMethod('cash')}
            className={`p-5 rounded-3xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
              selectedMethod === 'cash'
                ? 'bg-[#ffb77c]/10 border-[#ffb77c] text-white shadow-xl shadow-[#ffb77c]/10'
                : 'bg-black/30 border-white/10 hover:border-white/20 text-zinc-300'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                  selectedMethod === 'cash' ? 'bg-[#ffb77c] text-[#4e2600]' : 'bg-white/5 text-[#ffb77c]'
                }`}>
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold">Pay Cash at Counter</div>
                  <div className="text-xs text-zinc-400">Hand cash to shopkeeper</div>
                </div>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                selectedMethod === 'cash' ? 'border-[#ffb77c] bg-[#ffb77c]' : 'border-white/20'
              }`}>
                {selectedMethod === 'cash' && <div className="w-2 h-2 rounded-full bg-[#4e2600]" />}
              </div>
            </div>

            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Your collection code will show <strong className="text-[#ffb77c]">"Cash Due: ₹{pricing.totalAmount.toFixed(2)}"</strong>. Pay at counter upon collection.
            </p>
          </div>

        </div>

        {/* DYNAMIC UPI ACCORDION / QR BOX */}
        {selectedMethod === 'upi' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="pt-5 border-t border-white/10 space-y-4"
          >
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Select Your Preferred UPI App
            </div>

            {/* UPI App selector chips */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {upiApps.map((app) => (
                <button
                  key={app.id}
                  onClick={() => setSelectedUpiApp(app.id)}
                  className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                    selectedUpiApp === app.id
                      ? 'bg-[#381E72]/60 border-[#D0BCFF] shadow-sm'
                      : 'bg-black/30 border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className={`w-8 h-8 mx-auto mb-1.5 rounded-xl ${app.iconBg} flex items-center justify-center text-xs font-bold ${app.textColor}`}>
                    {app.name.charAt(0)}
                  </div>
                  <span className="text-[11px] font-semibold text-zinc-200 block truncate">
                    {app.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Dynamic Scannable Kiosk UPI QR Frame */}
            <div className="bg-black/30 rounded-3xl p-5 border border-white/10 flex flex-col sm:flex-row items-center gap-6">
              
              {/* Frosted Glass Styled QR Visual */}
              <div className="p-3.5 bg-white rounded-3xl shadow-xl flex-shrink-0 flex flex-col items-center">
                {merchantConfig.qrImageUrl ? (
                  <img
                    src={`http://localhost:9000${merchantConfig.qrImageUrl}`}
                    alt="Merchant Store QR Code"
                    className="w-36 h-36 object-contain rounded-xl"
                  />
                ) : (
                  <svg
                    className="w-36 h-36"
                    viewBox="0 0 100 100"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect x="5" y="5" width="28" height="28" rx="4" fill="#000" />
                    <rect x="9" y="9" width="20" height="20" rx="2" fill="#fff" />
                    <rect x="13" y="13" width="12" height="12" rx="1" fill="#000" />
                    <rect x="67" y="5" width="28" height="28" rx="4" fill="#000" />
                    <rect x="71" y="9" width="20" height="20" rx="2" fill="#fff" />
                    <rect x="75" y="13" width="12" height="12" rx="1" fill="#000" />
                    <rect x="5" y="67" width="28" height="28" rx="4" fill="#000" />
                    <rect x="9" y="71" width="20" height="20" rx="2" fill="#fff" />
                    <rect x="13" y="75" width="12" height="12" rx="1" fill="#000" />
                    <rect x="38" y="8" width="8" height="8" fill="#000" />
                    <rect x="50" y="8" width="8" height="8" fill="#000" />
                    <rect x="38" y="22" width="6" height="6" fill="#000" />
                    <rect x="48" y="22" width="10" height="6" fill="#000" />
                    <rect x="10" y="42" width="8" height="6" fill="#000" />
                    <rect x="24" y="40" width="14" height="8" fill="#000" />
                    <rect x="44" y="38" width="12" height="12" rx="2" fill="#381E72" />
                    <rect x="62" y="42" width="8" height="6" fill="#000" />
                    <rect x="76" y="40" width="14" height="8" fill="#000" />
                    <rect x="38" y="58" width="8" height="8" fill="#000" />
                    <rect x="52" y="58" width="6" height="6" fill="#000" />
                    <rect x="64" y="58" width="10" height="8" fill="#000" />
                    <rect x="38" y="72" width="10" height="8" fill="#000" />
                    <rect x="54" y="72" width="8" height="18" fill="#000" />
                    <rect x="68" y="72" width="8" height="8" fill="#000" />
                    <rect x="82" y="72" width="8" height="18" fill="#000" />
                  </svg>
                )}
                <div className="text-[10px] font-bold text-gray-800 mt-1 uppercase tracking-wider">
                  SCAN TO PAY ₹{pricing.totalAmount.toFixed(2)}
                </div>
              </div>

              {/* Merchant & VPA details */}
              <div className="flex-1 text-center sm:text-left space-y-2.5 min-w-0">
                <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-zinc-400">
                  <Clock className="w-3.5 h-3.5 text-[#ffb77c]" />
                  <span>QR expires in:</span>
                  <span className="font-mono text-[#ffb77c] font-bold">{formatTimer(upiTimerSeconds)}</span>
                </div>

                <div className="text-sm font-bold text-white">
                  {currentShop.upiDetails.payeeName}
                </div>

                {/* Copy VPA Button */}
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="font-mono text-xs text-[#D0BCFF] bg-[#D0BCFF]/10 px-3 py-1.5 rounded-xl border border-[#D0BCFF]/20">
                    {currentShop.upiDetails.vpa}
                  </span>
                  <button
                    onClick={handleCopyUpi}
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-300 hover:text-[#D0BCFF] transition-colors cursor-pointer"
                    title="Copy UPI VPA"
                  >
                    {copiedUpi ? <Check className="w-3.5 h-3.5 text-[#6dd58c]" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <p className="text-[11px] text-zinc-400">
                  Open GPay / PhonePe / Paytm on your phone, scan this QR, and complete authorization.
                </p>
              </div>

            </div>
          </motion.div>
        )}

      </div>

      {/* STICKY BOTTOM CONFIRMATION ACTION BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#0F0F12]/80 backdrop-blur-xl border-t border-white/10 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div>
            <span className="text-[11px] text-zinc-400 block">Method: {selectedMethod === 'upi' ? 'UPI App' : 'Cash at Counter'}</span>
            <span className="font-mono text-2xl font-black text-[#D0BCFF]">
              ₹{pricing.totalAmount.toFixed(2)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleProceed}
            className="flex-1 sm:flex-initial py-4 px-8 rounded-2xl bg-[#D0BCFF] hover:bg-[#decbf7] text-[#381E72] font-black text-base shadow-xl shadow-[#D0BCFF]/15 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>CONFIRM & GENERATE CODE</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CONFIRMATION MODAL */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
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
                  Please verify the print configuration before sending to shop print queue
                </p>
              </div>

              <div className="bg-black/40 rounded-2xl p-4 border border-white/10 space-y-2.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Print Shop:</span>
                  <span className="text-white font-semibold">{currentShop.name}</span>
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
                  Cancel
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
