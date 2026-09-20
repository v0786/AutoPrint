/**
 * Configuration & Access Ingress Controller
 * Serves public runtime metadata and dynamic customer QR code images.
 */

import { Request, Response, NextFunction } from 'express';
import { localAccessService } from '../services/localAccessService';
import { QrCodeService } from '../services/qrCodeService';

export class ConfigController {
  /**
   * Returns public runtime configuration including the active customer ingress URL.
   */
  public static async getPublicConfig(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const config = await localAccessService.getPublicConfig();
      res.status(200).json({
        ok: true,
        data: config,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Generates and streams a dynamic PNG QR code image for customer access.
   */
  public static async getQrCodeImage(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerUrl = localAccessService.getActiveCustomerUrl();
      const pngBuffer = await QrCodeService.generatePngBuffer(customerUrl);

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.status(200).send(pngBuffer);
    } catch (err) {
      next(err);
    }
  }
}
