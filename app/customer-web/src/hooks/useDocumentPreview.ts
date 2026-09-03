/**
 * Hook for managing interactive document preview state and rendering.
 * Supports PDF (Canvas via PDF.js), DOCX (OpenXML layout via docx-preview), images, and text.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { documentPreviewService, PdfDocumentInfo, DocxDocumentInfo } from '../services/documentPreviewService';
import type { PDFDocumentProxy } from 'pdfjs-dist';

export interface UseDocumentPreviewProps {
  file: File | Blob | string | null;
  fileCategory?: string;
  fileName?: string;
  onPageCountExtracted?: (count: number) => void;
}

export function useDocumentPreview({
  file,
  fileCategory = 'pdf',
  fileName = '',
  onPageCountExtracted,
}: UseDocumentPreviewProps) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [zoom, setZoom] = useState<number>(1.0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const docxContainerRef = useRef<HTMLDivElement | null>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const isDocx =
    fileCategory === 'doc' ||
    fileCategory === 'docx' ||
    fileName.toLowerCase().endsWith('.docx') ||
    fileName.toLowerCase().endsWith('.doc');

  const isPdf =
    fileCategory === 'pdf' ||
    fileName.toLowerCase().endsWith('.pdf');

  // Load document (PDF or DOCX)
  const loadDocument = useCallback(async () => {
    if (!file) {
      pdfDocRef.current = null;
      setTotalPages(1);
      setCurrentPage(1);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (isPdf) {
        const info: PdfDocumentInfo = await documentPreviewService.loadPdf(file);
        pdfDocRef.current = info.doc;
        setTotalPages(info.numPages);
        setCurrentPage(1);
        if (onPageCountExtracted) {
          onPageCountExtracted(info.numPages);
        }
      } else if (isDocx && docxContainerRef.current) {
        const info: DocxDocumentInfo = await documentPreviewService.renderDocx(
          file as File | Blob,
          docxContainerRef.current
        );
        setTotalPages(info.numPages);
        setCurrentPage(1);
        if (onPageCountExtracted) {
          onPageCountExtracted(info.numPages);
        }
      } else {
        // Non-paged formats (image / text)
        setTotalPages(1);
        setCurrentPage(1);
      }
    } catch (err: any) {
      console.error('Failed to load document preview:', err);
      setError(err?.message || 'Could not parse document structure for visual preview.');
    } finally {
      setIsLoading(false);
    }
  }, [file, isPdf, isDocx, onPageCountExtracted]);

  useEffect(() => {
    loadDocument();

    return () => {
      documentPreviewService.cleanup();
    };
  }, [loadDocument]);

  // Render current visible page to canvas for PDF
  const renderCurrentPage = useCallback(async () => {
    if (!isPdf || !pdfDocRef.current || !canvasRef.current) return;

    setIsRendering(true);
    try {
      const containerWidth = containerRef.current?.clientWidth || 450;
      const targetWidth = containerWidth * zoom;
      await documentPreviewService.renderPdfPage(
        pdfDocRef.current,
        currentPage,
        canvasRef.current,
        targetWidth
      );
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        console.error('Page render error:', err);
      }
    } finally {
      setIsRendering(false);
    }
  }, [currentPage, zoom, isPdf]);

  // Handle page change for PDF or DOCX
  useEffect(() => {
    if (isPdf && pdfDocRef.current && !isLoading) {
      renderCurrentPage();
    } else if (isDocx && docxContainerRef.current && !isLoading) {
      documentPreviewService.showDocxPage(docxContainerRef.current, currentPage);
    }
  }, [currentPage, zoom, isLoading, isPdf, isDocx, renderCurrentPage]);

  // Handle window resize gracefully
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (isPdf && pdfDocRef.current) {
          renderCurrentPage();
        }
      }, 150);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timeout);
    };
  }, [isPdf, renderCurrentPage]);

  const nextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  };

  const prevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  };

  const goToPage = (pageNumber: number) => {
    const valid = Math.max(1, Math.min(totalPages, pageNumber));
    setCurrentPage(valid);
  };

  const zoomIn = () => {
    setZoom((prev) => Math.min(2.5, +(prev + 0.25).toFixed(2)));
  };

  const zoomOut = () => {
    setZoom((prev) => Math.max(0.75, +(prev - 0.25).toFixed(2)));
  };

  const resetZoom = () => {
    setZoom(1.0);
  };

  const retry = () => {
    loadDocument();
  };

  return {
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
  };
}
