/**
 * Document Watermark & Verification Code Overlay Service
 * Uses pdf-lib to embed the 8-digit verification code, HMAC checksum, and timestamp
 * on the final page of actual PDF documents without corrupting document content.
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
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

export class PdfOverlayService {
  /**
   * Embeds the AutoPrint verification stamp on the final page of an existing PDF buffer.
   * If buffer is empty or invalid, creates a clean PDF document with the verification stamp.
   */
  public static async embedVerificationStamp(
    jobId: string,
    pdfBuffer: Buffer | null,
    verificationCode: string,
    formattedCode: string,
    checksum: string
  ): Promise<WatermarkResult> {
    const timestamp = new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'medium',
    });

    let pdfDoc: PDFDocument;

    if (pdfBuffer && pdfBuffer.length > 0) {
      try {
        pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
      } catch (err) {
        console.warn(`[WATERMARK] Could not parse uploaded PDF buffer for job ${jobId}. Generating stamp PDF.`, err);
        pdfDoc = await PDFDocument.create();
        pdfDoc.addPage([595.28, 841.89]); // A4 in points
      }
    } else {
      pdfDoc = await PDFDocument.create();
      pdfDoc.addPage([595.28, 841.89]); // Standard A4
    }

    const pages = pdfDoc.getPages();
    if (pages.length === 0) {
      pdfDoc.addPage([595.28, 841.89]);
    }

    const lastPage = pages[pages.length - 1];
    const { width, height } = lastPage.getSize();

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontMono = await pdfDoc.embedFont(StandardFonts.CourierBold);

    // Footer stamp dimensions at bottom of final page
    const footerHeight = 65;
    const margin = 20;
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
      size: 9,
      font: fontBold,
      color: rgb(0.1, 0.15, 0.3),
    });

    lastPage.drawText(`VERIFICATION CODE: ${formattedCode}`, {
      x: margin + 10,
      y: footerY + footerHeight - 34,
      size: 13,
      font: fontMono,
      color: rgb(0.05, 0.2, 0.65),
    });

    lastPage.drawText('DO NOT DETACH • HAND TO STAFF AT COUNTER', {
      x: margin + 10,
      y: footerY + 10,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.4, 0.45, 0.55),
    });

    // Right Column: Checksum & Timestamp
    const rightColX = margin + footerWidth - 210;

    lastPage.drawText(`CHECKSUM: ${checksum}`, {
      x: rightColX,
      y: footerY + footerHeight - 20,
      size: 9,
      font: fontMono,
      color: rgb(0.05, 0.4, 0.5),
    });

    lastPage.drawText(`TIMESTAMP: ${timestamp}`, {
      x: rightColX,
      y: footerY + footerHeight - 34,
      size: 7.5,
      font: fontRegular,
      color: rgb(0.35, 0.4, 0.5),
    });

    lastPage.drawText('VALIDATED VIA AUTOPRINT FAIL-SAFE ENGINE', {
      x: rightColX,
      y: footerY + 10,
      size: 6.5,
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
