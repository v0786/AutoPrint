import React from 'react';
import { usePrintJob } from '../context/PrintJobContext';
import { Printer, MapPin, QrCode, Store, ChevronRight, CheckCircle2, Sparkles, RefreshCw } from 'lucide-react';

export const Header: React.FC = () => {
  const { currentShop, currentStep, setShopModalOpen, setQrModalOpen, resetJob } = usePrintJob();

  if (currentStep === 'splash') return null;

  return (
    <header className="sticky top-0 z-40 w-full bg-black/20 backdrop-blur-md border-b border-white/5 transition-all">
      <div className="max-w-4xl mx-auto px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          
          {/* Brand Logo & Scanned Shop info */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={resetJob}
              title="Return to home / Start fresh"
              className="flex items-center gap-3 group text-left focus:outline-none cursor-pointer"
            >
              <div className="w-10 h-10 bg-[#D0BCFF] rounded-xl flex items-center justify-center shadow-lg shadow-[#D0BCFF]/20 flex-shrink-0 group-hover:scale-105 transition-transform">
                <Printer className="w-5 h-5 text-[#381E72] stroke-[2.5]" />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-bold tracking-tight text-white leading-none group-hover:text-[#D0BCFF] transition-colors">
                    AutoPrint
                  </span>
                  <span className="text-[10px] font-medium text-[#D0BCFF]/80 uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#D0BCFF]/10 border border-[#D0BCFF]/20">
                    Express
                  </span>
                </div>
                <div className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                  <span>Self-Service</span>
                  <span>•</span>
                  <span className="text-[#6dd58c] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#6dd58c] animate-pulse" />
                    Online
                  </span>
                </div>
              </div>
            </button>
          </div>

          {/* Scanned Shop Indicator Banner */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShopModalOpen(true)}
              className="flex items-center gap-2.5 bg-white/5 hover:bg-white/10 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-full border border-white/10 backdrop-blur-md text-left transition-all group cursor-pointer max-w-[210px] sm:max-w-xs shadow-sm hover:border-[#D0BCFF]/30"
              title="Click to view shop details"
            >
              <div className="w-2 h-2 rounded-full bg-[#6dd58c] animate-pulse flex-shrink-0" />
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#E6E1E9] truncate group-hover:text-[#D0BCFF] transition-colors flex items-center gap-1">
                  <span className="text-xs font-medium text-zinc-300">Shop:</span>
                  <span className="truncate text-[#D0BCFF] font-semibold">{currentShop.name}</span>
                </div>
                <div className="text-[10px] text-zinc-400 truncate flex items-center gap-1">
                  <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                  <span className="truncate">{currentShop.branch} • {currentShop.kioskNumber}</span>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0 ml-auto hidden sm:block group-hover:text-[#D0BCFF]" />
            </button>

            {/* QR Code trigger */}
            <button
              onClick={() => setQrModalOpen(true)}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md text-zinc-300 hover:text-[#D0BCFF] hover:border-[#D0BCFF]/30 transition-all cursor-pointer shadow-sm"
              title="Show Shop QR Code"
              aria-label="Show Shop QR Code"
            >
              <QrCode className="w-4 h-4" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
