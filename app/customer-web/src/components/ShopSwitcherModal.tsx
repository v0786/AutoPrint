import React from 'react';
import { usePrintJob } from '../context/PrintJobContext';
import { Store, MapPin, CheckCircle2, X, QrCode, Printer, Clock, CreditCard, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const ShopSwitcherModal: React.FC = () => {
  const { isShopModalOpen, setShopModalOpen, setQrModalOpen, currentShop } = usePrintJob();

  if (!isShopModalOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-lg bg-[#141419]/95 rounded-3xl p-6 sm:p-7 border border-white/10 backdrop-blur-2xl shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#D0BCFF]/15 text-[#D0BCFF] flex items-center justify-center border border-[#D0BCFF]/30">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Connected Print Shop</h3>
                <p className="text-xs text-zinc-400">Verified shop details from scanned QR code</p>
              </div>
            </div>
            <button
              onClick={() => setShopModalOpen(false)}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Single Scanned Shop Details Card */}
          <div className="p-5 rounded-3xl bg-[#381E72]/40 border border-[#D0BCFF]/40 shadow-xl shadow-[#D0BCFF]/10 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-base font-bold text-white leading-tight">
                    {currentShop.name}
                  </span>
                </div>
                <div className="text-xs text-zinc-300 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#D0BCFF] flex-shrink-0" />
                  <span>{currentShop.branch}</span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#D0BCFF] text-[#381E72] shadow-sm">
                  {currentShop.kioskNumber}
                </span>
                <span className="text-[10px] text-[#6dd58c] font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6dd58c] animate-pulse" />
                  Active
                </span>
              </div>
            </div>

            <div className="text-xs text-zinc-400 bg-black/40 p-3.5 rounded-2xl border border-white/5 space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-400">Full Address:</span>
                <span className="text-zinc-200 text-right max-w-[240px] font-medium">{currentShop.address}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Shop Hardware:</span>
                <span className="text-white font-medium flex items-center gap-1">
                  <Printer className="w-3 h-3 text-[#D0BCFF]" />
                  {currentShop.activePrinters.join(', ')}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Current Queue:</span>
                <span className="text-[#6dd58c] font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  ~{currentShop.averageWaitMins} min wait ({currentShop.queueLength} in queue)
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">UPI Billing VPA:</span>
                <span className="font-mono text-xs text-[#D0BCFF]">{currentShop.upiDetails.vpa}</span>
              </div>
            </div>

            {/* Base Rate Cards */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="p-2.5 rounded-2xl bg-black/30 border border-white/5">
                <div className="text-[10px] text-zinc-400 font-bold uppercase">B&W</div>
                <div className="text-xs font-bold text-white mt-0.5">₹{currentShop.rates.bwSingle.toFixed(2)}/pg</div>
              </div>
              <div className="p-2.5 rounded-2xl bg-black/30 border border-white/5">
                <div className="text-[10px] text-zinc-400 font-bold uppercase">Color</div>
                <div className="text-xs font-bold text-[#D0BCFF] mt-0.5">₹{currentShop.rates.colorSingle.toFixed(2)}/pg</div>
              </div>
              <div className="p-2.5 rounded-2xl bg-black/30 border border-white/5">
                <div className="text-[10px] text-zinc-400 font-bold uppercase">Photo</div>
                <div className="text-xs font-bold text-white mt-0.5">₹{currentShop.rates.photoGlossy.toFixed(2)}/pg</div>
              </div>
            </div>
          </div>

          {/* QR & Close Action Buttons */}
          <div className="flex gap-2.5 pt-1">
            <button
              onClick={() => {
                setShopModalOpen(false);
                setQrModalOpen(true);
              }}
              className="flex-1 py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-zinc-200 hover:text-[#D0BCFF] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              <span>Show Shop QR Standee</span>
            </button>
            <button
              onClick={() => setShopModalOpen(false)}
              className="py-3 px-6 rounded-2xl bg-[#D0BCFF] hover:bg-[#decbf7] text-[#381E72] text-xs font-black transition-all cursor-pointer shadow-md"
            >
              Done
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
