import React from 'react';
import { usePrintJob } from '../context/PrintJobContext';
import { useLanguage } from '../context/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { Printer, MapPin, QrCode, Store, ChevronRight, CheckCircle2, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';

export const Header: React.FC = () => {
  const { currentShop, isShopOnline, currentStep, setShopModalOpen, setQrModalOpen, resetJob } = usePrintJob();
  const { t } = useLanguage();

  if (currentStep === 'splash') return null;

  return (
    <header className="sticky top-0 z-40 w-full bg-black/20 backdrop-blur-md border-b border-white/5 transition-all font-sans">
      <div className="max-w-4xl mx-auto px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          
          {/* Brand Logo & Global Status */}
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
                    {t('appName')}
                  </span>
                  <span className="text-[10px] font-medium text-[#D0BCFF]/80 uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#D0BCFF]/10 border border-[#D0BCFF]/20">
                    {t('express')}
                  </span>
                </div>
                <div className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                  <span>{t('selfService')}</span>
                  <span>•</span>
                  {isShopOnline ? (
                    <span className="text-[#6dd58c] flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6dd58c] animate-pulse" />
                      {t('shopOnline')}
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      {t('shopOffline')}
                    </span>
                  )}
                </div>
              </div>
            </button>
          </div>

          {/* Controls: Language Switcher & Shop Details */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Conditional Shop Details Indicator */}
            {isShopOnline && currentShop ? (
              <button
                onClick={() => setShopModalOpen(true)}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full border border-white/10 backdrop-blur-md text-left transition-all group cursor-pointer max-w-[150px] sm:max-w-xs shadow-sm hover:border-[#D0BCFF]/30"
                title="Click to view verified shop details"
              >
                <div className="w-2 h-2 rounded-full bg-[#6dd58c] animate-pulse flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#E6E1E9] truncate group-hover:text-[#D0BCFF] transition-colors flex items-center gap-1">
                    <span className="text-xs font-medium text-zinc-300 hidden sm:inline">{t('shopLabel')}</span>
                    <span className="truncate text-[#D0BCFF] font-semibold">{currentShop.name}</span>
                  </div>
                  <div className="text-[10px] text-zinc-400 truncate hidden sm:flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
                    <span className="truncate">
                      {currentShop.branch} • {currentShop.kioskNumber.replace(/Kiosk/gi, 'Shop')}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0 ml-auto hidden sm:block group-hover:text-[#D0BCFF]" />
              </button>
            ) : (
              <button
                onClick={() => setQrModalOpen(true)}
                className="flex items-center gap-2 bg-amber-500/15 hover:bg-amber-500/25 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full border border-amber-500/30 text-amber-300 transition-all cursor-pointer shadow-sm"
                title="No shop selected. Scan QR to connect"
              >
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-amber-400" />
                <span className="text-xs font-bold truncate">{t('noShopSelected')}</span>
              </button>
            )}

          </div>

        </div>
      </div>
    </header>
  );
};

