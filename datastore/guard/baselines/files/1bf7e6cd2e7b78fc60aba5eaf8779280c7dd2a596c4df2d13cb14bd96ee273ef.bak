/**
 * Dynamic Configuration & Access Ingress Controller
 * Serves public runtime metadata, dynamic customer QR images, and PageKite tunnel status.
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { tunnelService } from '../services/tunnelService';
import { QrCodeService } from '../services/qrCodeService';

const updatePageKiteSchema = z.object({
  subdomain: z.string().min(1, 'Subdomain is required').regex(/^[a-zA-Z0-9_-]{1,64}$/, 'Subdomain may only contain alphanumeric characters, hyphens, and underscores'),
  enabled: z.boolean().default(true),
  secret: z.string().regex(/^[a-zA-Z0-9_.-]{1,128}$/, 'Invalid secret format').optional().or(z.literal('')),
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

  /**
   * Verifies PageKite credentials and connectivity with live probe.
   */
  public static async verifyPageKiteConfig(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = z
        .object({
          subdomain: z.string().min(1, 'Subdomain or Kite Name is required').regex(/^[a-zA-Z0-9_.-]{1,64}$/, 'Invalid subdomain characters'),
          secret: z.string().min(1, 'Secret Key is required').regex(/^[a-zA-Z0-9_.-]{1,128}$/, 'Invalid secret format'),
          domain: z.string().optional().default('pagekite.me'),
        })
        .parse(req.body);

      // Clean domain suffix if included in subdomain
      const cleanSub = parsed.subdomain.replace(/\.pagekite\.me$/i, '').trim().toLowerCase();
      const result = await tunnelService.verifyPageKite(cleanSub, parsed.secret, parsed.domain);

      if (result.success) {
        res.status(200).json({
          ok: true,
          verified: true,
          message: result.message,
          publicUrl: result.publicUrl,
        });
      } else {
        res.status(400).json({
          ok: false,
          verified: false,
          error: result.message,
          publicUrl: result.publicUrl,
        });
      }
    } catch (err: any) {
      if (err.errors) {
        res.status(400).json({ ok: false, error: err.errors[0]?.message || 'Validation error.' });
      } else {
        next(err);
      }
    }
  }
}
