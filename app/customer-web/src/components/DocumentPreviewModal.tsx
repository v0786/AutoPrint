import React, { useState } from 'react';
import { usePrintJob } from '../context/PrintJobContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Eye,
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Image as ImageIcon,
  CheckCircle2,
  Sliders,
  Palette,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parseCustomPageRange } from '../utils/helpers';

export const DocumentPreviewModal: React.FC = () => {
  const { isPreviewModalOpen, setPreviewModalOpen, uploadedFile, specs, pricing, setStep } = usePrintJob();
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  if (!isPreviewModalOpen || !uploadedFile) return null;

  const totalPages = Math.max(1, uploadedFile.totalPages);
  const isBw = specs.colorMode === 'bw';

  // Check if current page is selected in print job
  const pageRangeInfo = parseCustomPageRange(specs.customPageRange, totalPages);
  const isCurrentPageIncluded =
    specs.pageRangeType === 'all' ||
    (pageRangeInfo.valid && pageRangeInfo.pages.includes(currentPage));

  const handleZoomIn = () => setZoomLevel((z) => Math.min(150, z + 25));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(50, z - 25));

  const isRealImage = uploadedFile.fileCategory === 'image' && Boolean(uploadedFile.previewUrl);
  const isRealText = uploadedFile.fileCategory === 'text' && Boolean(uploadedFile.textContent);
  const isRealPdf = uploadedFile.fileCategory === 'pdf' && Boolean(uploadedFile.previewUrl);

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
          className="w-full max-w-4xl bg-[#141419]/95 rounded-3xl border border-white/10 backdrop-blur-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden text-[#E6E1E9]"
        >
          {/* Top Bar */}
          <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between gap-3 bg-white/[0.02]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-[#D0BCFF]/15 text-[#D0BCFF] flex items-center justify-center border border-[#D0BCFF]/30 flex-shrink-0">
                {isRealImage ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md">
                    {uploadedFile.name}
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      isCurrentPageIncluded
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {isCurrentPageIncluded ? 'Included in Print' : 'Excluded by Page Range'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Page {currentPage} of {totalPages} • Paper: {specs.paperSize.toUpperCase()} • Mode:{' '}
                  <span className="text-[#D0BCFF] uppercase font-semibold">
                    {specs.colorMode === 'bw' ? t('bw') : specs.colorMode === 'color' ? t('color') : t('photo')}
                  </span>
                </p>
              </div>
            </div>

            {/* Quick Preview Controls & Close */}
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-1 bg-black/40 p-1 rounded-2xl border border-white/10 text-xs">
                <button
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 50}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-zinc-300 disabled:opacity-40 cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 font-mono text-[11px] text-zinc-400">{zoomLevel}%</span>
                <button
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 150}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-zinc-300 disabled:opacity-40 cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => setPreviewModalOpen(false)}
                className="p-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                title={t('close')}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Main Viewport */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-black/40 flex flex-col items-center justify-center relative">
            <div
              className="w-full max-w-lg transition-transform duration-200 flex items-center justify-center min-h-[300px]"
              style={{ transform: `scale(${zoomLevel / 100})` }}
            >
              {isRealImage && uploadedFile.previewUrl ? (
                <img
                  src={uploadedFile.previewUrl}
                  alt={uploadedFile.name}
                  className="max-h-[360px] max-w-full rounded-xl shadow-2xl object-contain border border-white/20"
                  style={{
                    filter: isBw ? 'grayscale(100%) contrast(115%)' : 'none',
                  }}
                />
              ) : isRealPdf && uploadedFile.previewUrl ? (
                <div
                  className="w-full h-[360px] sm:h-[400px] rounded-xl overflow-hidden border border-white/20 bg-white"
                  style={{
                    filter: isBw ? 'grayscale(100%) contrast(110%)' : 'none',
                  }}
                >
                  <iframe
                    src={`${uploadedFile.previewUrl}#toolbar=0&navpanes=0&scrollbar=1&page=${currentPage}`}
                    title="Real Document Preview"
                    className="w-full h-full border-0"
                  />
                </div>
              ) : isRealText && uploadedFile.textContent ? (
                <div className="w-full h-[320px] p-4 bg-white text-zinc-900 rounded-xl overflow-y-auto font-mono text-xs border border-zinc-300 shadow-xl">
                  <pre className="whitespace-pre-wrap">{uploadedFile.textContent}</pre>
                </div>
              ) : (
                <div className="text-center p-8 space-y-3 bg-white/5 rounded-2xl border border-white/10">
                  <FileText className="w-14 h-14 text-[#D0BCFF] mx-auto opacity-75" />
                  <p className="text-sm font-semibold text-white">{uploadedFile.name}</p>
                  <p className="text-xs text-zinc-400 max-w-sm">
                    {t('fileUploaded')} • {uploadedFile.totalPages} {t('pages')}
                  </p>
                </div>
              )}
            </div>

            {/* Bottom Quick Page Thumbnails Bar */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center gap-1.5 overflow-x-auto max-w-full py-1">
                {Array.from({ length: Math.min(12, totalPages) }, (_, i) => i + 1).map((pg) => {
                  const isSelected = pg === currentPage;
                  return (
                    <button
                      key={pg}
                      onClick={() => setCurrentPage(pg)}
                      className={`w-7 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all cursor-pointer border ${
                        isSelected
                          ? 'bg-[#D0BCFF] text-[#381E72] border-white shadow-md'
                          : 'bg-black/40 text-zinc-300 border-white/10 hover:border-[#D0BCFF]/40'
                      }`}
                    >
                      {pg}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer Controls & Confirm Button */}
          <div className="p-4 border-t border-white/10 bg-white/[0.02] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {totalPages > 1 && (
                <>
                  <button
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 text-xs font-semibold text-zinc-200 cursor-pointer disabled:cursor-not-allowed"
                    title={t('back')}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-mono text-xs text-[#D0BCFF] font-bold px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 text-xs font-semibold text-zinc-200 cursor-pointer disabled:cursor-not-allowed"
                    title={t('next')}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
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
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
