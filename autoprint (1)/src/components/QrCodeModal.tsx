import React, { useState } from 'react';
import { usePrintJob } from '../context/PrintJobContext';
import { QrCode, Copy, Check, ExternalLink, X, Store, Camera, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DEFAULT_SHOP_ID, SHOPS_DATABASE } from '../data/shops';

export const QrCodeModal: React.FC = () => {
  const { isQrModalOpen, setQrModalOpen, currentShop } = usePrintJob();
  const [copied, setCopied] = useState(false);

  if (!isQrModalOpen) return null;

  const targetShop = currentShop || SHOPS_DATABASE[DEFAULT_SHOP_ID];
  const targetId = targetShop.id;
  const currentUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?shop=${targetId}`
    : `https://autoprint.vercel.app/?shop=${targetId}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-md bg-[#141419]/95 rounded-3xl p-6 sm:p-7 border border-white/10 backdrop-blur-2xl shadow-2xl space-y-5 text-center text-[#E6E1E9]"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-left">
              <div className="w-9 h-9 rounded-2xl bg-[#D0BCFF]/15 text-[#D0BCFF] flex items-center justify-center border border-[#D0BCFF]/30">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Physical Shop QR Standee</h3>
                <p className="text-[11px] text-zinc-400">Scannable by customer mobile phones</p>
              </div>
            </div>
            <button
              onClick={() => setQrModalOpen(false)}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Shop Physical Standee Preview */}
          <div className="p-6 bg-gradient-to-b from-[#ffffff] to-[#ede8f5] rounded-3xl text-gray-900 shadow-xl border-4 border-white/20 max-w-[280px] mx-auto relative">
            <div className="text-[10px] font-black uppercase tracking-widest text-[#381E72] mb-1">
              AUTOPRINT SELF-SERVICE SHOP
            </div>
            <div className="text-xs font-black text-gray-900 leading-tight mb-3">
              {targetShop.name}
            </div>

            {/* Simulated High-Res QR SVG */}
            <div className="bg-white p-3 rounded-2xl shadow-inner border border-gray-200 inline-block mb-3">
              <svg className="w-40 h-40" viewBox="0 0 100 100" fill="none">
                {/* Outer Markers */}
                <rect x="5" y="5" width="28" height="28" rx="4" fill="#121316" />
                <rect x="9" y="9" width="20" height="20" rx="2" fill="#fff" />
                <rect x="13" y="13" width="12" height="12" rx="1" fill="#121316" />

                <rect x="67" y="5" width="28" height="28" rx="4" fill="#121316" />
                <rect x="71" y="9" width="20" height="20" rx="2" fill="#fff" />
                <rect x="75" y="13" width="12" height="12" rx="1" fill="#121316" />

                <rect x="5" y="67" width="28" height="28" rx="4" fill="#121316" />
                <rect x="9" y="71" width="20" height="20" rx="2" fill="#fff" />
                <rect x="13" y="75" width="12" height="12" rx="1" fill="#121316" />

                {/* Pattern blocks */}
                <rect x="38" y="8" width="6" height="6" fill="#121316" />
                <rect x="50" y="8" width="10" height="6" fill="#121316" />
                <rect x="38" y="20" width="8" height="8" fill="#121316" />
                <rect x="52" y="20" width="8" height="8" fill="#121316" />

                <rect x="10" y="42" width="6" height="10" fill="#121316" />
                <rect x="22" y="42" width="14" height="6" fill="#121316" />
                <rect x="42" y="38" width="16" height="16" rx="4" fill="#381E72" />
                <rect x="64" y="42" width="10" height="6" fill="#121316" />
                <rect x="80" y="42" width="10" height="10" fill="#121316" />

                <rect x="38" y="60" width="8" height="6" fill="#121316" />
                <rect x="52" y="60" width="6" height="8" fill="#121316" />
                <rect x="66" y="60" width="8" height="6" fill="#121316" />
                <rect x="80" y="60" width="10" height="8" fill="#121316" />

                <rect x="38" y="74" width="10" height="18" fill="#121316" />
                <rect x="54" y="74" width="8" height="8" fill="#121316" />
                <rect x="68" y="74" width="8" height="18" fill="#121316" />
                <rect x="82" y="74" width="8" height="8" fill="#121316" />
              </svg>
            </div>

            <div className="text-[11px] font-bold text-[#381E72] flex items-center justify-center gap-1">
              <Camera className="w-3.5 h-3.5" />
              <span>Scan with Phone Camera</span>
            </div>
            <div className="text-[9px] text-gray-500 font-mono mt-0.5">
              Counter: {targetShop.kioskNumber.replace(/Kiosk/gi, 'Shop')}
            </div>
          </div>

          {/* URL & Action buttons */}
          <div className="space-y-2 text-left">
            <label className="text-[11px] font-semibold text-zinc-400 block">
              Direct Shop Target URL:
            </label>
            <div className="flex items-center gap-2 bg-black/40 p-2.5 rounded-2xl border border-white/10">
              <span className="font-mono text-xs text-[#D0BCFF] truncate flex-1 px-1">
                {currentUrl}
              </span>
              <button
                onClick={handleCopy}
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs text-zinc-300 hover:text-[#D0BCFF] transition-colors cursor-pointer"
                title="Copy Shop URL"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#6dd58c]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => {
                window.open(currentUrl, '_blank');
              }}
              className="flex-1 py-3.5 rounded-2xl bg-[#D0BCFF] hover:bg-[#decbf7] text-[#381E72] text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#D0BCFF]/15"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open in New Tab</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
