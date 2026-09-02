import React, { useRef, useState } from 'react';
import { usePrintJob } from '../context/PrintJobContext';
import {
  ColorMode,
  DuplexMode,
  FinishingOption,
  Orientation,
  PaperSize,
  UploadedFileDetails,
} from '../types';
import { formatBytes, parseCustomPageRange } from '../utils/helpers';
import {
  Upload,
  FileText,
  FileCheck,
  Eye,
  Trash2,
  Sparkles,
  Layers,
  FileSpreadsheet,
  BookOpen,
  Scissors,
  Check,
  AlertCircle,
  ArrowRight,
  Info,
  Sliders,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const SAMPLE_DOCS: { name: string; size: number; totalPages: number; type: string }[] = [];

export const UploadAndSpecsStep: React.FC = () => {
  const {
    uploadedFile,
    setUploadedFile,
    specs,
    updateSpecs,
    setPageRangeString,
    pricing,
    currentShop,
    setStep,
    setPreviewModalOpen,
  } = usePrintJob();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // File upload handlers
  const handleFile = (file: File) => {
    setValidationError(null);
    const simulatedPages = file.type.includes('image')
      ? 1
      : Math.max(1, Math.min(48, Math.round(file.size / 150000) || 3));

    const details: UploadedFileDetails = {
      name: file.name,
      size: file.size,
      type: file.type,
      totalPages: simulatedPages,
      uploadTimestamp: Date.now(),
    };

    setUploadedFile(details);
    updateSpecs({
      pageRangeType: 'all',
      selectedPagesCount: simulatedPages,
      customPageRange: '',
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleSelectSample = (sample: typeof SAMPLE_DOCS[0]) => {
    setValidationError(null);
    setUploadedFile({
      name: sample.name,
      size: sample.size,
      type: sample.type,
      totalPages: sample.totalPages,
      uploadTimestamp: Date.now(),
    });
    updateSpecs({
      pageRangeType: 'all',
      selectedPagesCount: sample.totalPages,
      customPageRange: '',
    });
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
    if (!uploadedFile) {
      setValidationError('Please upload or select a document to print.');
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
    setStep('payment');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pb-32 sm:px-6 pt-2 space-y-6">
      
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
          <div>
            {/* Drag and Drop Box */}
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
                accept=".pdf,.docx,.doc,.pptx,.jpg,.jpeg,.png"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFile(e.target.files[0]);
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
                <span>Auto page count & print dimensions detection</span>
              </div>
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
                    {uploadedFile.totalPages} {uploadedFile.totalPages === 1 ? 'Page' : 'Total Pages'}
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
                <span>View Preview</span>
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
            <span className="text-[11px] text-zinc-400 font-normal">Base rates per page side</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                id: 'bw' as ColorMode,
                title: 'Grayscale (B&W)',
                desc: 'Text & documents',
                rate: `₹${currentShop.rates.bwSingle.toFixed(2)}/pg`,
                tag: 'Standard',
              },
              {
                id: 'color' as ColorMode,
                title: 'Color (CMYK)',
                desc: 'Charts & presentation',
                rate: `₹${currentShop.rates.colorSingle.toFixed(2)}/pg`,
                tag: 'Vibrant',
              },
              {
                id: 'photo' as ColorMode,
                title: 'Photo Glossy',
                desc: 'High-res photos',
                rate: `₹${currentShop.rates.photoGlossy.toFixed(2)}/pg`,
                tag: 'Premium',
              },
            ].map((opt) => {
              const selected = specs.colorMode === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => updateSpecs({ colorMode: opt.id })}
                  className={`p-4 rounded-2xl text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                    selected
                      ? 'bg-[#D0BCFF] text-[#381E72] font-bold shadow-lg shadow-[#D0BCFF]/15 border-transparent'
                      : 'bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 border border-white/5'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-bold">{opt.title}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        selected
                          ? 'bg-[#381E72] text-[#D0BCFF]'
                          : 'bg-zinc-900 text-zinc-400'
                      }`}
                    >
                      {opt.rate}
                    </span>
                  </div>
                  <p className={`text-[11px] ${selected ? 'text-[#381E72]/80 font-medium' : 'text-zinc-400'}`}>
                    {opt.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Sides (Duplex) */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
            <span>Sides</span>
            <span className="text-[11px] text-[#6dd58c] font-semibold">
              Double-sided saves ~25% paper cost
            </span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                id: 'single' as DuplexMode,
                title: 'Single-sided',
                desc: '1 page per physical sheet',
              },
              {
                id: 'double' as DuplexMode,
                title: 'Double-sided',
                desc: 'Both sides of sheet',
              },
            ].map((opt) => {
              const selected = specs.duplex === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => updateSpecs({ duplex: opt.id })}
                  className={`p-4 rounded-2xl text-left transition-all cursor-pointer ${
                    selected
                      ? 'bg-zinc-800 border-2 border-[#D0BCFF]/60 text-white shadow-md'
                      : 'bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 border border-white/5'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">{opt.title}</span>
                    {selected && <Check className="w-3.5 h-3.5 text-[#D0BCFF]" />}
                  </div>
                  <p className={`text-[11px] ${selected ? 'text-zinc-300' : 'text-zinc-400'}`}>
                    {opt.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Paper Size & Orientation (Grid 2 cols) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Paper Size */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Paper Size
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'a4' as PaperSize, label: 'A4 (Standard)' },
                { id: 'a3' as PaperSize, label: 'A3 (2x Large)' },
                { id: 'legal' as PaperSize, label: 'Legal (Court)' },
                { id: 'letter' as PaperSize, label: 'US Letter' },
              ].map((p) => {
                const selected = specs.paperSize === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => updateSpecs({ paperSize: p.id })}
                    className={`py-3 px-3 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center ${
                      selected
                        ? 'bg-[#D0BCFF] text-[#381E72] shadow-sm'
                        : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80 border border-white/5'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Orientation */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Orientation
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'portrait' as Orientation, label: 'Portrait' },
                { id: 'landscape' as Orientation, label: 'Landscape' },
              ].map((o) => {
                const selected = specs.orientation === o.id;
                return (
                  <button
                    key={o.id}
                    onClick={() => updateSpecs({ orientation: o.id })}
                    className={`py-3 px-3 rounded-2xl text-xs font-bold transition-all cursor-pointer text-center ${
                      selected
                        ? 'bg-[#D0BCFF] text-[#381E72] shadow-sm'
                        : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80 border border-white/5'
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 4. Copies & Page Range Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-3 border-t border-white/5">
          
          {/* Copies Counter */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Copies
            </label>
            <div className="flex items-center justify-between bg-zinc-900 border border-white/5 p-3.5 rounded-2xl">
              <button
                type="button"
                onClick={() => updateSpecs({ copies: Math.max(1, specs.copies - 1) })}
                className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xl flex items-center justify-center transition-colors cursor-pointer"
              >
                -
              </button>
              <div className="text-center">
                <span className="text-2xl font-bold text-white">
                  {specs.copies < 10 ? `0${specs.copies}` : specs.copies}
                </span>
                <span className="text-[10px] text-zinc-400 block uppercase tracking-wider">
                  {specs.copies === 1 ? 'Copy' : 'Copies'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => updateSpecs({ copies: Math.min(99, specs.copies + 1) })}
                className="w-10 h-10 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xl flex items-center justify-center transition-colors cursor-pointer"
              >
                +
              </button>
            </div>
          </div>

          {/* Page Range Selector */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Page Selection
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => updateSpecs({ pageRangeType: 'all', customPageRange: '' })}
                className={`flex-1 py-3 px-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  specs.pageRangeType === 'all'
                    ? 'bg-[#D0BCFF] text-[#381E72] shadow-sm'
                    : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80 border border-white/5'
                }`}
              >
                All Pages ({uploadedFile?.totalPages || 1})
              </button>
              <button
                type="button"
                onClick={() => updateSpecs({ pageRangeType: 'custom' })}
                className={`flex-1 py-3 px-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  specs.pageRangeType === 'custom'
                    ? 'bg-[#D0BCFF] text-[#381E72] shadow-sm'
                    : 'bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80 border border-white/5'
                }`}
              >
                Custom Range
              </button>
            </div>

            {/* Custom Range Input */}
            {specs.pageRangeType === 'custom' && (
              <div className="space-y-1.5">
                <input
                  type="text"
                  placeholder="e.g. 1-3, 5, 7-9"
                  value={specs.customPageRange}
                  onChange={(e) => handleRangeChange(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 focus:border-[#D0BCFF] rounded-2xl px-4 py-3 text-xs font-mono text-white outline-none transition-colors"
                />
                <div className="text-[10px] text-zinc-400 flex justify-between">
                  <span>Enter comma separated pages & dashes</span>
                  <span className="text-[#D0BCFF] font-semibold">
                    {specs.selectedPagesCount} {specs.selectedPagesCount === 1 ? 'page' : 'pages'} selected
                  </span>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* 5. Finishing & Binding */}
        <div className="space-y-2.5 pt-3 border-t border-white/5">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
            <span>Finishing & Binding</span>
            <span className="text-[11px] text-zinc-400 font-normal">Optional post-print service</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
            {[
              { id: 'none' as FinishingOption, title: 'No Binding', cost: 'Free' },
              { id: 'staple' as FinishingOption, title: 'Corner Staple', cost: `+₹${currentShop.rates.finishing.staple}` },
              { id: 'spiral' as FinishingOption, title: 'Spiral Binding', cost: `+₹${currentShop.rates.finishing.spiral}` },
              { id: 'hardcover' as FinishingOption, title: 'Hard Cover', cost: `+₹${currentShop.rates.finishing.hardcover}` },
              { id: 'lamination' as FinishingOption, title: 'Lamination', cost: `+₹${currentShop.rates.finishing.laminationPerSheet}/sh` },
            ].map((f) => {
              const selected = specs.finishing === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => updateSpecs({ finishing: f.id })}
                  className={`p-3 rounded-2xl text-left transition-all cursor-pointer ${
                    selected
                      ? 'bg-zinc-800 border-2 border-[#D0BCFF]/60 text-white shadow-sm'
                      : 'bg-zinc-800/80 hover:bg-zinc-700/80 border border-white/5 text-zinc-300'
                  }`}
                >
                  <div className="text-xs font-bold leading-tight mb-1 truncate">{f.title}</div>
                  <div className="text-[10px] text-[#D0BCFF] font-semibold">{f.cost}</div>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* SECTION 3: REAL-TIME PRICE ESTIMATION CARD */}
      <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-xl shadow-black/40 space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Order Summary</h3>
          <div className="text-xs text-zinc-400">
            Shop: <span className="text-[#D0BCFF] font-semibold">{currentShop.name}</span>
          </div>
        </div>

        <div className="space-y-3 text-sm text-zinc-400 pb-6 border-b border-white/10">
          <div className="flex justify-between items-center">
            <span>File</span>
            <span className="text-white font-mono text-xs truncate max-w-[200px]">
              {uploadedFile?.name || 'No file selected'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span>Pages</span>
            <span className="text-white font-semibold">
              {specs.selectedPagesCount} (x{specs.copies} {specs.copies === 1 ? 'copy' : 'copies'})
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span>Format</span>
            <span className="text-white font-semibold capitalize">
              {specs.paperSize.toUpperCase()} • {specs.colorMode === 'bw' ? 'Grayscale' : specs.colorMode === 'color' ? 'Color' : 'Photo'} • {specs.duplex === 'single' ? 'Single-sided' : 'Double-sided'}
            </span>
          </div>

          {pricing.finishingCost > 0 && (
            <div className="flex justify-between items-center">
              <span>Finishing ({specs.finishing})</span>
              <span className="text-white font-mono">₹{pricing.finishingCost.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between items-center text-xs text-zinc-500">
            <span>GST & Handling (5%)</span>
            <span className="font-mono">₹{pricing.gstAmount.toFixed(2)}</span>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-zinc-100 font-bold text-base">Total Amount</span>
          <span className="text-3xl font-black text-[#D0BCFF] font-mono">
            ₹{pricing.totalAmount.toFixed(2)}
          </span>
        </div>

        {/* Frosted Callout Banner */}
        <div className="p-4 bg-[#D0BCFF]/10 rounded-2xl border border-[#D0BCFF]/20 flex items-center gap-3.5">
          <Info className="w-5 h-5 text-[#D0BCFF] flex-shrink-0" />
          <p className="text-xs text-[#D0BCFF] font-medium leading-relaxed">
            Your prints will be held for 2 hours. Use your collection code at the counter after payment.
          </p>
        </div>

        {/* Powered by Vercel Edge Network */}
        <div className="bg-[#381E72]/30 border border-[#D0BCFF]/20 rounded-3xl p-5 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold tracking-widest text-[#D0BCFF]/80 mb-0.5">
              Powered By
            </span>
            <span className="text-sm font-bold text-white">Vercel Edge Network</span>
          </div>
          <div className="flex -space-x-2">
            <div className="w-8 h-8 rounded-full border-2 border-[#381E72] bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-white">
              ▲
            </div>
            <div className="w-8 h-8 rounded-full border-2 border-[#381E72] bg-[#D0BCFF] flex items-center justify-center text-[10px] font-bold text-[#381E72]">
              AP
            </div>
          </div>
        </div>
      </div>

      {/* STICKY BOTTOM BAR FOR FAST PROCEED */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#0F0F12]/80 backdrop-blur-xl border-t border-white/10 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div>
            <span className="text-[11px] text-zinc-400 block">Total Payable:</span>
            <span className="font-mono text-2xl font-black text-[#D0BCFF]">
              ₹{pricing.totalAmount.toFixed(2)}
            </span>
          </div>

          <button
            type="button"
            onClick={validateAndProceed}
            className="flex-1 sm:flex-initial py-4 px-8 rounded-2xl bg-[#D0BCFF] hover:bg-[#decbf7] text-[#381E72] font-black text-base shadow-xl shadow-[#D0BCFF]/15 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>PROCEED TO PAYMENT</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

    </div>
  );
};
