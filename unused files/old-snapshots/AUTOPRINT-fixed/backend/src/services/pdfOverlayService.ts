/**
 * PDF / Document Watermark & Verification Code Overlay Service
 * Embeds the 8-digit verification code and security checksum on the final page of documents
 * cleanly without altering layout flow or line spacing.
 */

export interface EmbedResult {
  contentHtml: string;
  footerMetadata: {
    verificationCode: string;
    formattedCode: string;
    checksum: string;
    timestamp: string;
  };
}

export class PdfOverlayService {
  /**
   * Embeds verification code and checksum stamp footer on the document.
   * Creates a dedicated final page OCR stamp footer container.
   */
  public static embedVerificationCodeOnFinalPage(
    rawHtml: string,
    verificationCode: string,
    formattedCode: string,
    checksum: string
  ): EmbedResult {
    const timestamp = new Date().toLocaleString();
    const footerHtml = `
<div class="autoprint-final-page-footer" style="margin-top: 40px; padding-top: 15px; border-top: 2px dashed #000000; page-break-before: auto; font-family: monospace; font-size: 12px; color: #1e293b; background: #f8fafc; padding: 12px; border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
  <div>
    <div style="font-weight: bold; font-size: 14px; letter-spacing: 2px; color: #0f172a;">
      VERIFICATION CODE: <span style="background: #e0e7ff; padding: 2px 8px; border-radius: 4px; font-weight: 800; color: #3730a3;">${formattedCode}</span>
    </div>
    <div style="font-size: 10px; color: #64748b; margin-top: 4px;">
      AUTOPRINT VERIFICATION STAMP • DO NOT DETACH • HAND TO STAFF AT COUNTER
    </div>
  </div>
  <div style="text-align: right; font-size: 11px;">
    <div>CHECKSUM: <strong style="color: #0284c7;">${checksum}</strong></div>
    <div style="font-size: 9px; color: #94a3b8; margin-top: 2px;">TIMESTAMP: ${timestamp}</div>
  </div>
</div>
`;

    let contentHtml = rawHtml || `<div style="font-family: sans-serif; padding: 20px;"><h2>Printed Document</h2></div>`;
    
    // Append to document container cleanly
    contentHtml = `${contentHtml}\n${footerHtml}`;

    return {
      contentHtml,
      footerMetadata: {
        verificationCode,
        formattedCode,
        checksum,
        timestamp,
      },
    };
  }
}
