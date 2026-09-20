import crypto from 'crypto';
import { getDb } from '../database/db';
import { InstallationIdentityRepository } from '../database/repositories/installationIdentityRepository';
import { SupabaseAdminClient } from './supabase/supabaseAdminClient';
import { CloudSyncService } from './supabase/cloudSyncService';

export interface ActivationCodeResult {
  code: string;
  expiresAt: string;
  merchantId: string;
  deviceId: string;
  installationId: string;
}

function hashCode(code: string): string {
  return crypto.createHash('sha256').update(code.trim().toUpperCase()).digest('hex');
}

function createCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const part = () => Array.from({ length: 4 }, () => alphabet[crypto.randomInt(0, alphabet.length)]).join('');
  return `AUTO-${part()}-${part()}`;
}

export class CloudActivationService {
  public static createCode(): ActivationCodeResult {
    const identity = InstallationIdentityRepository.get();
    if (!identity) throw new Error('Complete local merchant onboarding before cloud activation.');
    const code = createCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    getDb().prepare(`
      INSERT INTO cloud_pairing_codes (
        id, code_hash, merchant_id, device_id, installation_id, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      hashCode(code),
      identity.merchant_id,
      identity.device_id,
      identity.installation_id,
      expiresAt
    );
    return {
      code,
      expiresAt,
      merchantId: identity.merchant_id,
      deviceId: identity.device_id,
      installationId: identity.installation_id,
    };
  }

  public static async connect(code: string): Promise<{ connected: boolean; reason?: string }> {
    const row = getDb().prepare(`
      SELECT id FROM cloud_pairing_codes
      WHERE code_hash = ? AND consumed_at IS NULL AND datetime(expires_at) > datetime('now')
      LIMIT 1
    `).get(hashCode(code)) as { id: string } | undefined;
    if (!row) return { connected: false, reason: 'Activation code is invalid or expired.' };

    getDb().prepare('UPDATE cloud_pairing_codes SET consumed_at = datetime(\'now\') WHERE id = ?').run(row.id);
    if (!SupabaseAdminClient.isConfigured()) {
      InstallationIdentityRepository.updateCloudStatus('OFFLINE', 'LOCAL');
      return { connected: false, reason: 'Cloud is not configured; local printing remains operational.' };
    }

    const authenticated = await CloudSyncService.authenticateDevice();
    if (!authenticated) {
      InstallationIdentityRepository.updateCloudStatus('ERROR', 'LOCAL');
      return { connected: false, reason: 'Device authorization was not accepted by AutoPrint Cloud.' };
    }
    const registered = await CloudSyncService.registerDevice();
    if (!registered) {
      InstallationIdentityRepository.updateCloudStatus('ERROR', 'LOCAL');
      return { connected: false, reason: 'Cloud identity is not authorized for this merchant.' };
    }
    InstallationIdentityRepository.updateCloudStatus('ONLINE', 'CLOUD_CONNECTED');
    return { connected: true };
  }
}
