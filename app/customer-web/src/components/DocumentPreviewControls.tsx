import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
} from 'lucide-react';

interface DocumentPreviewControlsProps {
  currentPage: number;
  totalPages: number;
  zoom: number;
  onPrevPage: () => void;
  onNextPage: () => void;
  onGoToPage: (page: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onExpand?: () => void;
  disabled?: boolean;
}

export const DocumentPreviewControls: React.FC<DocumentPreviewControlsProps> = ({
  currentPage,
  totalPages,
  zoom,
  onPrevPage,
  onNextPage,
  onGoToPage,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onExpand,
  disabled = false,
}) => {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-black/60 backdrop-blur-md rounded-2xl border border-white/10 text-white font-sans text-xs">
      {/* Page Navigation */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onPrevPage}
          disabled={disabled || currentPage <= 1}
          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300 hover:text-white transition-colors cursor-pointer"
          title="Previous Page"
          aria-label="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1 font-mono px-2 py-1 bg-white/5 rounded-xl border border-white/5 text-[11px]">
          <span className="font-bold text-[#D0BCFF]">Page {currentPage}</span>
          <span className="text-zinc-500">of</span>
          <span className="text-zinc-400">{totalPages}</span>
        </div>

        <button
          type="button"
          onClick={onNextPage}
          disabled={disabled || currentPage >= totalPages}
          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300 hover:text-white transition-colors cursor-pointer"
          title="Next Page"
          aria-label="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Zoom & Expansion Controls */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onZoomOut}
          disabled={disabled || zoom <= 0.75}
          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300 hover:text-white transition-colors cursor-pointer"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onClick={onResetZoom}
          disabled={disabled}
          className="px-2 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-mono font-bold text-zinc-300 hover:text-white transition-colors cursor-pointer"
          title="Reset Zoom"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          type="button"
          onClick={onZoomIn}
          disabled={disabled || zoom >= 2.5}
          className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-300 hover:text-white transition-colors cursor-pointer"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        {onExpand && (
          <button
            type="button"
            onClick={onExpand}
            className="p-1.5 ml-1 rounded-xl bg-white/5 hover:bg-[#D0BCFF]/20 text-zinc-300 hover:text-[#D0BCFF] transition-colors cursor-pointer"
            title="Fullscreen Modal View"
            aria-label="Fullscreen Modal View"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
