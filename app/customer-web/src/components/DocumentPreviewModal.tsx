import React, { useState } from 'react';
import { usePrintJob } from '../context/PrintJobContext';
import { Eye, X, FileText, ChevronLeft, ChevronRight, Layers, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const DocumentPreviewModal: React.FC = () => {
  const { isPreviewModalOpen, setPreviewModalOpen, uploadedFile, specs } = usePrintJob();
  const [currentPage, setCurrentPage] = useState(1);

  if (!isPreviewModalOpen || !uploadedFile) return null;

  const totalPages = uploadedFile.totalPages;
  const isLandscape = specs.orientation === 'landscape';
  const isColor = specs.colorMode === 'color';
  const isPhoto = specs.colorMode === 'photo';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-sans">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="w-full max-w-2xl bg-[#141419]/95 rounded-3xl p-6 sm:p-7 border border-white/10 backdrop-blur-2xl shadow-2xl space-y-5"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-[#D0BCFF]/15 text-[#D0BCFF] flex items-center justify-center border border-[#D0BCFF]/30">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white truncate max-w-xs sm:max-w-md">
                  {uploadedFile.name}
                </h3>
                <p className="text-xs text-zinc-400">
                  Page {currentPage} of {totalPages} • Layout: {specs.orientation} • {specs.colorMode.toUpperCase()}
                </p>
              </div>
            </div>
            <button
              onClick={() => setPreviewModalOpen(false)}
              className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Virtual Paper Sheet Display */}
          <div className="bg-black/40 rounded-3xl p-6 sm:p-8 flex items-center justify-center min-h-[320px] sm:min-h-[380px] border border-white/10 relative overflow-hidden">
            
            {/* Simulated Paper Canvas */}
            <div
              className={`bg-white rounded-lg shadow-2xl transition-all p-6 text-gray-800 flex flex-col justify-between relative border border-gray-300 ${
                isLandscape
                  ? 'w-[320px] sm:w-[420px] h-[220px] sm:h-[280px]'
                  : 'w-[220px] sm:w-[280px] h-[300px] sm:h-[380px]'
              } ${
                specs.colorMode === 'bw'
                  ? 'grayscale filter contrast-125'
                  : ''
              }`}
            >
              {/* Top Document Header Lines */}
              <div>
                <div className="flex items-center justify-between border-b pb-2 mb-3">
                  <div className="h-3.5 bg-gray-900 rounded w-1/3" />
                  <div className="text-[9px] font-mono text-gray-500">AutoPrint Doc Preview</div>
                </div>

                {/* Simulated Content paragraph blocks */}
                <div className="space-y-2">
                  <div className="h-2 bg-gray-700 rounded w-full" />
                  <div className="h-2 bg-gray-600 rounded w-5/6" />
                  <div className="h-2 bg-gray-600 rounded w-4/6" />
                  
                  {isPhoto ? (
                    <div className="h-24 bg-gradient-to-tr from-[#D0BCFF] via-[#8ab4f8] to-[#6dd58c] rounded-md my-2 flex items-center justify-center text-gray-900 text-[10px] font-bold shadow-inner">
                      High-Gloss Photo Print Canvas
                    </div>
                  ) : (
                    <div className="pt-2 space-y-1.5">
                      <div className="h-2 bg-gray-400 rounded w-full" />
                      <div className="h-2 bg-gray-400 rounded w-11/12" />
                      <div className="h-2 bg-gray-400 rounded w-3/4" />
                      {isColor && (
                        <div className="h-10 bg-purple-50 border border-purple-200 rounded p-1.5 my-1 flex items-center gap-2">
                          <div className="w-5 h-5 bg-[#381E72] rounded" />
                          <div className="space-y-1 flex-1">
                            <div className="h-1.5 bg-purple-800 rounded w-2/3" />
                            <div className="h-1.5 bg-purple-400 rounded w-1/2" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Paper Footer */}
              <div className="flex items-center justify-between text-[8px] font-mono text-gray-400 border-t pt-2 mt-2">
                <span>AutoPrint Kiosk System</span>
                <span>Page {currentPage} of {totalPages}</span>
              </div>
            </div>

          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 disabled:opacity-40 border border-white/10 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <span className="font-mono text-xs text-[#D0BCFF] font-bold bg-[#D0BCFF]/10 px-3 py-1.5 rounded-xl border border-[#D0BCFF]/20">
              Page {currentPage} / {totalPages}
            </span>

            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-4 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 disabled:opacity-40 border border-white/10 text-xs font-semibold text-zinc-200 flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed transition-all"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
