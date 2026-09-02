import React, { useState } from 'react';
import { usePrintJob } from '../context/PrintJobContext';
import {
  ShieldCheck,
  X,
  CreditCard,
  QrCode,
  Smartphone,
  Building2,
  Wallet,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface RazorpayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentId: string) => void;
}

type RazorpayTab = 'upi' | 'card' | 'netbanking' | 'wallet';

export const RazorpayModal: React.FC<RazorpayModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { currentShop, pricing, uploadedFile, specs } = usePrintJob();
  const [activeTab, setActiveTab] = useState<RazorpayTab>('upi');
  const [selectedUpiApp, setSelectedUpiApp] = useState<string>('gpay');
  const [upiId, setUpiId] = useState('');
  const [phone, setPhone] = useState('9876543210');
  const [email, setEmail] = useState('customer@example.com');
  
  // Card form state
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8821');
  const [cardExpiry, setCardExpiry] = useState('08/28');
  const [cardCvv, setCardCvv] = useState('420');
  const [cardName, setCardName] = useState('Customer Cardholder');

  // Netbanking state
  const [selectedBank, setSelectedBank] = useState('HDFC');

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('');

  if (!isOpen) return null;

  const totalAmount = pricing.totalAmount;
  const merchantName = currentShop?.name || 'AutoPrint Verified Shop';
  const orderRef = `RZP_ORD_${Date.now().toString().slice(-6)}`;

  const handlePay = () => {
    setIsProcessing(true);
    setProcessingStep('Connecting to Razorpay Secure Gateway...');

    setTimeout(() => {
      setProcessingStep(
        activeTab === 'upi'
          ? 'Waiting for UPI App authorization...'
          : activeTab === 'card'
          ? 'Verifying 3D Secure OTP...'
          : 'Connecting to Bank Gateway...'
      );
    }, 1200);

    setTimeout(() => {
      setProcessingStep('Payment authorized! Generating digital receipt...');
    }, 2400);

    setTimeout(() => {
      const generatedId = `pay_rzp_${Date.now().toString().slice(-8)}${Math.floor(100 + Math.random() * 900)}`;
      setIsProcessing(false);
      onSuccess(generatedId);
    }, 3200);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md font-sans">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="w-full max-w-lg bg-[#0d0f14] rounded-3xl border border-blue-500/30 shadow-2xl overflow-hidden text-[#E6E1E9]"
        >
          {/* Razorpay Brand Header */}
          <div className="bg-gradient-to-r from-[#0C2340] via-[#0F3260] to-[#0C2340] p-4 sm:p-5 border-b border-blue-500/20 relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-400/30 shadow-inner">
                  <ShieldCheck className="w-5 h-5 text-blue-300" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-white tracking-wide">Razorpay</span>
                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold border border-blue-400/30">
                      SECURE CHECKOUT
                    </span>
                  </div>
                  <p className="text-xs text-blue-200/80 truncate max-w-xs">{merchantName}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <div className="text-[10px] text-blue-200/70 uppercase tracking-wider">Amount Due</div>
                  <div className="text-xl font-black text-white font-mono">₹{totalAmount.toFixed(2)}</div>
                </div>
                {!isProcessing && (
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Sub info */}
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-blue-200/70">
              <span>Order: <span className="font-mono text-white">{orderRef}</span></span>
              <span className="flex items-center gap-1">
                <Lock className="w-3 h-3 text-emerald-400" />
                256-bit Bank Grade Encryption
              </span>
            </div>
          </div>

          {/* Processing Overlay if in progress */}
          {isProcessing ? (
            <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-4 min-h-[320px]">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-blue-500/20 border-t-blue-400 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <ShieldCheck className="w-6 h-6 text-blue-400" />
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Processing Razorpay Payment</h4>
                <p className="text-xs text-blue-300 font-mono animate-pulse">{processingStep}</p>
              </div>
              <div className="text-[11px] text-zinc-400 max-w-xs">
                Please do not close this window or refresh the page.
              </div>
            </div>
          ) : (
            <div className="p-5 sm:p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              
              {/* Customer Contact Confirmation */}
              <div className="bg-white/5 rounded-2xl p-3 border border-white/5 grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Mobile No.</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-white font-mono text-xs outline-none focus:border-blue-400"
                    placeholder="10-digit mobile"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Receipt Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-white text-xs outline-none focus:border-blue-400"
                    placeholder="email@address.com"
                  />
                </div>
              </div>

              {/* Payment Methods Nav */}
              <div className="grid grid-cols-4 gap-1.5 bg-black/40 p-1.5 rounded-2xl border border-white/10">
                {[
                  { id: 'upi' as RazorpayTab, label: 'UPI / QR', icon: QrCode },
                  { id: 'card' as RazorpayTab, label: 'Cards', icon: CreditCard },
                  { id: 'netbanking' as RazorpayTab, label: 'NetBanking', icon: Building2 },
                  { id: 'wallet' as RazorpayTab, label: 'Wallets', icon: Wallet },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1 cursor-pointer ${
                        active
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'text-zinc-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[11px] truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* TAB 1: UPI / QR */}
              {activeTab === 'upi' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                      Select UPI App (Instant 0% fee)
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'gpay', name: 'Google Pay', tag: 'Fast' },
                        { id: 'phonepe', name: 'PhonePe', tag: 'Popular' },
                        { id: 'paytm', name: 'Paytm UPI', tag: 'Instant' },
                        { id: 'cred', name: 'CRED UPI', tag: 'Rewards' },
                        { id: 'bhim', name: 'BHIM UPI', tag: 'Govt' },
                        { id: 'whatsapp', name: 'WhatsApp Pay', tag: 'Direct' },
                      ].map((app) => {
                        const isSelected = selectedUpiApp === app.id;
                        return (
                          <button
                            key={app.id}
                            onClick={() => setSelectedUpiApp(app.id)}
                            className={`p-3 rounded-2xl text-left border transition-all cursor-pointer relative ${
                              isSelected
                                ? 'bg-blue-500/20 border-blue-400 text-white shadow-sm'
                                : 'bg-black/30 border-white/5 text-zinc-300 hover:bg-white/5'
                            }`}
                          >
                            <div className="text-xs font-bold truncate">{app.name}</div>
                            <span className="text-[9px] text-blue-300 uppercase font-semibold">{app.tag}</span>
                            {isSelected && (
                              <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 absolute top-2 right-2" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* UPI VPA input or QR code option */}
                  <div className="p-3.5 bg-black/40 rounded-2xl border border-white/10 space-y-2">
                    <label className="text-[11px] font-semibold text-zinc-300 block">
                      Or enter any UPI ID / VPA:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        placeholder="yourname@okaxis / mobile@upi"
                        className="flex-1 bg-zinc-900 border border-white/10 focus:border-blue-400 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setUpiId('customer@okhdfcbank')}
                        className="px-2.5 py-1 text-[10px] bg-white/10 hover:bg-white/20 rounded-xl text-blue-300 font-semibold cursor-pointer"
                      >
                        Sample VPA
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CARDS */}
              {activeTab === 'card' && (
                <div className="space-y-3">
                  {/* Virtual Card Preview */}
                  <div className="bg-gradient-to-tr from-blue-900 via-indigo-950 to-slate-900 p-4 rounded-2xl border border-blue-400/30 text-white shadow-lg space-y-3">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono text-[10px] text-blue-300 uppercase">Debit / Credit Card</span>
                      <span className="font-bold text-sm tracking-wider text-blue-200">Razorpay Pay</span>
                    </div>
                    <div className="font-mono text-base tracking-widest text-white py-1">
                      {cardNumber}
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-zinc-300 uppercase">
                      <div>
                        <div className="text-[8px] text-zinc-400">Card Holder</div>
                        <div className="font-semibold">{cardName}</div>
                      </div>
                      <div>
                        <div className="text-[8px] text-zinc-400">Expires</div>
                        <div className="font-mono font-semibold">{cardExpiry}</div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Card Number</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-blue-400"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">Expiry (MM/YY)</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">CVV</label>
                        <input
                          type="password"
                          maxLength={4}
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value)}
                          className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs font-mono text-white outline-none focus:border-blue-400"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: NETBANKING */}
              {activeTab === 'netbanking' && (
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                    Select Your Bank
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'HDFC', name: 'HDFC Bank' },
                      { id: 'ICICI', name: 'ICICI Bank' },
                      { id: 'SBI', name: 'State Bank of India' },
                      { id: 'AXIS', name: 'Axis Bank' },
                      { id: 'KOTAK', name: 'Kotak Mahindra' },
                      { id: 'PNB', name: 'Punjab National Bank' },
                    ].map((bank) => {
                      const isSelected = selectedBank === bank.id;
                      return (
                        <button
                          key={bank.id}
                          onClick={() => setSelectedBank(bank.id)}
                          className={`p-3 rounded-2xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                            isSelected
                              ? 'bg-blue-500/20 border-blue-400 text-white shadow-sm'
                              : 'bg-black/30 border-white/5 text-zinc-300 hover:bg-white/5'
                          }`}
                        >
                          <span className="text-xs font-bold">{bank.name}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 4: WALLETS */}
              {activeTab === 'wallet' && (
                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block">
                    Supported Wallets
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Amazon Pay', 'Mobikwik', 'Airtel Money', 'Freecharge', 'JioMoney', 'PhonePe Wallet'].map(
                      (w) => (
                        <button
                          key={w}
                          onClick={() => setSelectedBank(w)}
                          className="p-3 rounded-2xl bg-black/30 border border-white/5 hover:border-blue-400/40 text-left transition-all text-xs font-bold text-zinc-200 cursor-pointer"
                        >
                          {w}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Pay Button */}
              <button
                onClick={handlePay}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm shadow-xl shadow-blue-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>PAY ₹{totalAmount.toFixed(2)} VIA RAZORPAY</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>

              <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-400">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>PCI-DSS Certified • RBI Compliant Payment Gateway</span>
              </div>

            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
