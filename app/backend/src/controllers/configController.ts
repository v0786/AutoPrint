/**
 * Dynamic Configuration & Access Ingress Controller
 * Serves public runtime metadata, dynamic customer QR images, and PageKite tunnel status.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { tunnelService } from '../services/tunnelService';
import { QrCodeService } from '../services/qrCodeService';

const updatePageKiteSchema = z.object({
  subdomain: z.string().min(1, 'Subdomain is required'),
  enabled: z.boolean().default(true),
  secret: z.string().optional(),
});

export class ConfigController {
  /**
   * Returns public runtime configuration and active customer ingress URL.
   */
  public static async getPublicConfig(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const config = await tunnelService.getPublicConfig();
      res.status(200).json({
        ok: true,
        data: config,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Generates and streams dynamic PNG QR code image for customer access.
   */
  public static async getQrCodeImage(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customerUrl = tunnelService.getActiveCustomerUrl();
      const pngBuffer = await QrCodeService.generatePngBuffer(customerUrl);

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=60');
      res.status(200).send(pngBuffer);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Updates PageKite tunnel configuration (merchant protected).
   */
  public static async updatePageKiteConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = updatePageKiteSchema.parse(req.body);
      const state = tunnelService.updateTunnelConfig(parsed.subdomain, parsed.enabled, parsed.secret);

      res.status(200).json({
        ok: true,
        message: `PageKite tunnel ${parsed.enabled ? 'enabled' : 'disabled'} for https://${parsed.subdomain.toLowerCase()}.pagekite.me`,
        data: state,
      });
    } catch (err) {
      next(err);
    }
  }
}
