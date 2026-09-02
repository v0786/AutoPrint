import React, { useEffect, useState, useRef } from 'react';
import { usePrintJob } from '../context/PrintJobContext';
import { speakCollectionCode, downloadReceipt } from '../utils/helpers';
import confetti from 'canvas-confetti';
import {
  Ticket,
  Volume2,
  Copy,
  Check,
  Printer,
  CheckCircle2,
  Clock,
  MapPin,
  Store,
  FileText,
  Share2,
  Download,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Banknote,
  Smartphone,
  FileCheck2,
} from 'lucide-react';
import { motion } from 'motion/react';

export const ThankYouStep: React.FC = () => {
  const { currentOrder, currentShop, jobStatus, resetJob } = usePrintJob();
  const [copied, setCopied] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoDownloaded, setAutoDownloaded] = useState(false);
  const hasDownloadedRef = useRef(false);

  useEffect(() => {
    // Launch celebratory confetti
    try {
      confetti({
        particleCount: 85,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#D0BCFF', '#6dd58c', '#ffb77c', '#381E72'],
      });
    } catch {
      // safe fallback
    }

    // Automatically trigger local receipt download
    if (currentOrder && !hasDownloadedRef.current) {
      hasDownloadedRef.current = true;
      try {
        downloadReceipt(currentOrder, currentShop);
        setAutoDownloaded(true);
      } catch (err) {
        console.error('Auto receipt download error:', err);
      }
    }
  }, [currentOrder, currentShop]);

  if (!currentOrder) {
    return (
      <div className="max-w-md mx-auto p-6 text-center text-zinc-400 font-sans">
        No active order found.{' '}
        <button onClick={resetJob} className="text-[#D0BCFF] underline font-bold">
          Start new print job
        </button>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(currentOrder.collectionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSpeak = () => {
    setIsSpeaking(true);
    speakCollectionCode(currentOrder.collectionCode);
    setTimeout(() => setIsSpeaking(false), 4000);
  };

  const handleShare = () => {
    const text = `AutoPrint Collection Code: ${currentOrder.collectionCode} at ${currentShop.name} (${currentShop.kioskNumber}). Amount: ₹${currentOrder.pricing.totalAmount}.`;
    if (navigator.share) {
      navigator.share({
        title: 'AutoPrint Collection Code',
        text: text,
        url: window.location.href,
      }).catch(() => {});
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    }
  };

  const handleManualDownloadReceipt = () => {
    downloadReceipt(currentOrder, currentShop);
    setAutoDownloaded(true);
  };

  const isCash = currentOrder.payment.method === 'cash';

  return (
    <div className="max-w-3xl mx-auto px-4 pb-24 sm:px-6 pt-2 space-y-6 font-sans">
      
      {/* 1. TOP HERO BADGE */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center space-y-2 pt-2"
      >
        <div className="w-16 h-16 rounded-3xl bg-[#6dd58c]/15 text-[#6dd58c] mx-auto flex items-center justify-center border border-[#6dd58c]/30 shadow-lg shadow-[#6dd58c]/10">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Print Job Sent to Shop!
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md mx-auto">
          Provide your 8-digit collection code verbally at the counter to collect your prints.
        </p>

        {/* Automatic Receipt Download Notice */}
        {autoDownloaded && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#6dd58c]/15 text-[#8cf6aa] border border-[#6dd58c]/30 text-xs font-semibold shadow-sm mt-1"
          >
            <FileCheck2 className="w-3.5 h-3.5 text-[#6dd58c]" />
            <span>Digital receipt downloaded automatically to your device</span>
          </motion.div>
        )}
      </motion.div>

      {/* 2. THE 8-DIGIT COLLECTION CODE CARD (HERO ELEMENT) */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="bg-white/5 border-2 border-[#D0BCFF]/40 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 shadow-2xl shadow-[#D0BCFF]/10 text-center relative overflow-hidden group"
      >
        {/* Ambient glow */}
        <div className="absolute inset-0 bg-[#D0BCFF]/5 blur-2xl pointer-events-none" />

        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#D0BCFF]/15 text-[#D0BCFF] text-xs font-bold uppercase tracking-wider mb-3 border border-[#D0BCFF]/30">
          <Ticket className="w-3.5 h-3.5" />
          <span>Your 8-Digit Collection Code</span>
        </div>

        {/* Big High Contrast Digits */}
        <div className="my-3">
          <div className="font-mono text-4xl sm:text-5xl font-black tracking-widest text-[#D0BCFF] drop-shadow-[0_0_20px_rgba(208,188,255,0.4)] select-all py-1">
            {currentOrder.collectionCode}
          </div>
          <div className="text-xs text-zinc-400 mt-1">
            Verbally recite this code to the cashier at the counter
          </div>
        </div>

        {/* Action Pills: Speak Code, Copy, Share */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-3">
          {/* Speak aloud */}
          <button
            onClick={handleSpeak}
            className={`px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              isSpeaking
                ? 'bg-[#6dd58c] text-[#00391a] animate-pulse shadow-md'
                : 'bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 hover:text-[#D0BCFF] hover:border-[#D0BCFF]/30'
            }`}
            title="Listen to the code spoken aloud digit-by-digit"
          >
            <Volume2 className="w-4 h-4" />
            <span>{isSpeaking ? 'Reading Aloud...' : 'Read Aloud'}</span>
          </button>

          {/* Copy code */}
          <button
            onClick={handleCopy}
            className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-200 hover:text-[#D0BCFF] hover:border-[#D0BCFF]/30 flex items-center gap-2 transition-all cursor-pointer"
          >
            {copied ? <Check className="w-4 h-4 text-[#6dd58c]" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>

          {/* Share */}
          <button
            onClick={handleShare}
            className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-200 hover:text-[#D0BCFF] hover:border-[#D0BCFF]/30 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Share2 className="w-4 h-4" />
            <span>Share</span>
          </button>
        </div>

        {/* Cash Notice Banner if Cash Method */}
        {isCash && (
          <div className="mt-5 p-3.5 rounded-2xl bg-[#ffb77c]/15 border border-[#ffb77c]/30 text-[#ffdcc3] text-xs flex items-center justify-center gap-2 font-medium">
            <Banknote className="w-4 h-4 text-[#ffb77c]" />
            <span>
              Cash Due at Counter: <strong className="text-white font-mono">₹{currentOrder.pricing.totalAmount.toFixed(2)}</strong>
            </span>
          </div>
        )}
      </motion.div>

      {/* 3. LIVE SHOP QUEUE & PRINTER TRACKER */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-xl shadow-black/40 space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#D0BCFF]/15 text-[#D0BCFF] flex items-center justify-center border border-[#D0BCFF]/30">
              <Printer className="w-4 h-4" />
            </div>
            <h2 className="text-sm font-bold text-white">Live Print Queue Status</h2>
          </div>
          <div className="text-xs text-zinc-400 flex items-center gap-1.5 bg-black/30 px-3 py-1.5 rounded-full border border-white/10">
            <Clock className="w-3.5 h-3.5 text-[#ffb77c]" />
            <span>Est. Ready: </span>
            <span className="text-white font-semibold">{currentOrder.estimatedCompletionTime}</span>
          </div>
        </div>

        {/* Step progress timeline */}
        <div className="grid grid-cols-3 gap-2.5 text-center pt-2">
          {/* Step 1: Queued */}
          <div className={`p-3.5 rounded-2xl border transition-all ${
            jobStatus === 'queued'
              ? 'bg-[#381E72]/60 border-[#D0BCFF] text-white shadow-md'
              : 'bg-black/30 border-white/10 text-[#6dd58c]'
          }`}>
            <div className="text-xs font-bold">1. Queued</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Order Received</div>
          </div>

          {/* Step 2: Printing */}
          <div className={`p-3.5 rounded-2xl border transition-all ${
            jobStatus === 'printing'
              ? 'bg-[#381E72]/60 border-[#D0BCFF] text-white shadow-md animate-pulse'
              : jobStatus === 'ready'
              ? 'bg-black/30 border-white/10 text-[#6dd58c]'
              : 'bg-black/30 border-white/10 text-zinc-500'
          }`}>
            <div className="text-xs font-bold">2. Printing</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">Laser Processing</div>
          </div>

          {/* Step 3: Ready */}
          <div className={`p-3.5 rounded-2xl border transition-all ${
            jobStatus === 'ready'
              ? 'bg-[#005228]/50 border-[#6dd58c] text-[#8cf6aa] shadow-lg'
              : 'bg-black/30 border-white/10 text-zinc-500'
          }`}>
            <div className="text-xs font-bold">3. Ready</div>
            <div className="text-[10px] text-zinc-400 mt-0.5">At Counter</div>
          </div>
        </div>

        <div className="bg-black/30 rounded-2xl p-3.5 text-xs text-zinc-400 flex items-center justify-between border border-white/5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#6dd58c] animate-pulse" />
            <span>Shop Hardware: <strong className="text-white">{currentShop.activePrinters[0]}</strong></span>
          </div>
          <span className="text-[#D0BCFF] font-mono font-semibold">{currentShop.kioskNumber}</span>
        </div>
      </motion.div>

      {/* 4. DIGITAL RECEIPT CARD */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-xl shadow-black/40 space-y-4 print:bg-white print:text-black"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-400 tracking-wider">Digital Receipt</span>
            <div className="text-sm font-bold text-white">{currentOrder.orderId}</div>
          </div>
          <button
            onClick={handleManualDownloadReceipt}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-[#D0BCFF] transition-colors cursor-pointer print:hidden"
            title="Download receipt text file to device"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Receipt</span>
          </button>
        </div>

        <div className="space-y-2.5 text-xs text-zinc-400">
          <div className="flex justify-between">
            <span>Shop & Counter:</span>
            <span className="text-white font-semibold">{currentShop.name} ({currentShop.branch})</span>
          </div>
          <div className="flex justify-between">
            <span>Document:</span>
            <span className="text-white font-semibold">{currentOrder.file.name}</span>
          </div>
          <div className="flex justify-between">
            <span>Specs:</span>
            <span className="text-[#D0BCFF] capitalize">
              {currentOrder.specs.colorMode} • {currentOrder.specs.duplex} • {currentOrder.specs.paperSize.toUpperCase()} • {currentOrder.specs.selectedPagesCount} pgs × {currentOrder.specs.copies} copy
            </span>
          </div>
          <div className="flex justify-between">
            <span>Payment Mode:</span>
            <span className="text-[#6dd58c] font-semibold uppercase">
              {currentOrder.payment.method === 'upi' ? `UPI (${currentOrder.payment.upiApp?.toUpperCase()})` : 'Pay Cash at Counter'}
            </span>
          </div>
          <div className="flex justify-between pt-3 border-t border-white/10 text-sm font-bold">
            <span className="text-white">Total Amount:</span>
            <span className="text-[#D0BCFF] font-mono text-base">₹{currentOrder.pricing.totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </motion.div>

      {/* 5. BOTTOM ACTIONS */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          onClick={resetJob}
          className="flex-1 py-4 rounded-2xl bg-[#D0BCFF] hover:bg-[#decbf7] text-[#381E72] text-sm font-black shadow-xl shadow-[#D0BCFF]/15 hover:scale-[1.01] active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 stroke-[3]" />
          <span>PRINT ANOTHER DOCUMENT</span>
        </button>
      </div>

    </div>
  );
};
