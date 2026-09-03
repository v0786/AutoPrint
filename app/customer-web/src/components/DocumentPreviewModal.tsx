import React from 'react';
import { usePrintJob } from '../context/PrintJobContext';
import { useLanguage } from '../context/LanguageContext';
import {
  X,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DocumentPreview } from './DocumentPreview';

export const DocumentPreviewModal: React.FC = () => {
  const { isPreviewModalOpen, setPreviewModalOpen, uploadedFile, setUploadedFile, updateUploadedFilePageCount, setStep } = usePrintJob();
  const { t } = useLanguage();

  if (!isPreviewModalOpen || !uploadedFile) return null;

  const handleConfirmAndProceed = () => {
    setPreviewModalOpen(false);
    setStep('payment');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md font-sans">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-3xl bg-[#141419]/95 rounded-3xl border border-white/10 backdrop-blur-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden text-[#E6E1E9]"
        >
          {/* Top Modal Header */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-3 bg-white/[0.02]">
            <div>
              <h3 className="text-sm font-bold text-white">
                {t('previewDoc')} — Fullscreen Visual Inspection
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Verify formatting, page count, and layout before sending to printer queue.
              </p>
            </div>

            <button
              onClick={() => setPreviewModalOpen(false)}
              className="p-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title={t('close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body with DocumentPreview */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-black/40">
            <DocumentPreview
              uploadedFile={uploadedFile}
              onRemove={() => {
                setPreviewModalOpen(false);
                setUploadedFile(null);
              }}
              onPageCountExtracted={updateUploadedFilePageCount}
            />
          </div>

          {/* Modal Footer with Actions */}
          <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between gap-3">
            <button
              onClick={() => setPreviewModalOpen(false)}
              className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-white transition-colors cursor-pointer"
            >
              {t('close')}
            </button>

            <button
              onClick={handleConfirmAndProceed}
              className="px-5 py-2.5 rounded-2xl bg-[#D0BCFF] hover:bg-[#D0BCFF]/90 text-[#381E72] text-xs font-bold shadow-lg shadow-[#D0BCFF]/20 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>{t('proceedToPayment')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
