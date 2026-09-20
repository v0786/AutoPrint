/**
 * Local Access & Customer Ingress URL Management Service
 * Computes the active customer access URL based on environment configuration.
 * V1 (Local): LAN IP or localhost URL.
 * V2 (Cloud): AUTOPRINT_CLOUD_URL points to the centrally deployed store (https://autoprint.com/store/:merchantId).
 */

import os from 'os';
import { CONFIG } from '../config/environment';
import { QrCodeService } from './qrCodeService';
import { MerchantRepository } from '../database/repositories/merchantRepository';

export interface PublicRuntimeConfig {
  service: string;
  version: string;
  customerUrl: string;
  merchantId: string | null;
  qrCodeUrl: string;
  qrCodeDataUrl: string | null;
  ports: {
    backend: number;
    merchant: number;
    customer: number;
  };
}

export class LocalAccessService {
  private currentCustomerUrl: string = '';

  constructor() {
    this.currentCustomerUrl = this.computeActiveCustomerUrl();
  }

  private getLocalIpAddress(): string {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name] || []) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
    return '127.0.0.1';
  }

  private computeActiveCustomerUrl(): string {
    // V2 uses one centrally deployed customer website. The merchant is part
    // of the route data, never a separate deployment or tunnel.
    if (process.env.AUTOPRINT_CLOUD_URL) {
      this.currentCustomerUrl = process.env.AUTOPRINT_CLOUD_URL.replace(/\/$/, '');
      return this.currentCustomerUrl;
    }

    // V1: LAN IP for local network access
    const lanIp = this.getLocalIpAddress();
    this.currentCustomerUrl = `http://${lanIp}:${CONFIG.CUSTOMER_PORT}`;
    return this.currentCustomerUrl;
  }

  public getActiveCustomerUrl(): string {
    return this.computeActiveCustomerUrl();
  }

  public async getPublicConfig(): Promise<PublicRuntimeConfig> {
    const baseUrl = this.computeActiveCustomerUrl();
    const merchant = MerchantRepository.getPrimaryMerchant();
    const identity = merchant ? MerchantRepository.getInstallationIdentity() : null;
    const merchantId = identity?.merchant_id || null;
    const customerUrl = merchantId && process.env.AUTOPRINT_CLOUD_URL
      ? `${baseUrl}/store/${encodeURIComponent(merchantId)}`
      : baseUrl;
    let qrCodeDataUrl: string | null = null;
    try {
      qrCodeDataUrl = await QrCodeService.generateDataUrl(customerUrl);
    } catch {
      // ignore QR generation failure
    }

    return {
      service: 'AutoPrint Print Management System',
      version: CONFIG.APP_VERSION,
      customerUrl,
      merchantId,
      qrCodeUrl: `${CONFIG.API_PREFIX}/config/qr-code`,
      qrCodeDataUrl,
      ports: {
        backend: CONFIG.PORT,
        merchant: CONFIG.MERCHANT_PORT,
        customer: CONFIG.CUSTOMER_PORT,
      },
    };
  }
}

export const localAccessService = new LocalAccessService();
