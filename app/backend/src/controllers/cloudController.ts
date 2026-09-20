import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { MerchantRepository } from '../database/repositories/merchantRepository';
import { InstallationIdentityRepository } from '../database/repositories/installationIdentityRepository';
import { CloudActivationService } from '../services/cloudActivationService';
import { SupabaseAdminClient } from '../services/supabase/supabaseAdminClient';

const activationSchema = z.object({ code: z.string().trim().min(9).max(20) });

export class CloudController {
  public static getStatus(_req: Request, res: Response): void {
    const identity = InstallationIdentityRepository.get();
    res.json({
      ok: true,
      mode: identity?.cloud_mode || 'LOCAL',
      status: identity?.cloud_status || 'OFFLINE',
      configured: SupabaseAdminClient.isConfigured(),
      merchantId: identity?.merchant_id || null,
      deviceId: identity?.device_id || null,
      installationId: identity?.installation_id || null,
    });
  }

  public static createActivationCode(_req: Request, res: Response, next: NextFunction): void {
    try {
      if (!MerchantRepository.getPrimaryMerchant()) {
        res.status(409).json({ ok: false, error: 'Complete local merchant onboarding first.' });
        return;
      }
      res.json({ ok: true, data: CloudActivationService.createCode() });
    } catch (err) {
      next(err);
    }
  }

  public static async activate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = activationSchema.parse(req.body);
      const result = await CloudActivationService.connect(parsed.code);
      if (!result.connected) {
        res.status(400).json({ ok: false, error: result.reason || 'Cloud activation failed.' });
        return;
      }
      res.json({ ok: true, data: result });
    } catch (err) {
      next(err);
    }
  }
}

