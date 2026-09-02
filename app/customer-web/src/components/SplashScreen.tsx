import React, { useEffect, useState } from 'react';
import { usePrintJob } from '../context/PrintJobContext';
import { Printer, Zap, CheckCircle2, ArrowRight, ShieldCheck, FileText, QrCode, Store, Clock } from 'lucide-react';
import { motion } from 'motion/react';

export const SplashScreen: React.FC = () => {
  const { currentShop, setStep, setShopModalOpen, setQrModalOpen } = usePrintJob();
  const [autoProgress, setAutoProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused || autoProgress >= 100) return;

    const interval = setInterval(() => {
      setAutoProgress((prev) => {
        const next = prev + 2.5;
        return next >= 100 ? 100 : next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPaused, autoProgress]);

  useEffect(() => {
    if (autoProgress >= 100) {
      setStep('specs');
    }
  }, [autoProgress, setStep]);

  return (
    <div className="min-h-screen bg-[#0F0F12] text-[#E6E1E9] flex flex-col justify-between items-center p-6 relative overflow-hidden font-sans">
      {/* Ambient background glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#D0BCFF]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#381E72]/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#D0BCFF]/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Shop Bar */}
      <header className="w-full max-w-md flex items-center justify-between z-10 pt-2">
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs text-zinc-300 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#6dd58c] animate-pulse" />
          <span>Shop Link Verified</span>
        </div>
        <button
          onClick={() => setQrModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md text-xs text-[#D0BCFF] hover:border-[#D0BCFF]/30 transition-all cursor-pointer shadow-sm"
        >
          <QrCode className="w-3.5 h-3.5" />
          <span>QR Scanner</span>
        </button>
      </header>

      {/* Center Brand Identity */}
      <div className="w-full max-w-md my-auto flex flex-col items-center text-center z-10 py-6">
        
        {/* Animated Brand Emblem with Frosted Glass Styling */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="relative mb-6"
        >
          <div className="w-28 h-28 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-3 shadow-2xl shadow-[#D0BCFF]/10 flex items-center justify-center relative group">
            {/* Glow ring */}
            <div className="absolute inset-0 rounded-3xl bg-[#D0BCFF]/20 blur-md opacity-40 group-hover:opacity-80 transition-opacity" />
            
            {/* Inner printer container */}
            <div className="w-full h-full rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center relative overflow-hidden z-10">
              <Printer className="w-12 h-12 text-[#D0BCFF]" />
              {/* Animated laser line */}
              <div className="absolute left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-[#D0BCFF] to-transparent animate-laser shadow-[0_0_8px_#D0BCFF]" />
            </div>
          </div>

          <div className="absolute -bottom-2 -right-2 bg-[#D0BCFF] text-[#381E72] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1">
            <Zap className="w-3 h-3 fill-current" />
            <span>INSTANT</span>
          </div>
        </motion.div>

        {/* Brand Headline */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <h1 className="text-4xl font-extrabold tracking-tight text-white mb-1">
            Auto<span className="text-[#D0BCFF]">Print</span>
          </h1>
          <p className="text-sm text-zinc-400 max-w-xs mx-auto mb-6">
            Contactless Self-Service Print Shop
          </p>
        </motion.div>

        {/* Scanned Shop Card - Frosted Glass */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="w-full bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-5 text-left shadow-xl shadow-black/40 mb-6 relative overflow-hidden"
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-[#D0BCFF]/15 text-[#D0BCFF] flex items-center justify-center flex-shrink-0 border border-[#D0BCFF]/30">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#D0BCFF]/80">
                  Connected Print Shop
                </span>
                <h3 className="text-base font-bold text-white leading-tight flex items-center gap-1.5">
                  {currentShop.name}
                  <CheckCircle2 className="w-4 h-4 text-[#6dd58c] flex-shrink-0" />
                </h3>
              </div>
            </div>
            
            <button
              onClick={() => setShopModalOpen(true)}
              className="text-[11px] font-semibold text-[#D0BCFF] hover:underline flex-shrink-0 mt-0.5"
            >
              Shop Details
            </button>
          </div>

          <div className="bg-black/30 rounded-2xl p-3 text-xs text-zinc-400 space-y-2 border border-white/5">
            <div className="flex justify-between items-center text-zinc-200">
              <span className="text-zinc-400">Branch & Location:</span>
              <span className="text-white font-medium text-right">{currentShop.branch}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Shop Counter:</span>
              <span className="font-mono text-[#D0BCFF] font-semibold">{currentShop.kioskNumber}</span>
            </div>
            <div className="flex justify-between items-center">
              <span>Avg. Print Speed:</span>
              <span className="text-[#6dd58c] flex items-center gap-1 font-medium">
                <Clock className="w-3 h-3" /> ~{currentShop.averageWaitMins} min queue
              </span>
            </div>
          </div>
        </motion.div>

        {/* Action Button & Auto Progress */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="w-full space-y-3"
        >
          <button
            onClick={() => setStep('specs')}
            className="w-full py-4 px-6 rounded-2xl bg-[#D0BCFF] hover:bg-[#decbf7] text-[#381E72] font-black text-base shadow-xl shadow-[#D0BCFF]/15 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer group"
          >
            <span>START PRINT JOB</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Auto-transition bar */}
          <div
            className="flex items-center justify-between text-xs text-zinc-400 px-1 cursor-pointer"
            onClick={() => setIsPaused(!isPaused)}
            title="Click to pause/resume auto start"
          >
            <span>{isPaused ? 'Auto-start paused' : 'Auto-entering shop flow...'}</span>
            <span className="font-mono text-[#D0BCFF] font-semibold">{Math.min(100, Math.round(autoProgress))}%</span>
          </div>
          <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-[#D0BCFF] transition-all duration-100 ease-linear rounded-full shadow-[0_0_8px_#D0BCFF]"
              style={{ width: `${autoProgress}%` }}
            />
          </div>
        </motion.div>

      </div>

      {/* Footer Feature Badges */}
      <footer className="w-full max-w-md z-10 pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-zinc-400">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#6dd58c]" />
          <span>Encrypted Upload</span>
        </div>
        <div className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-[#D0BCFF]" />
          <span>PDF, DOCX, Images</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Zap className="w-3.5 h-3.5 text-[#ffb77c]" />
          <span>UPI & Cash</span>
        </div>
      </footer>
    </div>
  );
};
