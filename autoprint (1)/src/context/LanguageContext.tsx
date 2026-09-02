import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { LanguageOption } from '../types';
import { usePrintJob } from './PrintJobContext';
import { SUPPORTED_LANGUAGES, TranslationKey, translate } from '../utils/translations';

interface LanguageContextType {
  currentLanguage: string;
  activeLanguageOption: LanguageOption;
  shopLocalLanguage: LanguageOption;
  isLocalLanguageActive: boolean;
  supportedLanguages: LanguageOption[];
  setLanguage: (code: string) => void;
  toggleShopLanguage: () => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const DEFAULT_LOCAL_LANGUAGE: LanguageOption = {
  code: 'hi',
  name: 'Hindi',
  nativeName: 'हिन्दी',
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentShop } = usePrintJob();

  // Primary local language configured for the connected print shop
  const shopLocalLanguage: LanguageOption = useMemo(() => {
    if (currentShop?.primaryLanguage) {
      return currentShop.primaryLanguage;
    }
    return DEFAULT_LOCAL_LANGUAGE;
  }, [currentShop]);

  const [currentLanguage, setCurrentLanguageState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('autoprint_user_language');
      if (saved) return saved;
    }
    return 'en';
  });

  const setLanguage = (code: string) => {
    setCurrentLanguageState(code);
    if (typeof window !== 'undefined') {
      localStorage.setItem('autoprint_user_language', code);
    }
  };

  // Toggle directly between English and the print shop's local language
  const toggleShopLanguage = () => {
    if (currentLanguage === 'en') {
      setLanguage(shopLocalLanguage.code);
    } else {
      setLanguage('en');
    }
  };

  const isLocalLanguageActive = currentLanguage === shopLocalLanguage.code;

  const activeLanguageOption = useMemo(() => {
    return (
      SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage) || {
        code: currentLanguage,
        name: currentLanguage.toUpperCase(),
        nativeName: currentLanguage.toUpperCase(),
      }
    );
  }, [currentLanguage]);

  const t = (key: TranslationKey, params?: Record<string, string | number>) => {
    return translate(currentLanguage, key, params);
  };

  return (
    <LanguageContext.Provider
      value={{
        currentLanguage,
        activeLanguageOption,
        shopLocalLanguage,
        isLocalLanguageActive,
        supportedLanguages: SUPPORTED_LANGUAGES,
        setLanguage,
        toggleShopLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
