/**
 * AutoPrint Document Preview Service
 * High-performance PDF and DOCX rendering service.
 * - PDF: Powered by PDF.js with on-demand Canvas rendering and page isolation.
 * - DOCX: Powered by docx-preview with formatted OpenXML layout, accurate page breakdown, and DOM pagination.
 */

import * as pdfjsLib from 'pdfjs-dist';
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { renderAsync as renderDocxAsync } from 'docx-preview';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

export interface PdfDocumentInfo {
  doc: pdfjsLib.PDFDocumentProxy;
  numPages: number;
  fingerprint: string;
}

export interface DocxDocumentInfo {
  numPages: number;
  sectionsCount: number;
}

class DocumentPreviewService {
  private activeRenderTask: pdfjsLib.RenderTask | null = null;
  private documentCache: Map<string, pdfjsLib.PDFDocumentProxy> = new Map();

  /**
   * Loads a PDF Document from a File, ArrayBuffer, or Blob URL.
   */
  public async loadPdf(source: File | Blob | string): Promise<PdfDocumentInfo> {
    let data: ArrayBuffer;

    if (typeof source === 'string') {
      const response = await fetch(source);
      data = await response.arrayBuffer();
    } else {
      data = await source.arrayBuffer();
    }

    const loadingTask = pdfjsLib.getDocument({
      data,
      cMapUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/cmaps/',
      cMapPacked: true,
    });

    const doc = await loadingTask.promise;
    this.documentCache.set(doc.fingerprints[0] || 'default', doc);

    return {
      doc,
      numPages: doc.numPages,
      fingerprint: doc.fingerprints[0] || 'default',
    };
  }

  /**
   * Renders a specific single page onto an HTML5 Canvas.
   * Cancels any pending rendering task to prevent canvas collision or race conditions.
   */
  public async renderPdfPage(
    doc: pdfjsLib.PDFDocumentProxy,
    pageNumber: number,
    canvas: HTMLCanvasElement,
    targetWidth?: number
  ): Promise<void> {
    // 1. Cancel previous rendering task if running
    if (this.activeRenderTask) {
      try {
        this.activeRenderTask.cancel();
      } catch {
        // Ignore cancel exceptions
      }
      this.activeRenderTask = null;
    }

    // 2. Fetch page proxy
    const page = await doc.getPage(pageNumber);

    // 3. Compute responsive scale
    const baseViewport = page.getViewport({ scale: 1.0 });
    const desiredWidth = targetWidth || canvas.parentElement?.clientWidth || baseViewport.width;
    const scale = Math.min(2.0, Math.max(0.5, desiredWidth / baseViewport.width));
    const viewport = page.getViewport({ scale });

    // 4. Set canvas dimensions
    const outputScale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);
    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Could not get 2D canvas context.');

    // High DPI scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

    // 5. Render
    const renderContext = {
      canvasContext: ctx,
      viewport,
      transform,
    };

    const renderTask = page.render(renderContext);
    this.activeRenderTask = renderTask;

    try {
      await renderTask.promise;
    } catch (err: any) {
      if (err?.name !== 'RenderingCancelledException') {
        throw err;
      }
    } finally {
      if (this.activeRenderTask === renderTask) {
        this.activeRenderTask = null;
      }
    }
  }

  /**
   * Renders a DOCX Document directly into a DOM container using docx-preview.
   * Extracts exact page count from rendered OpenXML sections and enables pagination mode.
   */
  public async renderDocx(
    source: File | Blob | ArrayBuffer,
    targetContainer: HTMLElement
  ): Promise<DocxDocumentInfo> {
    targetContainer.innerHTML = '';

    let data: Blob | ArrayBuffer;
    if (source instanceof Blob || source instanceof ArrayBuffer) {
      data = source;
    } else {
      data = await (source as File).arrayBuffer();
    }

    // Render formatted Word document into DOM
    await renderDocxAsync(data, targetContainer, undefined, {
      className: 'docx',
      inWrapper: true,
      ignoreWidth: false,
      ignoreHeight: false,
      ignoreFonts: false,
      breakPages: true,
      ignoreLastRenderedPageBreak: false,
      experimental: true,
      trimXmlDeclaration: true,
      useBase64URL: true,
    });

    // Detect pages from rendered sections
    const wrapper = targetContainer.querySelector('.docx-wrapper');
    const sections = targetContainer.querySelectorAll<HTMLElement>('.docx-wrapper > section.docx');
    const totalPages = Math.max(1, sections.length);

    if (wrapper && sections.length > 0) {
      wrapper.classList.add('paged-mode');
      sections.forEach((sec, idx) => {
        if (idx === 0) {
          sec.classList.add('active-page');
        } else {
          sec.classList.remove('active-page');
        }
      });
    }

    return {
      numPages: totalPages,
      sectionsCount: sections.length,
    };
  }

  /**
   * Switches the active visible page for a rendered DOCX document.
   */
  public showDocxPage(targetContainer: HTMLElement, pageNumber: number): void {
    const sections = targetContainer.querySelectorAll<HTMLElement>('.docx-wrapper > section.docx');
    if (sections.length === 0) return;

    const targetIdx = Math.max(0, Math.min(sections.length - 1, pageNumber - 1));
    sections.forEach((sec, idx) => {
      if (idx === targetIdx) {
        sec.classList.add('active-page');
      } else {
        sec.classList.remove('active-page');
      }
    });
  }

  /**
   * Release cached documents and temporary resources
   */
  public cleanup(fingerprint?: string) {
    if (this.activeRenderTask) {
      try {
        this.activeRenderTask.cancel();
      } catch {}
      this.activeRenderTask = null;
    }

    if (fingerprint && this.documentCache.has(fingerprint)) {
      const doc = this.documentCache.get(fingerprint);
      doc?.destroy();
      this.documentCache.delete(fingerprint);
    } else {
      this.documentCache.forEach((d) => d.destroy());
      this.documentCache.clear();
    }
  }
}

export const documentPreviewService = new DocumentPreviewService();
