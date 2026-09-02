import React, { useState } from 'react';
import { usePrintJob } from '../context/PrintJobContext';
import {
  Zap,
  ShieldCheck,
  X,
  CreditCard,
  QrCode,
  Smartphone,
  CheckCircle2,
  Lock,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface JuspayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (paymentId: string) => void;
}

export const JuspayModal: React.FC<JuspayModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { currentShop, pricing } = usePrintJob();
  const [selectedApp, setSelectedApp] = useState('gpay');
  const [phone, setPhone] = useState('9876543210');
  const [isProcessing, setIsProcessing] = useState(false);
  const [stepText, setStepText] = useState('');

  if (!isOpen) return null;

  const totalAmount = pricing.totalAmount;
  const merchantName = currentShop?.name || 'AutoPrint Verified Shop';
  const orderRef = `JUSP_${Date.now().toString().slice(-6)}`;

  const handlePay = () => {
    setIsProcessing(true);
    setStepText('Initializing Juspay Express Checkout...');

    setTimeout(() => {
      setStepText('Opening UPI Intent Bridge...');
    }, 1100);

    setTimeout(() => {
      setStepText('Payment verified by NPCI / Juspay...');
    }, 2200);

    setTimeout(() => {
      const generatedId = `juspay_txn_${Date.now().toString().slice(-8)}${Math.floor(10 + Math.random() * 90)}`;
      setIsProcessing(false);
      onSuccess(generatedId);
    }, 3000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md font-sans">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="w-full max-w-md bg-[#101217] rounded-3xl border border-emerald-500/30 shadow-2xl overflow-hidden text-[#E6E1E9]"
        >
          {/* Juspay Header */}
          <div className="bg-gradient-to-r from-[#063b28] via-[#0b5138] to-[#063b28] p-5 border-b border-emerald-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-400/30 shadow-inner">
                  <Zap className="w-5 h-5 text-emerald-300 fill-current" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-black text-white tracking-wide">Juspay</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-400/30">
                      HYPERCHECKOUT
                    </span>
                  </div>
                  <p className="text-xs text-emerald-200/80 truncate max-w-[200px]">{merchantName}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-right">
                  <div className="text-[10px] text-emerald-200/70 uppercase tracking-wider">Payable</div>
                  <div className="text-xl font-black text-white font-mono">₹{totalAmount.toFixed(2)}</div>
                </div>
                {!isProcessing && (
                  <button
                    onClick={onClose}
                    className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-zinc-300 hover:text-white transition-colors cursor-pointer ml-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-emerald-200/70">
              <span>Txn: <span className="font-mono text-white">{orderRef}</span></span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                1-Click Express
              </span>
            </div>
          </div>

          {/* Body */}
          {isProcessing ? (
            <div className="p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-4 min-h-[280px]">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-400 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-emerald-400 fill-current" />
                </div>
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Juspay Processing</h4>
                <p className="text-xs text-emerald-300 font-mono animate-pulse">{stepText}</p>
              </div>
            </div>
          ) : (
            <div className="p-5 sm:p-6 space-y-5">
              {/* Phone input */}
              <div className="bg-white/5 rounded-2xl p-3.5 border border-white/5">
                <label className="text-[10px] uppercase font-bold text-zinc-400 block mb-1">
                  Customer Mobile Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-xs outline-none focus:border-emerald-400"
                  placeholder="10-digit mobile"
                />
              </div>

              {/* Quick 1-Click Apps */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-2.5">
                  1-Click UPI Redirection
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { id: 'gpay', name: 'Google Pay', subtitle: 'Fastest 1-Click' },
                    { id: 'phonepe', name: 'PhonePe', subtitle: 'Direct UPI' },
                    { id: 'paytm', name: 'Paytm Wallet & UPI', subtitle: 'Instant' },
                    { id: 'cred', name: 'CRED UPI', subtitle: 'Members Club' },
                  ].map((app) => {
                    const isSelected = selectedApp === app.id;
                    return (
                      <button
                        key={app.id}
                        onClick={() => setSelectedApp(app.id)}
                        className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer relative flex flex-col justify-between ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-sm'
                            : 'bg-black/30 border-white/5 text-zinc-300 hover:bg-white/5'
                        }`}
                      >
                        <div className="text-xs font-bold text-white mb-0.5">{app.name}</div>
                        <span className="text-[10px] text-emerald-300 font-medium">{app.subtitle}</span>
                        {isSelected && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute top-3 right-3" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pay Action */}
              <button
                onClick={handlePay}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-xl shadow-emerald-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Zap className="w-4 h-4 fill-current" />
                <span>PROCEED WITH JUSPAY (₹{totalAmount.toFixed(2)})</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>

              <div className="flex items-center justify-center gap-2 text-[10px] text-zinc-400">
                <Lock className="w-3 h-3 text-emerald-400" />
                <span>Powered by Juspay Safe Gateway • Fast Bank Switching</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
