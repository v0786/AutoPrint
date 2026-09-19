/**
 * Document Watermark & Verification Code Overlay Service
 * Uses pdf-lib and sharp to embed the 8-digit verification code, HMAC checksum, and timestamp
 * on actual PDF documents, converted images (PNG, JPEG, WebP, GIF, etc.), and text files.
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import sharp from 'sharp';
import { StorageService } from './storageService';

export interface WatermarkResult {
  processedFilePath: string;
  processedFileName: string;
  pageCount: number;
  metadata: {
    verificationCode: string;
    formattedCode: string;
    checksum: string;
    timestamp: string;
  };
}

export interface EmbedStampOptions {
  originalFileName?: string;
  mimeType?: string;
  orientation?: 'portrait' | 'landscape';
  paperFormat?: string;
  addVerificationPage?: boolean;
}

export class PdfOverlayService {
  /**
   * Embeds the AutoPrint verification stamp on the final page of an existing document.
   * Seamlessly handles PDFs, images (PNG, JPG, WebP, GIF, etc.), and plain text.
   */
  public static async embedVerificationStamp(
    jobId: string,
    rawBuffer: Buffer | null,
    verificationCode: string,
    formattedCode: string,
    checksum: string,
    options?: EmbedStampOptions
  ): Promise<WatermarkResult> {
    const timestamp = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'medium',
    });

    let pdfDoc: PDFDocument = await PDFDocument.create();

    if (rawBuffer && rawBuffer.length > 0) {
      // 1. Check if the buffer is an authentic PDF
      const isPdf =
        rawBuffer.length >= 4 &&
        rawBuffer[0] === 0x25 &&
        rawBuffer[1] === 0x50 &&
        rawBuffer[2] === 0x44 &&
        rawBuffer[3] === 0x46; // %PDF

      if (isPdf) {
        try {
          pdfDoc = await PDFDocument.load(rawBuffer, { ignoreEncryption: true });
        } catch (err) {
          console.warn(`[WATERMARK] Could not parse uploaded PDF buffer for job ${jobId}. Generating fallback.`, err);
          pdfDoc = await PDFDocument.create();
          pdfDoc.addPage([595.28, 841.89]);
        }
      } else {
        // 2. Check if the buffer is an image (PNG, JPEG, WebP, TIFF, GIF, BMP, etc.)
        let isImageHandled = false;
        try {
          const meta = await sharp(rawBuffer).metadata();
          if (meta && meta.width && meta.height) {
            // Convert any image format to standard high-resolution PNG buffer
            const pngBuffer = await sharp(rawBuffer).png().toBuffer();
            pdfDoc = await PDFDocument.create();
            const embeddedImg = await pdfDoc.embedPng(pngBuffer);

            // Determine page dimensions
            const isLandscape =
              options?.orientation === 'landscape' ||
              (!options?.orientation && meta.width > meta.height);
            const pageWidth = isLandscape ? 841.89 : 595.28;
            const pageHeight = isLandscape ? 595.28 : 841.89;

            const page = pdfDoc.addPage([pageWidth, pageHeight]);

            // Layout image cleanly above the verification footer
            const margin = 20;
            const footerHeight = 65;
            const availX = margin;
            const availY = margin + footerHeight + 15;
            const availWidth = pageWidth - margin * 2;
            const availHeight = pageHeight - availY - margin;

            const scale = Math.min(availWidth / embeddedImg.width, availHeight / embeddedImg.height);
            const drawWidth = embeddedImg.width * scale;
            const drawHeight = embeddedImg.height * scale;
            const drawX = availX + (availWidth - drawWidth) / 2;
            const drawY = availY + (availHeight - drawHeight) / 2;

            page.drawImage(embeddedImg, {
              x: drawX,
              y: drawY,
              width: drawWidth,
              height: drawHeight,
            });

            isImageHandled = true;
          }
        } catch (imgErr) {
          console.warn(`[WATERMARK] Sharp could not process image buffer for job ${jobId}:`, imgErr);
        }

        if (!isImageHandled) {
          // 3. Plain text format
          const isText =
            options?.originalFileName?.match(/\.(txt|csv|log|json|md|tsv)$/i) ||
            options?.mimeType?.startsWith('text/');

          if (isText) {
            pdfDoc = await PDFDocument.create();
            const font = await pdfDoc.embedFont(StandardFonts.Courier);
            const text = rawBuffer.toString('utf-8');
            const lines = text.split(/\r?\n/);

            let currentPage = pdfDoc.addPage([595.28, 841.89]);
            let currentY = 841.89 - 40;
            const fontSize = 10;
            const lineHeight = 13;
            const maxY = 100; // Above footer stamp

            for (const line of lines) {
              const maxChars = 80;
              const subLines =
                line.length > maxChars
                  ? line.match(new RegExp(`.{1,${maxChars}}`, 'g')) || [line]
                  : [line];

              for (const sub of subLines) {
                if (currentY < maxY) {
                  currentPage = pdfDoc.addPage([595.28, 841.89]);
                  currentY = 841.89 - 40;
                }
                currentPage.drawText(sub, {
                  x: 30,
                  y: currentY,
                  size: fontSize,
                  font,
                  color: rgb(0.1, 0.1, 0.1),
                });
                currentY -= lineHeight;
              }
            }
          } else {
            // Fallback for unrecognized binary
            pdfDoc = await PDFDocument.create();
            pdfDoc.addPage([595.28, 841.89]);
          }
        }
      }
    } else {
      pdfDoc = await PDFDocument.create();
      pdfDoc.addPage([595.28, 841.89]); // Standard A4
    }

    if (options?.addVerificationPage === false) {
      const bytes = await pdfDoc.save();
      const saved = StorageService.saveProcessedFile(jobId, Buffer.from(bytes), 'pdf');
      return { processedFilePath: saved.absolutePath, processedFileName: saved.fileName, pageCount: pdfDoc.getPages().length,
        metadata: { verificationCode, formattedCode, checksum, timestamp } };
    }

    const pages = pdfDoc.getPages();
    if (pages.length === 0) {
      pdfDoc.addPage([595.28, 841.89]);
    }

    const lastPage = pdfDoc.addPage([841.89, 595.28]);
    const { width } = lastPage.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontMono = await pdfDoc.embedFont(StandardFonts.CourierBold);

    // Footer stamp dimensions at bottom of final page
    const footerHeight = 400;
    const margin = 55;
    const footerY = margin;
    const footerWidth = width - margin * 2;

    // Background banner for verification box
    lastPage.drawRectangle({
      x: margin,
      y: footerY,
      width: footerWidth,
      height: footerHeight,
      color: rgb(0.96, 0.97, 0.99),
      borderColor: rgb(0.15, 0.23, 0.36),
      borderWidth: 1,
    });

    // Top dashed separator line
    lastPage.drawLine({
      start: { x: margin + 5, y: footerY + footerHeight },
      end: { x: margin + footerWidth - 5, y: footerY + footerHeight },
      thickness: 1,
      color: rgb(0.3, 0.35, 0.45),
    });

    // Left Column: Header & Formatted Verification Code
    lastPage.drawText('AUTOPRINT VERIFICATION STAMP', {
      x: margin + 10,
      y: footerY + footerHeight - 16,
      size: 18,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.3),
    });

    lastPage.drawText(`VERIFICATION CODE: ${formattedCode}`, {
      x: margin + 10,
      y: footerY + footerHeight - 34,
      size: 34,
      font: fontMono,
      color: rgb(0.05, 0.2, 0.65),
    });

    lastPage.drawText('DO NOT DETACH • HAND TO STAFF AT COUNTER', {
      x: margin + 10,
      y: footerY + 10,
      size: 15,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.55),
    });

    // Right Column: Checksum & Timestamp
    const rightColX = margin + footerWidth - 210;

    lastPage.drawText(`CHECKSUM: ${checksum}`, {
      x: rightColX,
      y: footerY + footerHeight - 20,
      size: 18,
      font: fontMono,
      color: rgb(0.05, 0.4, 0.5),
    });

    lastPage.drawText(`TIMESTAMP: ${timestamp}`, {
      x: rightColX,
      y: footerY + footerHeight - 34,
      size: 15,
      font: fontRegular,
      color: rgb(0.35, 0.4, 0.5),
    });

    lastPage.drawText('VALIDATED VIA AUTOPRINT FAIL-SAFE ENGINE', {
      x: rightColX,
      y: footerY + 10,
      size: 13,
      font: fontRegular,
      color: rgb(0.45, 0.5, 0.6),
    });

    // Serialize modified PDF
    const modifiedBytes = await pdfDoc.save();
    const modifiedBuffer = Buffer.from(modifiedBytes);

    // Save processed PDF to persistent storage
    const saved = StorageService.saveProcessedFile(jobId, modifiedBuffer, 'pdf');

    return {
      processedFilePath: saved.absolutePath,
      processedFileName: saved.fileName,
      pageCount: pages.length,
      metadata: {
        verificationCode,
        formattedCode,
        checksum,
        timestamp,
      },
    };
  }
}
