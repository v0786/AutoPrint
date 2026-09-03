import React, { useRef, useState } from 'react';
import { usePrintJob } from '../context/PrintJobContext';
import { useLanguage } from '../context/LanguageContext';
import {
  ColorMode,
  DuplexMode,
  FinishingOption,
  PaperSize,
} from '../types';
import { parseCustomPageRange } from '../utils/helpers';
import {
  Upload,
  Sparkles,
  AlertCircle,
  ArrowRight,
  Sliders,
  AlertTriangle,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { DocumentPreview } from './DocumentPreview';

export const UploadAndSpecsStep: React.FC = () => {
  const {
    uploadedFile,
    setUploadedFile,
    handleFileUpload,
    updateUploadedFilePageCount,
    specs,
    updateSpecs,
    setPageRangeString,
    pricing,
    currentShop,
    isShopOnline,
    isHeavyWorkload,
    queueWorkloadMessage,
    setPreviewModalOpen,
    setStep,
  } = usePrintJob();
  const { t } = useLanguage();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setValidationError(null);
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleRangeChange = (value: string) => {
    setValidationError(null);
    const total = uploadedFile?.totalPages || 1;
    const parsed = parseCustomPageRange(value, total);
    setPageRangeString(value);
    if (!parsed.valid && value.trim() !== '') {
      setValidationError(parsed.error || 'Invalid page range');
    } else {
      setValidationError(null);
    }
  };

  const validateAndProceed = () => {
    if (!isShopOnline) {
      setValidationError(t('noShopSelected') + ' - ' + t('scanShopQrDesc'));
      return;
    }

    if (!uploadedFile) {
      setValidationError(t('uploadDocument') + ': ' + t('tapToUpload'));
      return;
    }

    if (specs.pageRangeType === 'custom') {
      const parsed = parseCustomPageRange(specs.customPageRange, uploadedFile.totalPages);
      if (!parsed.valid) {
        setValidationError(parsed.error || 'Please enter a valid page range.');
        return;
      }
    }

    if (specs.copies < 1) {
      setValidationError('Copies must be at least 1.');
      return;
    }

    setValidationError(null);
    // Proceed to Payment / Order Summary Step
    setStep('payment');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pb-36 sm:px-6 pt-2 space-y-6 font-sans">
      {/* 1. Offline Shop Alert Banner */}
      {!isShopOnline && (
        <div className="p-4 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-200 flex items-start gap-3.5 shadow-lg">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-amber-100 text-sm">{t('noShopSelected')}</h4>
            <p className="leading-relaxed text-amber-200/90">{t('scanShopQrDesc')}</p>
          </div>
        </div>
      )}

      {/* 2. Validation Error Alert Banner */}
      <AnimatePresence>
        {validationError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-3.5 rounded-2xl bg-[#93000a]/20 border border-[#ffb4ab]/30 text-[#ffb4ab] flex items-center gap-3 text-xs sm:text-sm font-medium shadow-md"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#ffb4ab]" />
            <span className="flex-1">{validationError}</span>
            <button
              type="button"
              onClick={() => setValidationError(null)}
              className="text-xs underline hover:text-white cursor-pointer"
            >
              {t('close')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Dynamic Queue Workload Banner */}
      {isHeavyWorkload && queueWorkloadMessage && (
        <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 flex items-center gap-3.5 text-xs text-amber-300">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <p className="font-medium leading-relaxed">{queueWorkloadMessage}</p>
        </div>
      )}

      {/* 4. DOCUMENT UPLOAD & AUTOMATIC LIVE PREVIEW SECTION */}
      {!uploadedFile ? (
        <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-xl shadow-black/40 space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#D0BCFF]/15 text-[#D0BCFF] flex items-center justify-center border border-[#D0BCFF]/30">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{t('stepSpecs')} — {t('uploadDocument')}</h2>
              <p className="text-xs text-zinc-400">{t('supportedFiles')}</p>
            </div>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#D0BCFF] bg-[#D0BCFF]/10'
                : 'border-white/15 hover:border-[#D0BCFF]/50 bg-black/30 hover:bg-white/[0.02]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.doc,.pptx,.jpg,.jpeg,.png,.webp,.txt"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  setValidationError(null);
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />

            <div className="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#D0BCFF] shadow-inner">
              <Upload className="w-7 h-7 animate-bounce" />
            </div>
            <p className="text-base font-bold text-white mb-1">
              {t('tapToUpload')}
            </p>
            <p className="text-xs text-zinc-400 mb-4">
              {t('supportedFiles')}
            </p>

            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-300">
              <Sparkles className="w-3.5 h-3.5 text-[#D0BCFF]" />
              <span>{t('encryptedUpload')}</span>
            </div>
          </div>
        </div>
      ) : (
        /* AUTOMATIC DOCUMENT PREVIEW AFTER UPLOAD */
        <DocumentPreview
          uploadedFile={uploadedFile}
          onRemove={() => setUploadedFile(null)}
          onExpand={() => setPreviewModalOpen(true)}
          onPageCountExtracted={updateUploadedFilePageCount}
        />
      )}

      {/* 5. PRINT SPECIFICATIONS CONFIGURATION */}
      <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-xl shadow-black/40 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-[#D0BCFF]/15 text-[#D0BCFF] flex items-center justify-center border border-[#D0BCFF]/30">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">{t('stepSpecs')}</h2>
            <p className="text-xs text-zinc-400">{t('colorMode')}, {t('paperSize')}, {t('sidesDuplex')}</p>
          </div>
        </div>

        {/* 1. Color Mode */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
            <span>{t('colorMode')}</span>
            <span className="text-[11px] text-zinc-400 font-normal">{t('avgPrintSpeed')} Instant</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: 'bw' as ColorMode,
                title: t('bw'),
                desc: t('bwDesc'),
                rate: `₹${(currentShop?.rates.bwSingle || 2).toFixed(2)}/${t('page')}`,
              },
              {
                id: 'color' as ColorMode,
                title: t('color'),
                desc: t('colorDesc'),
                rate: `₹${(currentShop?.rates.colorSingle || 10).toFixed(2)}/${t('page')}`,
              },
              {
                id: 'photo' as ColorMode,
                title: t('photo'),
                desc: t('photoDesc'),
                rate: `₹${(currentShop?.rates.photoGlossy || 25).toFixed(2)}/${t('page')}`,
              },
            ].map((opt) => {
              const selected = specs.colorMode === opt.id;
              return (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => updateSpecs({ colorMode: opt.id })}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    selected
                      ? 'border-[#D0BCFF] bg-[#D0BCFF]/10 shadow-lg shadow-[#D0BCFF]/10'
                      : 'border-white/10 hover:border-white/20 bg-black/20'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-bold text-white">{opt.title}</span>
                    <span className="text-xs font-mono font-bold text-[#D0BCFF]">{opt.rate}</span>
                  </div>
                  <span className="text-xs text-zinc-400">{opt.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Paper Size & Duplex */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              {t('paperSize')}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['a4', 'a3', 'legal'] as PaperSize[]).map((size) => (
                <button
                  type="button"
                  key={size}
                  onClick={() => updateSpecs({ paperSize: size })}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold uppercase transition-all cursor-pointer ${
                    specs.paperSize === size
                      ? 'border-[#D0BCFF] bg-[#D0BCFF]/15 text-[#D0BCFF]'
                      : 'border-white/10 hover:border-white/20 bg-black/20 text-zinc-300'
                  }`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              {t('sidesDuplex')}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'single' as DuplexMode, label: t('singleSided') },
                { id: 'double' as DuplexMode, label: t('doubleSided') },
              ].map((d) => (
                <button
                  type="button"
                  key={d.id}
                  onClick={() => updateSpecs({ duplex: d.id })}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                    specs.duplex === d.id
                      ? 'border-[#D0BCFF] bg-[#D0BCFF]/15 text-[#D0BCFF]'
                      : 'border-white/10 hover:border-white/20 bg-black/20 text-zinc-300'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Copies and Page Range Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              {t('copies')}
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => updateSpecs({ copies: Math.max(1, specs.copies - 1) })}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-base flex items-center justify-center cursor-pointer"
              >
                -
              </button>
              <span className="font-mono text-lg font-bold text-white w-12 text-center">
                {specs.copies}
              </span>
              <button
                type="button"
                onClick={() => updateSpecs({ copies: specs.copies + 1 })}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-base flex items-center justify-center cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              {t('pageRange')}
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => updateSpecs({ pageRangeType: 'all' })}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  specs.pageRangeType === 'all'
                    ? 'border-[#D0BCFF] bg-[#D0BCFF]/15 text-[#D0BCFF]'
                    : 'border-white/10 hover:border-white/20 bg-black/20 text-zinc-300'
                }`}
              >
                {t('allPages')} ({uploadedFile?.totalPages || 1})
              </button>
              <button
                type="button"
                onClick={() => updateSpecs({ pageRangeType: 'custom' })}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  specs.pageRangeType === 'custom'
                    ? 'border-[#D0BCFF] bg-[#D0BCFF]/15 text-[#D0BCFF]'
                    : 'border-white/10 hover:border-white/20 bg-black/20 text-zinc-300'
                }`}
              >
                {t('customRange')}
              </button>
            </div>

            {specs.pageRangeType === 'custom' && (
              <input
                type="text"
                placeholder={t('customRangePlaceholder')}
                value={specs.customPageRange}
                onChange={(e) => handleRangeChange(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D0BCFF]"
              />
            )}
          </div>
        </div>

        {/* 4. Document Finishing Options */}
        <div className="space-y-2 pt-2 border-t border-white/5">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
            {t('finishing')}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { id: 'none' as FinishingOption, title: t('noFinishing'), cost: '₹0' },
              { id: 'staple' as FinishingOption, title: t('staple'), cost: '+₹5' },
              { id: 'spiral' as FinishingOption, title: t('spiral'), cost: '+₹40' },
              { id: 'hardcover' as FinishingOption, title: t('hardcover'), cost: '+₹150' },
              { id: 'lamination' as FinishingOption, title: t('lamination'), cost: '+₹20/pg' },
            ].map((f) => {
              const selected = specs.finishing === f.id;
              return (
                <button
                  type="button"
                  key={f.id}
                  onClick={() => updateSpecs({ finishing: f.id })}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                    selected
                      ? 'border-[#D0BCFF] bg-[#D0BCFF]/15 text-[#D0BCFF]'
                      : 'border-white/10 hover:border-white/20 bg-black/20 text-zinc-300'
                  }`}
                >
                  <div className="text-xs font-bold truncate">{f.title}</div>
                  <div className="text-[10px] text-zinc-400 font-mono mt-0.5">{f.cost}</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 6. PRICING SUMMARY CARD */}
      <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-xl shadow-black/40 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-white">{t('orderSummary')}</span>
          <span className="text-xs text-zinc-400">{specs.selectedPagesCount * specs.copies} {t('pages')}</span>
        </div>

        <div className="space-y-2 text-xs text-zinc-400 border-t border-b border-white/5 py-3">
          <div className="flex justify-between items-center">
            <span>{t('colorMode')} & {t('paperSize')}</span>
            <span className="text-white font-medium capitalize">
              {specs.colorMode === 'bw' ? t('bw') : specs.colorMode === 'color' ? t('color') : t('photo')} • {specs.paperSize.toUpperCase()} • {specs.duplex === 'double' ? t('doubleSided') : t('singleSided')}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span>{t('copies')}</span>
            <span className="text-white font-mono">{specs.copies}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-base font-bold text-white">Total Amount</span>
          <span className="text-2xl font-black text-[#D0BCFF] font-mono">
            ₹{pricing.totalAmount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* 7. STICKY BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#0F0F12]/90 backdrop-blur-xl border-t border-white/10 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div>
            <span className="text-[11px] text-zinc-400 block">{t('total')}:</span>
            <span className="font-mono text-2xl font-black text-[#D0BCFF]">
              ₹{pricing.totalAmount.toFixed(2)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {uploadedFile && (
              <button
                type="button"
                onClick={() => setPreviewModalOpen(true)}
                className="hidden sm:flex py-3 px-5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-200 text-xs font-bold items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Eye className="w-4 h-4 text-[#D0BCFF]" />
                <span>{t('previewDoc')}</span>
              </button>
            )}

            <button
              type="button"
              disabled={!isShopOnline || !uploadedFile}
              onClick={validateAndProceed}
              className="py-3.5 px-7 rounded-2xl bg-[#D0BCFF] hover:bg-[#decbf7] disabled:opacity-40 disabled:cursor-not-allowed text-[#381E72] font-black text-sm shadow-xl shadow-[#D0BCFF]/15 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>{t('proceedToPayment')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
