import React, { useState } from 'react';
import { usePrintJob } from '../context/PrintJobContext';
import {
  Eye,
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
  Layers,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  BookOpen,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  SunMedium
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { parseCustomPageRange } from '../utils/helpers';

export const DocumentPreviewModal: React.FC = () => {
  const { isPreviewModalOpen, setPreviewModalOpen, uploadedFile, specs, updateSpecs } = usePrintJob();
  const [currentPage, setCurrentPage] = useState(1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isSpreadView, setIsSpreadView] = useState<boolean>(false);

  if (!isPreviewModalOpen || !uploadedFile) return null;

  const totalPages = Math.max(1, uploadedFile.totalPages);
  const isLandscape = specs.orientation === 'landscape';
  const isColor = specs.colorMode === 'color';
  const isPhoto = specs.colorMode === 'photo';
  const isBw = specs.colorMode === 'bw';

  // Check if current page is selected in print job
  const pageRangeInfo = parseCustomPageRange(specs.customPageRange, totalPages);
  const isCurrentPageIncluded =
    specs.pageRangeType === 'all' ||
    (pageRangeInfo.valid && pageRangeInfo.pages.includes(currentPage));

  const handleZoomIn = () => setZoomLevel((z) => Math.min(150, z + 25));
  const handleZoomOut = () => setZoomLevel((z) => Math.max(50, z - 25));

  // Determine file presentation type
  const isRealImage = uploadedFile.fileCategory === 'image' && Boolean(uploadedFile.previewUrl);
  const isRealText = uploadedFile.fileCategory === 'text' && Boolean(uploadedFile.textContent);

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
                    {isCurrentPageIncluded ? 'Page Included in Print' : 'Excluded by Page Range'}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Page {currentPage} of {totalPages} • Paper: {specs.paperSize.toUpperCase()} • Mode:{' '}
                  <span className="text-[#D0BCFF] uppercase font-semibold">{specs.colorMode}</span>
                </p>
              </div>
            </div>

            {/* Quick Preview Controls & Close */}
            <div className="flex items-center gap-2">
              {/* Zoom & View toggles */}
              <div className="hidden sm:flex items-center gap-1 bg-black/40 p-1 rounded-2xl border border-white/10 text-xs">
                <button
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 50}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-zinc-300 disabled:opacity-40 cursor-pointer"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-2 font-mono text-[11px] text-zinc-300">{zoomLevel}%</span>
                <button
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 150}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-zinc-300 disabled:opacity-40 cursor-pointer"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <div className="w-[1px] h-4 bg-white/10 mx-1" />
                <button
                  onClick={() => setIsSpreadView(!isSpreadView)}
                  className={`p-1.5 rounded-xl text-zinc-300 hover:bg-white/10 cursor-pointer ${
                    isSpreadView ? 'bg-[#D0BCFF]/20 text-[#D0BCFF]' : ''
                  }`}
                  title="Toggle 2-Page Duplex Book Spread"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={() => setPreviewModalOpen(false)}
                className="p-2 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Document Canvas Viewer Body */}
          <div className="flex-1 bg-black/50 p-4 sm:p-8 flex items-center justify-center overflow-auto min-h-[350px] sm:min-h-[440px] relative select-none">
            {/* Ambient paper drop shadow container */}
            <div
              className="transition-all duration-200 flex items-center justify-center gap-6"
              style={{ transform: `scale(${zoomLevel / 100})` }}
            >
              {/* PAGE 1 / MAIN PAGE */}
              <div
                className={`bg-white rounded-xl shadow-2xl border border-gray-300 transition-all text-gray-900 flex flex-col justify-between relative overflow-hidden ${
                  isLandscape
                    ? 'w-[420px] sm:w-[480px] h-[280px] sm:h-[320px]'
                    : 'w-[280px] sm:w-[340px] h-[390px] sm:h-[480px]'
                } ${isBw ? 'grayscale filter contrast-125' : ''}`}
              >
                {/* Visual indicator watermark / header */}
                <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
                  {/* If user uploaded real image */}
                  {isRealImage ? (
                    <div className="w-full h-full flex flex-col items-center justify-center">
                      <img
                        src={uploadedFile.previewUrl}
                        alt="Uploaded preview"
                        className="max-h-[320px] w-full object-contain rounded-lg shadow-sm"
                      />
                      <div className="text-[10px] text-gray-500 font-mono mt-2">
                        {specs.paperSize.toUpperCase()} Photo Canvas ({specs.orientation})
                      </div>
                    </div>
                  ) : isRealText ? (
                    /* If user uploaded real text file */
                    <div className="space-y-2 font-mono text-[11px] text-gray-800 leading-relaxed overflow-hidden">
                      <div className="font-bold border-b pb-1 text-gray-900 text-xs">
                        {uploadedFile.name}
                      </div>
                      <p className="whitespace-pre-line line-clamp-[14]">
                        {uploadedFile.textContent}
                      </p>
                    </div>
                  ) : (
                    /* Realistic Document Layout Simulator */
                    <div className="space-y-3">
                      {/* Document Header */}
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded bg-[#381E72] flex items-center justify-center text-white text-[10px] font-bold">
                            AP
                          </div>
                          <div>
                            <div className="h-3 bg-gray-900 rounded w-28" />
                            <div className="text-[8px] font-mono text-gray-500 mt-0.5">
                              Section {currentPage}.0 • AutoPrint Render
                            </div>
                          </div>
                        </div>
                        <div className="text-[9px] font-mono font-bold text-gray-400">
                          P.{currentPage}
                        </div>
                      </div>

                      {/* Content block simulation */}
                      {currentPage === 1 ? (
                        <div className="space-y-2.5 pt-1">
                          <div className="h-4 bg-gray-800 rounded w-3/4 mb-2" />
                          <div className="h-2 bg-gray-600 rounded w-full" />
                          <div className="h-2 bg-gray-600 rounded w-11/12" />
                          <div className="h-2 bg-gray-500 rounded w-4/5" />

                          {isPhoto ? (
                            <div className="h-32 bg-gradient-to-tr from-purple-200 via-pink-100 to-amber-100 rounded-lg border border-purple-200 flex items-center justify-center text-purple-900 text-xs font-bold shadow-inner">
                              High-Resolution Photo Print Simulation
                            </div>
                          ) : isColor ? (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-blue-600" />
                                <div className="h-2.5 bg-blue-900 rounded w-1/3" />
                              </div>
                              <div className="grid grid-cols-3 gap-2 pt-1">
                                <div className="h-10 bg-blue-500/20 rounded flex items-center justify-center text-[10px] font-bold text-blue-900">
                                  Charts
                                </div>
                                <div className="h-10 bg-emerald-500/20 rounded flex items-center justify-center text-[10px] font-bold text-emerald-900">
                                  Tables
                                </div>
                                <div className="h-10 bg-purple-500/20 rounded flex items-center justify-center text-[10px] font-bold text-purple-900">
                                  Graphics
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1.5 pt-1">
                              <div className="h-2 bg-gray-400 rounded w-full" />
                              <div className="h-2 bg-gray-400 rounded w-5/6" />
                              <div className="h-2 bg-gray-400 rounded w-full" />
                              <div className="h-2 bg-gray-300 rounded w-2/3" />
                            </div>
                          )}

                          <div className="space-y-1 pt-1">
                            <div className="h-2 bg-gray-400 rounded w-full" />
                            <div className="h-2 bg-gray-400 rounded w-4/5" />
                          </div>
                        </div>
                      ) : (
                        /* Page 2+ format */
                        <div className="space-y-2.5 pt-1">
                          <div className="h-3.5 bg-gray-800 rounded w-1/2 mb-1" />
                          <div className="h-2 bg-gray-600 rounded w-full" />
                          <div className="h-2 bg-gray-600 rounded w-11/12" />
                          <div className="h-2 bg-gray-500 rounded w-5/6" />

                          {/* Data table simulation */}
                          <div className="border border-gray-200 rounded-md overflow-hidden text-[9px]">
                            <div className="bg-gray-100 p-1.5 font-bold flex justify-between">
                              <span>Parameter</span>
                              <span>Print Spec</span>
                            </div>
                            <div className="p-1.5 flex justify-between border-t">
                              <span>Page Quality</span>
                              <span className="font-semibold">{specs.colorMode.toUpperCase()}</span>
                            </div>
                            <div className="p-1.5 flex justify-between border-t bg-gray-50">
                              <span>Paper Standard</span>
                              <span className="font-semibold">{specs.paperSize.toUpperCase()}</span>
                            </div>
                          </div>

                          <div className="space-y-1 pt-1">
                            <div className="h-2 bg-gray-400 rounded w-full" />
                            <div className="h-2 bg-gray-400 rounded w-3/4" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Document Footer */}
                  <div className="flex items-center justify-between text-[8px] font-mono text-gray-400 border-t pt-2 mt-auto">
                    <span>AutoPrint Self-Service</span>
                    <span>
                      Page {currentPage} of {totalPages}
                    </span>
                  </div>
                </div>
              </div>

              {/* SPREAD VIEW SECOND PAGE IF ENABLED */}
              {isSpreadView && totalPages > 1 && (
                <div
                  className={`bg-white rounded-xl shadow-2xl border border-gray-300 transition-all text-gray-900 flex flex-col justify-between relative overflow-hidden hidden sm:flex ${
                    isLandscape
                      ? 'w-[420px] sm:w-[480px] h-[280px] sm:h-[320px]'
                      : 'w-[280px] sm:w-[340px] h-[390px] sm:h-[480px]'
                  } ${isBw ? 'grayscale filter contrast-125' : ''}`}
                >
                  <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="text-[9px] font-mono font-bold text-gray-500">
                          Duplex Backside Spread (P.{Math.min(totalPages, currentPage + 1)})
                        </div>
                        <div className="text-[9px] font-mono font-bold text-gray-400">
                          P.{Math.min(totalPages, currentPage + 1)}
                        </div>
                      </div>
                      <div className="space-y-2 pt-2">
                        <div className="h-3.5 bg-gray-800 rounded w-2/3" />
                        <div className="h-2 bg-gray-600 rounded w-full" />
                        <div className="h-2 bg-gray-600 rounded w-5/6" />
                        <div className="h-2 bg-gray-400 rounded w-full" />
                        <div className="h-2 bg-gray-400 rounded w-3/4" />
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[8px] font-mono text-gray-400 border-t pt-2">
                      <span>Duplex Book View</span>
                      <span>Page {Math.min(totalPages, currentPage + 1)} of {totalPages}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Thumbnails & Page Controls */}
          <div className="p-4 bg-white/[0.02] border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Page thumbnails carousel */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full sm:max-w-md py-1">
              {Array.from({ length: Math.min(12, totalPages) }, (_, i) => i + 1).map((pg) => {
                const isSelected = pg === currentPage;
                const isIncluded =
                  specs.pageRangeType === 'all' ||
                  (pageRangeInfo.valid && pageRangeInfo.pages.includes(pg));
                return (
                  <button
                    key={pg}
                    onClick={() => setCurrentPage(pg)}
                    className={`w-8 h-10 rounded-lg flex flex-col items-center justify-center text-[10px] font-bold transition-all flex-shrink-0 cursor-pointer border ${
                      isSelected
                        ? 'bg-[#D0BCFF] text-[#381E72] border-white shadow-md scale-105'
                        : isIncluded
                        ? 'bg-black/40 text-zinc-300 border-white/10 hover:border-[#D0BCFF]/40'
                        : 'bg-black/60 text-zinc-500 border-amber-500/30'
                    }`}
                  >
                    <span>{pg}</span>
                  </button>
                );
              })}
              {totalPages > 12 && (
                <span className="text-xs text-zinc-400 px-1 font-mono">+{totalPages - 12}p</span>
              )}
            </div>

            {/* Prev / Next Page Buttons */}
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 text-xs font-semibold text-zinc-200 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev</span>
              </button>

              <span className="font-mono text-xs text-[#D0BCFF] font-bold bg-[#D0BCFF]/10 px-3 py-2 rounded-xl border border-[#D0BCFF]/20">
                {currentPage} / {totalPages}
              </span>

              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 border border-white/10 text-xs font-semibold text-zinc-200 flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed transition-all"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
