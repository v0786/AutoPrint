import React from 'react';
import { usePrintJob } from '../context/PrintJobContext';
import { useLanguage } from '../context/LanguageContext';
import { AppStep } from '../types';
import { FileSliders, CreditCard, Ticket, Check } from 'lucide-react';

export const StepIndicator: React.FC = () => {
  const { currentStep } = usePrintJob();
  const { t } = useLanguage();

  if (currentStep === 'splash') return null;

  const steps: { id: AppStep; label: string; shortLabel: string; icon: React.ReactNode }[] = [
    { id: 'specs', label: t('stepSpecs'), shortLabel: t('specsShort'), icon: <FileSliders className="w-4 h-4" /> },
    { id: 'payment', label: t('stepPayment'), shortLabel: t('payShort'), icon: <CreditCard className="w-4 h-4" /> },
    { id: 'thankyou', label: t('stepCode'), shortLabel: t('codeShort'), icon: <Ticket className="w-4 h-4" /> },
  ];

  const getStepIndex = (step: AppStep) => {
    switch (step) {
      case 'specs': return 0;
      case 'payment': return 1;
      case 'thankyou': return 2;
      default: return 0;
    }
  };

  const currentIndex = getStepIndex(currentStep);

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-3 sm:px-6">
      <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-2xl p-2 flex items-center justify-between gap-1 shadow-lg shadow-black/20">
        {steps.map((s, idx) => {
          const isActive = idx === currentIndex;
          const isCompleted = idx < currentIndex;

          return (
            <div
              key={s.id}
              className={`flex-1 flex items-center justify-center gap-2 py-2 px-2 sm:px-4 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-[#D0BCFF]/15 text-white border border-[#D0BCFF]/30 shadow-inner'
                  : isCompleted
                  ? 'text-[#6dd58c] bg-white/[0.02]'
                  : 'text-zinc-400 opacity-60 bg-transparent'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                  isActive
                    ? 'bg-[#D0BCFF] text-[#381E72] shadow-md shadow-[#D0BCFF]/30'
                    : isCompleted
                    ? 'bg-[#6dd58c]/20 text-[#6dd58c] border border-[#6dd58c]/40'
                    : 'bg-white/5 text-zinc-400 border border-white/10'
                }`}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
              </div>
              <span className="truncate hidden sm:inline">{s.label}</span>
              <span className="truncate sm:hidden">
                {s.shortLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

