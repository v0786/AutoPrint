/**
 * Local installation identity.
 *
 * Merchant identity is stable across a store's devices. Device and
 * installation identity are generated independently for each installation and
 * are never derived from shop names, phone numbers, or host names.
 */
import crypto from 'crypto';
import { getDb } from '../db';

export interface InstallationIdentity {
  merchant_id: string;
  device_id: string;
  installation_id: string;
  shop_name: string;
  owner_name: string;
  mobile_number: string | null;
  cloud_mode: 'LOCAL' | 'CLOUD_CONNECTED';
  cloud_status: 'ONLINE' | 'OFFLINE' | 'CONNECTING' | 'ERROR';
  created_at: string;
  updated_at: string;
}

function newIdentifier(prefix: string): string {
  return `${prefix}-${crypto.randomUUID().replace(/-/g, '').toUpperCase()}`;
}

export class InstallationIdentityRepository {
  public static get(): InstallationIdentity | null {
    return (getDb().prepare('SELECT * FROM installation_identity WHERE id = 1').get() as InstallationIdentity | undefined) || null;
  }

  public static create(input: {
    shopName: string;
    ownerName: string;
    mobileNumber?: string | null;
    merchantId?: string;
  }): InstallationIdentity {
    const existing = this.get();
    if (existing) return existing;

    const merchantId = input.merchantId || newIdentifier('AP-M');
    const row = {
      merchantId,
      deviceId: newIdentifier('DEV'),
      installationId: newIdentifier('INST'),
      shopName: input.shopName.trim(),
      ownerName: input.ownerName.trim(),
      mobileNumber: input.mobileNumber?.trim() || null,
    };

    getDb().prepare(`
      INSERT INTO installation_identity (
        id, merchant_id, device_id, installation_id, shop_name, owner_name, mobile_number
      ) VALUES (1, @merchantId, @deviceId, @installationId, @shopName, @ownerName, @mobileNumber)
    `).run(row);

    return this.get()!;
  }

  public static ensure(input: {
    shopName?: string;
    ownerName?: string;
    mobileNumber?: string | null;
    merchantId?: string;
  } = {}): InstallationIdentity {
    const existing = this.get();
    if (existing) return existing;
    return this.create({
      shopName: input.shopName || 'AutoPrint Store',
      ownerName: input.ownerName || 'Store Owner',
      mobileNumber: input.mobileNumber,
      merchantId: input.merchantId,
    });
  }

  public static updateCloudStatus(status: InstallationIdentity['cloud_status'], mode?: InstallationIdentity['cloud_mode']): void {
    getDb().prepare(`
      UPDATE installation_identity
      SET cloud_status = ?, cloud_mode = COALESCE(?, cloud_mode), updated_at = datetime('now')
      WHERE id = 1
    `).run(status, mode || null);
  }
}

