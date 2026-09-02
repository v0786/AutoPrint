/**
 * Payment Configuration Repository — Persistent SQLite storage for merchant
 * UPI receiver details, QR data URLs, and Payment Gateway credentials.
 */

import { getDb } from '../db';
import { v4 as uuidv4 } from 'uuid';

export interface PaymentConfigRecord {
  id: string;
  merchant_id: string | null;
  provider: 'UPI_DIRECT' | 'RAZORPAY' | 'JUSPAY';
  upi_id: string | null;
  upi_payee_name: string | null;
  upi_qr_data_url: string | null;
  razorpay_key_id: string | null;
  razorpay_key_secret: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export class PaymentConfigRepository {
  public static getConfig(): PaymentConfigRecord | null {
    const db = getDb();
    const row = db.prepare('SELECT * FROM payment_config WHERE is_active = 1 ORDER BY updated_at DESC LIMIT 1').get() as PaymentConfigRecord | undefined;
    return row || null;
  }

  public static saveConfig(data: {
    merchantId?: string;
    provider?: 'UPI_DIRECT' | 'RAZORPAY' | 'JUSPAY';
    upiId?: string;
    upiPayeeName?: string;
    upiQrDataUrl?: string;
    razorpayKeyId?: string;
    razorpayKeySecret?: string;
  }): PaymentConfigRecord {
    const db = getDb();
    const existing = this.getConfig();

    if (existing) {
      db.prepare(`
        UPDATE payment_config SET
          merchant_id = COALESCE(?, merchant_id),
          provider = COALESCE(?, provider),
          upi_id = COALESCE(?, upi_id),
          upi_payee_name = COALESCE(?, upi_payee_name),
          upi_qr_data_url = COALESCE(?, upi_qr_data_url),
          razorpay_key_id = COALESCE(?, razorpay_key_id),
          razorpay_key_secret = COALESCE(?, razorpay_key_secret),
          updated_at = datetime('now')
        WHERE id = ?
      `).run(
        data.merchantId ?? null,
        data.provider ?? null,
        data.upiId ?? null,
        data.upiPayeeName ?? null,
        data.upiQrDataUrl ?? null,
        data.razorpayKeyId ?? null,
        data.razorpayKeySecret ?? null,
        existing.id
      );

      return this.getConfig()!;
    } else {
      const id = uuidv4();
      db.prepare(`
        INSERT INTO payment_config (
          id, merchant_id, provider, upi_id, upi_payee_name,
          upi_qr_data_url, razorpay_key_id, razorpay_key_secret, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
      `).run(
        id,
        data.merchantId ?? null,
        data.provider || 'UPI_DIRECT',
        data.upiId || null,
        data.upiPayeeName || null,
        data.upiQrDataUrl || null,
        data.razorpayKeyId || null,
        data.razorpayKeySecret || null
      );

      return this.getConfig()!;
    }
  }

  public static getPublicPaymentConfig() {
    const config = this.getConfig();
    return {
      provider: config?.provider || 'UPI_DIRECT',
      upiId: config?.upi_id || null,
      upiPayeeName: config?.upi_payee_name || null,
      upiQrDataUrl: config?.upi_qr_data_url || null,
      razorpayKeyId: config?.razorpay_key_id || null,
      isConfigured: Boolean(config?.upi_id || config?.razorpay_key_id),
    };
  }
}
