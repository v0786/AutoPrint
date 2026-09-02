import React, { useState } from 'react';
import { usePrintJob } from '../context/PrintJobContext';
import {
  Eye,
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
  Printer,
  CheckCircle2,
  Sparkles,
  Layers,
  ZoomIn,
  ZoomOut,
  Palette,
  FileCheck,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const DocumentPreviewModal: React.FC = () => {
  const { isPreviewModalOpen, setPreviewModalOpen, uploadedFile, specs, pricing, setStep } = usePrintJob();
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  if (!isPreviewModalOpen || !uploadedFile) return null;

  const totalPages = uploadedFile.totalPages || 1;
  const isLandscape = specs.orientation === 'landscape';
  const isBw = specs.colorMode === 'bw';

  const handleConfirmAndProceed = () => {
    setPreviewModalOpen(false);
    setStep('payment');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md font-sans">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-3xl bg-[#141419]/95 rounded-3xl p-5 sm:p-7 border border-white/10 backdrop-blur-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-[#D0BCFF]/15 text-[#D0BCFF] flex items-center justify-center border border-[#D0BCFF]/30 flex-shrink-0">
                <FileCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-base font-bold text-white truncate max-w-xs sm:max-w-md">
                  {uploadedFile.name}
                </h3>
                <p className="text-xs text-zinc-400 flex items-center gap-2">
                  <span>{(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB</span>
                  <span>•</span>
                  <span>{totalPages} {totalPages === 1 ? 'Page' : 'Pages'}</span>
                  <span>•</span>
                  <span className="text-[#D0BCFF] font-medium uppercase">{specs.paperSize}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setPreviewModalOpen(false)}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              title="Close Preview"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Main Document Preview Viewport */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            <div className="bg-black/50 rounded-2xl p-4 sm:p-6 flex flex-col items-center justify-center min-h-[300px] sm:min-h-[380px] border border-white/10 relative overflow-hidden">
              
              {/* Top Controls Toolbar */}
              <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10 bg-black/60 backdrop-blur-md px-2.5 py-1 rounded-full border border-white/10 text-xs text-zinc-300">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(70, z - 15))}
                  className="p-1 hover:text-white transition-colors cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="font-mono text-[11px] px-1">{zoomLevel}%</span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(150, z + 15))}
                  className="p-1 hover:text-white transition-colors cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Document Rendering */}
              {uploadedFile.isImage && uploadedFile.previewUrl ? (
                <div
                  className="transition-transform duration-200 flex items-center justify-center"
                  style={{ transform: `scale(${zoomLevel / 100})` }}
                >
                  <img
                    src={uploadedFile.previewUrl}
                    alt={uploadedFile.name}
                    className="max-h-[340px] max-w-full rounded-lg shadow-2xl object-contain border border-white/20"
                    style={{
                      filter: isBw ? 'grayscale(100%) contrast(115%)' : 'none',
                    }}
                  />
                </div>
              ) : uploadedFile.isPdf && uploadedFile.previewUrl ? (
                <div
                  className="w-full h-[340px] sm:h-[400px] transition-transform duration-200 rounded-lg overflow-hidden border border-white/20 bg-white"
                  style={{
                    transform: `scale(${zoomLevel / 100})`,
                    filter: isBw ? 'grayscale(100%) contrast(110%)' : 'none',
                  }}
                >
                  <iframe
                    src={`${uploadedFile.previewUrl}#toolbar=0&navpanes=0&scrollbar=1&page=${currentPage}`}
                    title="Real Document Preview"
                    className="w-full h-full border-0"
                  />
                </div>
              ) : (
                <div className="text-center p-8 space-y-3">
                  <FileText className="w-12 h-12 text-[#D0BCFF] mx-auto opacity-75" />
                  <p className="text-sm font-semibold text-white">{uploadedFile.name}</p>
                  <p className="text-xs text-zinc-400 max-w-sm">
                    Document verified and ready for high-speed print processing.
                  </p>
                </div>
              )}

              {/* Page Number Badge */}
              {totalPages > 1 && (
                <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 text-xs font-mono text-[#D0BCFF]">
                  Page {currentPage} of {totalPages}
                </div>
              )}
            </div>

            {/* Print Settings Confirmation Card */}
            <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-3">
              <div className="flex items-center justify-between text-xs text-zinc-400">
                <span className="font-semibold text-white uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5 text-[#D0BCFF]" />
                  Active Print Settings
                </span>
                <span className="text-[#D0BCFF] font-medium">Verify before checkout</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                  <div className="text-zinc-500 text-[10px]">Color Mode</div>
                  <div className="font-semibold text-white flex items-center gap-1 mt-0.5">
                    <Palette className="w-3 h-3 text-[#D0BCFF]" />
                    {specs.colorMode === 'bw' ? 'Black & White' : specs.colorMode === 'color' ? 'Full Color' : 'Photo Glossy'}
                  </div>
                </div>

                <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                  <div className="text-zinc-500 text-[10px]">Paper & Layout</div>
                  <div className="font-semibold text-white mt-0.5">
                    {specs.paperSize.toUpperCase()} • {specs.duplex === 'double' ? '2-Sided' : '1-Sided'}
                  </div>
                </div>

                <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                  <div className="text-zinc-500 text-[10px]">Copies & Pages</div>
                  <div className="font-semibold text-white mt-0.5">
                    {specs.copies} {specs.copies === 1 ? 'Copy' : 'Copies'} • {specs.selectedPagesCount} Pgs
                  </div>
                </div>

                <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                  <div className="text-zinc-500 text-[10px]">Total Price</div>
                  <div className="font-bold text-[#6dd58c] mt-0.5 text-sm">
                    ₹{pricing.totalAmount.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Controls */}
          <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-3 flex-shrink-0">
            {totalPages > 1 ? (
              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 text-xs font-semibold text-zinc-200 cursor-pointer disabled:cursor-not-allowed transition-all"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 text-xs font-semibold text-zinc-200 cursor-pointer disabled:cursor-not-allowed transition-all"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : <div />}

            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setPreviewModalOpen(false)}
                className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
              >
                Edit Settings
              </button>
              <button
                onClick={handleConfirmAndProceed}
                className="px-5 py-2.5 rounded-2xl bg-[#D0BCFF] hover:bg-[#D0BCFF]/90 text-[#381E72] text-xs font-bold shadow-lg shadow-[#D0BCFF]/20 flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02]"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>Confirm & Continue to Payment</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
