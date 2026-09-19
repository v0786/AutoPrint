/**
 * Dynamic QR Code Generation Service
 * Generates high-resolution QR codes dynamically pointing to the active Customer Web URL
 * (PageKite public tunnel or LAN address) and saves rendered assets in the datastore.
 */

import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';
import { PATHS } from '../config/environment';

export class QrCodeService {
  private static cachedQrDataUrl: string | null = null;
  private static cachedTargetUrl: string | null = null;

  /**
   * Generates a Data URL (base64 PNG) for the specified target URL.
   */
  public static async generateDataUrl(targetUrl: string): Promise<string> {
    if (this.cachedTargetUrl === targetUrl && this.cachedQrDataUrl) {
      return this.cachedQrDataUrl;
    }

    const dataUrl = await QRCode.toDataURL(targetUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 400,
      color: {
        dark: '#002B49',
        light: '#FFFFFF',
      },
    });

    this.cachedTargetUrl = targetUrl;
    this.cachedQrDataUrl = dataUrl;

    // Save PNG asset to datastore
    try {
      const qrDir = path.join(PATHS.DATA_DIR, 'generated', 'qr');
      if (!fs.existsSync(qrDir)) {
        fs.mkdirSync(qrDir, { recursive: true });
      }
      const buffer = Buffer.from(dataUrl.split(',')[1], 'base64');
      fs.writeFileSync(path.join(qrDir, 'customer-kiosk-qr.png'), buffer);
    } catch (e) {
      console.warn('[QR] Failed to write QR asset to disk:', e);
    }

    return dataUrl;
  }

  /**
   * Generates a PNG Buffer for binary HTTP streaming.
   */
  public static async generatePngBuffer(targetUrl: string): Promise<Buffer> {
    return QRCode.toBuffer(targetUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 500,
      color: {
        dark: '#002B49',
        light: '#FFFFFF',
      },
    });
  }

  /**
   * Generates SVG string for scalable kiosk standee printing.
   */
  public static async generateSvgString(targetUrl: string): Promise<string> {
    return QRCode.toString(targetUrl, {
      type: 'svg',
      errorCorrectionLevel: 'H',
      margin: 2,
    });
  }
}
