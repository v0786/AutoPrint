import React from 'react';
import {
  FileText,
  FileCheck,
  Image as ImageIcon,
  Trash2,
  RefreshCw,
  AlertCircle,
  Eye,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { UploadedFileDetails } from '../types';
import { formatBytes } from '../utils/helpers';
import { useDocumentPreview } from '../hooks/useDocumentPreview';
import { DocumentPreviewControls } from './DocumentPreviewControls';

interface DocumentPreviewProps {
  uploadedFile: UploadedFileDetails;
  onRemove: () => void;
  onReplace?: () => void;
  onExpand?: () => void;
  onPageCountExtracted?: (count: number) => void;
}

export const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  uploadedFile,
  onRemove,
  onReplace,
  onExpand,
  onPageCountExtracted,
}) => {
  const fileSource = (uploadedFile as any).rawFile || uploadedFile.previewUrl;
  const isImage = uploadedFile.fileCategory === 'image';
  const isText = uploadedFile.fileCategory === 'text';

  const {
    currentPage,
    totalPages,
    zoom,
    isLoading,
    isRendering,
    error,
    isPdf,
    isDocx,
    canvasRef,
    docxContainerRef,
    containerRef,
    nextPage,
    prevPage,
    goToPage,
    zoomIn,
    zoomOut,
    resetZoom,
    retry,
  } = useDocumentPreview({
    file: fileSource,
    fileCategory: uploadedFile.fileCategory,
    fileName: uploadedFile.name,
    onPageCountExtracted,
  });

  const displayPages = Math.max(totalPages, uploadedFile.totalPages || 1);
  const isMultiPageDocument = isPdf || isDocx;

  return (
    <div className="bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-4 sm:p-6 shadow-2xl shadow-black/50 space-y-4 font-sans">
      {/* 1. Header: Document Metadata & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-[#D0BCFF]/15 text-[#D0BCFF] flex items-center justify-center flex-shrink-0 border border-[#D0BCFF]/30 shadow-md">
            {isImage ? (
              <ImageIcon className="w-5 h-5" />
            ) : isDocx ? (
              <FileText className="w-5 h-5 text-blue-400" />
            ) : (
              <FileCheck className="w-5 h-5" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-[340px]">
                {uploadedFile.name}
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-[#6dd58c]/15 text-[#6dd58c] text-[10px] font-bold border border-[#6dd58c]/30 uppercase tracking-wider">
                Ready
              </span>
            </div>
            <div className="text-xs text-zinc-400 mt-0.5 flex items-center gap-2">
              <span className="font-medium text-zinc-300">{formatBytes(uploadedFile.size)}</span>
              <span>•</span>
              <span className="text-[#D0BCFF] font-semibold">
                {displayPages} {displayPages === 1 ? 'Page' : 'Pages'}
              </span>
              <span>•</span>
              <span className="uppercase text-[10px] text-zinc-400 font-mono font-bold">
                {isDocx ? 'Word DOCX' : isPdf ? 'PDF' : uploadedFile.fileCategory || 'DOC'}
              </span>
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          {onExpand && (
            <button
              type="button"
              onClick={onExpand}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-zinc-300 hover:text-[#D0BCFF] flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Expand</span>
            </button>
          )}
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 border border-white/10 hover:border-rose-400/40 text-zinc-400 hover:text-rose-300 transition-all cursor-pointer"
            title="Remove document"
            aria-label="Remove document"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Main Document Visual Stage */}
      <div
        ref={containerRef}
        className="relative bg-black/40 rounded-2xl border border-white/5 overflow-hidden min-h-[340px] sm:min-h-[440px] max-h-[580px] flex items-center justify-center p-4 overflow-auto shadow-inner"
      >
        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 p-8 text-center animate-pulse">
            <div className="w-10 h-10 border-3 border-[#D0BCFF] border-t-transparent rounded-full animate-spin" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-white">Preparing document preview...</p>
              <p className="text-[11px] text-zinc-400">
                {isDocx ? 'Formatting Word document layout & pagination' : 'Rendering high-resolution vector pages'}
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="flex flex-col items-center justify-center gap-3 p-8 text-center max-w-sm">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-rose-200">Unable to generate document preview</h4>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Your document is uploaded successfully and will print accurately. Please retry preview if needed.
              </p>
            </div>
            <button
              type="button"
              onClick={retry}
              className="mt-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-bold text-white flex items-center gap-2 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry Preview</span>
            </button>
          </div>
        )}

        {/* Rendered PDF Canvas */}
        {!isLoading && !error && isPdf && (
          <div className="relative flex justify-center items-center py-2">
            <div className="relative shadow-2xl rounded-sm overflow-hidden bg-white border border-zinc-300">
              <canvas
                ref={canvasRef}
                className="max-w-full h-auto block transition-all duration-150"
              />
              {isRendering && (
                <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center">
                  <div className="w-6 h-6 border-2 border-[#D0BCFF] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rendered DOCX HTML Container */}
        <div
          ref={docxContainerRef}
          className={`${
            !isLoading && !error && isDocx ? 'block' : 'hidden'
          } w-full max-w-2xl mx-auto py-2 transition-transform duration-150`}
          style={{ transform: `scale(${zoom})`, transformOrigin: 'top center' }}
        />

        {/* Rendered Image Preview */}
        {!isLoading && !error && isImage && (
          <div className="flex justify-center items-center max-h-full">
            <img
              src={uploadedFile.previewUrl}
              alt={uploadedFile.name}
              className="max-h-[440px] max-w-full object-contain rounded-lg shadow-2xl border border-white/10 transition-transform duration-150"
              style={{ transform: `scale(${zoom})` }}
            />
          </div>
        )}

        {/* Rendered Text Preview */}
        {!isLoading && !error && isText && (
          <div className="w-full h-full bg-black/50 p-4 rounded-xl font-mono text-xs text-zinc-300 overflow-y-auto max-h-[400px] whitespace-pre-wrap leading-relaxed border border-white/5">
            {uploadedFile.textContent || 'No text preview available.'}
          </div>
        )}
      </div>

      {/* 3. Interactive Multi-Page Navigation Controls (for PDFs and DOCX) */}
      {!error && !isLoading && (isMultiPageDocument || displayPages > 1) && (
        <DocumentPreviewControls
          currentPage={currentPage}
          totalPages={displayPages}
          zoom={zoom}
          onPrevPage={prevPage}
          onNextPage={nextPage}
          onGoToPage={goToPage}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetZoom={resetZoom}
          onExpand={onExpand}
        />
      )}
    </div>
  );
};
