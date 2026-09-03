/**
 * Tunnel & Dynamic Ingress Management Service
 * Coordinates PageKite reverse proxy and computes dynamic customer access URLs.
 */

import os from 'os';
import { CONFIG } from '../config/environment';
import { PageKiteConnector, TunnelState } from '../connectors/pagekiteConnector';
import { QrCodeService } from './qrCodeService';

export interface PublicRuntimeConfig {
  service: string;
  version: string;
  customerUrl: string;
  qrCodeUrl: string;
  qrCodeDataUrl: string | null;
  pagekite: TunnelState;
  ports: {
    backend: number;
    merchant: number;
    customer: number;
  };
}

class TunnelManagementService {
  private connector: PageKiteConnector;
  private currentCustomerUrl: string = '';

  constructor() {
    const pagekiteEnabled = process.env.PAGEKITE_ENABLED === 'true';
    const subdomain = process.env.PAGEKITE_NAME || process.env.PAGEKITE_SUBDOMAIN || 'autoprint';
    const domain = process.env.PAGEKITE_DOMAIN || 'pagekite.me';
    const secret = process.env.PAGEKITE_SECRET || '';
    const localPort = CONFIG.CUSTOMER_PORT || 7000;
    const executablePath = process.env.PAGEKITE_BINARY_PATH || undefined;

    this.connector = new PageKiteConnector({
      enabled: pagekiteEnabled,
      subdomain,
      domain,
      secret,
      localPort,
      executablePath,
    });

    this.computeActiveCustomerUrl();
    // PageKite tunnel is manual only (offline by default, started via Start-Customer-Tunnel.cmd).
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
    const state = this.connector.getState();
    if (state.status === 'CONNECTED' && state.publicUrl) {
      this.currentCustomerUrl = state.publicUrl;
    } else if (process.env.CUSTOMER_PUBLIC_URL) {
      this.currentCustomerUrl = process.env.CUSTOMER_PUBLIC_URL;
    } else {
      const lanIp = this.getLocalIpAddress();
      this.currentCustomerUrl = `http://${lanIp}:${CONFIG.CUSTOMER_PORT}`;
    }
    return this.currentCustomerUrl;
  }

  public getActiveCustomerUrl(): string {
    return this.computeActiveCustomerUrl();
  }

  public getTunnelState(): TunnelState {
    return this.connector.getState();
  }

  public updateTunnelConfig(subdomain: string, enabled: boolean, secret?: string): TunnelState {
    const updated = this.connector.updateConfig({
      subdomain,
      enabled,
      secret: secret || undefined,
      localPort: CONFIG.CUSTOMER_PORT,
    });
    this.computeActiveCustomerUrl();
    return updated;
  }

  public async getPublicConfig(): Promise<PublicRuntimeConfig> {
    const customerUrl = this.computeActiveCustomerUrl();
    let qrCodeDataUrl: string | null = null;
    try {
      qrCodeDataUrl = await QrCodeService.generateDataUrl(customerUrl);
    } catch {
      // ignore
    }

    return {
      service: 'AutoPrint Print Management System',
      version: CONFIG.APP_VERSION,
      customerUrl,
      qrCodeUrl: `${CONFIG.API_PREFIX}/config/qr-code`,
      qrCodeDataUrl,
      pagekite: this.connector.getState(),
      ports: {
        backend: CONFIG.PORT,
        merchant: CONFIG.MERCHANT_PORT,
        customer: CONFIG.CUSTOMER_PORT,
      },
    };
  }
}

export const tunnelService = new TunnelManagementService();
