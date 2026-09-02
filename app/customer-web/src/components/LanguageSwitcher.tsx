import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { Globe, Check, ChevronDown, Sparkles, Languages } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LanguageSwitcherProps {
  variant?: 'header' | 'compact' | 'expanded';
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'header',
  className = '',
}) => {
  const {
    currentLanguage,
    setLanguage,
    shopLocalLanguage,
    supportedLanguages,
    toggleShopLanguage,
    t,
  } = useLanguage();

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const isEnglish = currentLanguage === 'en';
  const isShopLocal = currentLanguage === shopLocalLanguage.code;

  if (variant === 'compact') {
    return (
      <div className={`relative inline-flex items-center ${className}`} ref={dropdownRef}>
        <button
          onClick={toggleShopLanguage}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-200 hover:text-white transition-all cursor-pointer shadow-sm hover:border-[#D0BCFF]/30"
          title={`Switch between English and ${shopLocalLanguage.name} (${shopLocalLanguage.nativeName})`}
        >
          <Globe className="w-3.5 h-3.5 text-[#D0BCFF]" />
          <span className="text-zinc-400 font-mono text-[11px]">
            {currentLanguage.toUpperCase()}
          </span>
          <span className="text-zinc-500">⇄</span>
          <span className="text-[#D0BCFF] font-medium text-xs">
            {isEnglish ? shopLocalLanguage.nativeName : 'English'}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className={`relative inline-flex items-center ${className}`} ref={dropdownRef}>
      {/* 2-Segment Pill Toggle for Fast 1-Click Switch */}
      <div className="flex items-center bg-black/40 border border-white/10 backdrop-blur-md rounded-full p-0.5 shadow-sm">
        {/* English Button */}
        <button
          type="button"
          onClick={() => setLanguage('en')}
          className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
            isEnglish
              ? 'bg-[#D0BCFF] text-[#381E72] shadow-sm shadow-[#D0BCFF]/20'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
          title="Switch to English"
        >
          <span>EN</span>
        </button>

        {/* Shop's Primary Local Language Button */}
        <button
          type="button"
          onClick={() => setLanguage(shopLocalLanguage.code)}
          className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
            isShopLocal
              ? 'bg-[#D0BCFF] text-[#381E72] shadow-sm shadow-[#D0BCFF]/20'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5'
          }`}
          title={`Switch to shop local language: ${shopLocalLanguage.name} (${shopLocalLanguage.nativeName})`}
        >
          <span>{shopLocalLanguage.nativeName}</span>
        </button>

        {/* More Languages Dropdown Trigger */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="p-1 pr-1.5 rounded-full text-zinc-400 hover:text-[#D0BCFF] transition-colors cursor-pointer"
          title="More regional languages"
          aria-label="Select language"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown Menu for All Supported Regional Languages */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-64 bg-[#141419]/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 shadow-2xl z-50 text-left font-sans"
          >
            {/* Header / Shop Local Language info */}
            <div className="px-2.5 py-2 border-b border-white/5 mb-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                  <Languages className="w-3 h-3 text-[#D0BCFF]" />
                  <span>{t('selectLanguage')}</span>
                </span>
              </div>
              <div className="text-[11px] text-zinc-300 mt-1 flex items-center gap-1">
                <span className="text-zinc-500">Shop Local:</span>
                <span className="text-[#D0BCFF] font-semibold">{shopLocalLanguage.name} ({shopLocalLanguage.nativeName})</span>
              </div>
            </div>

            {/* List of languages */}
            <div className="max-h-60 overflow-y-auto space-y-0.5 py-1 custom-scrollbar">
              {supportedLanguages.map((lang) => {
                const isSelected = currentLanguage === lang.code;
                const isShopNative = lang.code === shopLocalLanguage.code;

                return (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setLanguage(lang.code);
                      setIsOpen(false);
                    }}
                    className={`w-full px-2.5 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#D0BCFF]/15 text-[#D0BCFF] font-bold border border-[#D0BCFF]/30'
                        : 'text-zinc-300 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{lang.nativeName}</span>
                      <span className="text-[10px] text-zinc-400 font-normal">({lang.name})</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isShopNative && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#6dd58c]/15 text-[#8cf6aa] border border-[#6dd58c]/30 font-semibold">
                          Shop
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#D0BCFF]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
