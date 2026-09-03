import React, { useState } from 'react';
import { usePrintJob } from '../context/PrintJobContext';
import { useLanguage } from '../context/LanguageContext';
import { QrCode, Copy, Check, ExternalLink, X, Store, Camera, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const QrCodeModal: React.FC = () => {
  const { isQrModalOpen, setQrModalOpen, currentShop } = usePrintJob();
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [portalQrUrl, setPortalQrUrl] = useState<string | null>(null);

  React.useEffect(() => {
    if (isQrModalOpen) {
      fetch('/api/config/public')
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (json?.data?.qrCodeDataUrl) {
            setPortalQrUrl(json.data.qrCodeDataUrl);
          }
        })
        .catch(() => {});
    }
  }, [isQrModalOpen]);

  if (!isQrModalOpen) return null;

  const currentUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}`
    : 'https://autoprint.pagekite.me';

  const shopName = currentShop?.name || 'AutoPrint Express Store';
  const shopNumber = currentShop ? currentShop.kioskNumber.replace(/Kiosk/gi, 'Shop') : 'Shop #01';
  const qrUrl = portalQrUrl || currentShop?.upiDetails?.qrDataUrl || '/api/config/qr-code';

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
              {shopName}
            </div>

            {/* QR Code Container */}
            <div className="bg-white p-3 rounded-2xl shadow-inner border border-gray-200 inline-block mb-3">
              {qrUrl ? (
                <img src={qrUrl} alt="Shop QR" className="w-40 h-40 object-contain rounded-lg" />
              ) : (
                <svg className="w-40 h-40" viewBox="0 0 100 100" fill="none">
                  <rect x="5" y="5" width="28" height="28" rx="4" fill="#121316" />
                  <rect x="9" y="9" width="20" height="20" rx="2" fill="#fff" />
                  <rect x="13" y="13" width="12" height="12" rx="1" fill="#121316" />

                  <rect x="67" y="5" width="28" height="28" rx="4" fill="#121316" />
                  <rect x="71" y="9" width="20" height="20" rx="2" fill="#fff" />
                  <rect x="75" y="13" width="12" height="12" rx="1" fill="#121316" />

                  <rect x="5" y="67" width="28" height="28" rx="4" fill="#121316" />
                  <rect x="9" y="71" width="20" height="20" rx="2" fill="#fff" />
                  <rect x="13" y="75" width="12" height="12" rx="1" fill="#121316" />

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
              )}
            </div>

            <div className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
              {shopNumber} • SCAN TO PRINT
            </div>
          </div>

          {/* Copyable Web URL */}
          <div className="bg-black/30 rounded-2xl p-3 border border-white/5 space-y-2">
            <div className="text-xs text-zinc-400 flex items-center justify-between">
              <span>Customer Portal URL:</span>
              <span className="text-[#D0BCFF] font-mono text-[11px] truncate max-w-[200px]">
                {currentUrl}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                className="flex-1 py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-200 hover:text-white flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#6dd58c]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied Link' : 'Copy Customer Link'}</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
