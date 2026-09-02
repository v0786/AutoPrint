import React, { useRef, useState } from 'react';
import { usePrintJob } from '../context/PrintJobContext';
import {
  ColorMode,
  DuplexMode,
  FinishingOption,
  Orientation,
  PaperSize,
} from '../types';
import { formatBytes, parseCustomPageRange } from '../utils/helpers';
import {
  Upload,
  FileCheck,
  Eye,
  Trash2,
  Sparkles,
  Layers,
  AlertCircle,
  ArrowRight,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const UploadAndSpecsStep: React.FC = () => {
  const {
    uploadedFile,
    setUploadedFile,
    handleFileUpload,
    specs,
    updateSpecs,
    setPageRangeString,
    pricing,
    currentShop,
    isShopOnline,
    queueMessage,
    setStep,
    setPreviewModalOpen,
  } = usePrintJob();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
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
      setValidationError('Shop is currently offline. Orders cannot be placed at this time.');
      return;
    }

    if (!uploadedFile) {
      setValidationError('Please upload a document to print.');
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
    // Open Document Preview for customer review before final payment
    setPreviewModalOpen(true);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pb-32 sm:px-6 pt-2 space-y-6">
      
      {/* Offline Shop Alert Banner */}
      {!isShopOnline && (
        <div className="p-4 rounded-3xl bg-amber-500/15 border border-amber-500/30 text-amber-200 flex items-start gap-3.5 shadow-lg">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold text-amber-100 text-sm">No shop is selected / Shop is Offline</h4>
            <p className="leading-relaxed text-amber-200/90">
              The merchant service is currently unavailable or has not completed onboarding. You can configure print settings, but order submission is temporarily paused until the merchant connects.
            </p>
          </div>
        </div>
      )}

      {/* Validation Error Alert Banner */}
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
              onClick={() => setValidationError(null)}
              className="text-xs underline hover:text-white"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dynamic Queue Workload Banner (Only shown under real high workload) */}
      {queueMessage && (
        <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 flex items-center gap-3.5 text-xs text-amber-300">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <p className="font-medium leading-relaxed">{queueMessage}</p>
        </div>
      )}

      {/* SECTION 1: DOCUMENT UPLOAD */}
      <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-xl shadow-black/40 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#D0BCFF]/15 text-[#D0BCFF] flex items-center justify-center border border-[#D0BCFF]/30">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">1. Document Upload</h2>
              <p className="text-xs text-zinc-400">Upload your PDF, Word doc, or images</p>
            </div>
          </div>
          {uploadedFile && (
            <button
              onClick={() => setPreviewModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 backdrop-blur-md text-xs font-semibold text-[#D0BCFF] hover:border-[#D0BCFF]/30 transition-all cursor-pointer shadow-sm"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Preview Pages</span>
            </button>
          )}
        </div>

        {!uploadedFile ? (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-[#D0BCFF] bg-[#D0BCFF]/10'
                : 'border-white/10 hover:border-[#D0BCFF]/50 bg-black/30 hover:bg-white/[0.02]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.doc,.pptx,.jpg,.jpeg,.png,.webp"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />

            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#D0BCFF] shadow-inner">
              <Upload className="w-6 h-6 animate-bounce" />
            </div>
            <p className="text-sm font-bold text-white mb-1">
              Tap to choose a file or drag & drop here
            </p>
            <p className="text-xs text-zinc-400 mb-3">
              PDF, Word (.docx), PPTX, JPG, PNG (Max 50MB)
            </p>

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-zinc-300">
              <Sparkles className="w-3 h-3 text-[#D0BCFF]" />
              <span>Live document preview & print specs validation</span>
            </div>
          </div>
        ) : (
          /* Uploaded File Active Card */
          <div className="bg-black/30 rounded-2xl p-4 border border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-[#D0BCFF]/15 text-[#D0BCFF] flex items-center justify-center flex-shrink-0 border border-[#D0BCFF]/30 shadow-md">
                <FileCheck className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white truncate">
                    {uploadedFile.name}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#6dd58c]/15 text-[#6dd58c] text-[10px] font-bold border border-[#6dd58c]/30">
                    Ready
                  </span>
                </div>
                <div className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2">
                  <span>{formatBytes(uploadedFile.size)}</span>
                  <span>•</span>
                  <span className="text-[#D0BCFF] font-semibold">
                    {uploadedFile.totalPages} {uploadedFile.totalPages === 1 ? 'Page' : 'Pages'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                onClick={() => setPreviewModalOpen(true)}
                className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-[#D0BCFF] flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview Document</span>
              </button>
              <button
                onClick={() => setUploadedFile(null)}
                className="p-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-400/40 text-zinc-400 hover:text-red-300 transition-all cursor-pointer"
                title="Remove file"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 2: PRINT SPECIFICATIONS */}
      <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-xl shadow-black/40 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-[#D0BCFF]/15 text-[#D0BCFF] flex items-center justify-center border border-[#D0BCFF]/30">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">2. Print Specifications</h2>
            <p className="text-xs text-zinc-400">Configure color, paper, layout, and finishing</p>
          </div>
        </div>

        {/* 1. Color Mode */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
            <span>Color Mode</span>
            <span className="text-[11px] text-zinc-400 font-normal">Base rates per page</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              {
                id: 'bw' as ColorMode,
                title: 'Black & White',
                desc: 'Standard Grayscale',
                rate: `₹${currentShop.rates.bwSingle.toFixed(2)}/page`,
              },
              {
                id: 'color' as ColorMode,
                title: 'Full Color',
                desc: 'Vibrant CMYK',
                rate: `₹${currentShop.rates.colorSingle.toFixed(2)}/page`,
              },
            ].map((opt) => {
              const selected = specs.colorMode === opt.id;
              return (
                <button
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
              Paper Size
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['a4', 'a3', 'legal'] as PaperSize[]).map((size) => (
                <button
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
              Sides (Duplex)
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'single' as DuplexMode, label: '1-Sided (Simplex)' },
                { id: 'double' as DuplexMode, label: '2-Sided (Duplex)' },
              ].map((d) => (
                <button
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

        {/* 3. Copies and Page Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/5">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Number of Copies
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => updateSpecs({ copies: Math.max(1, specs.copies - 1) })}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-base flex items-center justify-center cursor-pointer"
              >
                -
              </button>
              <span className="font-mono text-lg font-bold text-white w-12 text-center">
                {specs.copies}
              </span>
              <button
                onClick={() => updateSpecs({ copies: specs.copies + 1 })}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold text-base flex items-center justify-center cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Pages to Print
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => updateSpecs({ pageRangeType: 'all' })}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  specs.pageRangeType === 'all'
                    ? 'border-[#D0BCFF] bg-[#D0BCFF]/15 text-[#D0BCFF]'
                    : 'border-white/10 hover:border-white/20 bg-black/20 text-zinc-300'
                }`}
              >
                All Pages ({uploadedFile?.totalPages || 1})
              </button>
              <button
                onClick={() => updateSpecs({ pageRangeType: 'custom' })}
                className={`flex-1 py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  specs.pageRangeType === 'custom'
                    ? 'border-[#D0BCFF] bg-[#D0BCFF]/15 text-[#D0BCFF]'
                    : 'border-white/10 hover:border-white/20 bg-black/20 text-zinc-300'
                }`}
              >
                Custom Range
              </button>
            </div>

            {specs.pageRangeType === 'custom' && (
              <input
                type="text"
                placeholder="e.g. 1-3, 5, 8"
                value={specs.customPageRange}
                onChange={(e) => handleRangeChange(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-[#D0BCFF]"
              />
            )}
          </div>
        </div>
      </div>

      {/* SECTION 3: PRICING SUMMARY CARD */}
      <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-xl shadow-black/40 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold text-white">Order Summary</span>
          <span className="text-xs text-zinc-400">{specs.selectedPagesCount * specs.copies} total pages to print</span>
        </div>

        <div className="space-y-2 text-xs text-zinc-400 border-t border-b border-white/5 py-3">
          <div className="flex justify-between items-center">
            <span>Color & Paper</span>
            <span className="text-white font-medium capitalize">
              {specs.colorMode === 'bw' ? 'B&W' : 'Color'} • {specs.paperSize.toUpperCase()} • {specs.duplex}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span>Subtotal</span>
            <span className="text-white font-mono">₹{pricing.subtotal.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center text-zinc-500">
            <span>GST & Service (5%)</span>
            <span className="font-mono">₹{pricing.gstAmount.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-base font-bold text-white">Total Payable</span>
          <span className="text-2xl font-black text-[#D0BCFF] font-mono">
            ₹{pricing.totalAmount.toFixed(2)}
          </span>
        </div>
      </div>

      {/* STICKY BOTTOM BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#0F0F12]/90 backdrop-blur-xl border-t border-white/10 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div>
            <span className="text-[11px] text-zinc-400 block">Total:</span>
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
                <span>Preview Document</span>
              </button>
            )}

            <button
              type="button"
              disabled={!isShopOnline || !uploadedFile}
              onClick={validateAndProceed}
              className="py-3.5 px-7 rounded-2xl bg-[#D0BCFF] hover:bg-[#decbf7] disabled:opacity-40 disabled:cursor-not-allowed text-[#381E72] font-black text-sm shadow-xl shadow-[#D0BCFF]/15 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>REVIEW & PROCEED</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};
