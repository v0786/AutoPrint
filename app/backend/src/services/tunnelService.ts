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
    const pagekiteEnabled = CONFIG.PAGEKITE.enabled;
    const subdomain = CONFIG.PAGEKITE.subdomain;
    const domain = CONFIG.PAGEKITE.domain;
    const secret = CONFIG.PAGEKITE.secret;
    const localPort = CONFIG.CUSTOMER_PORT;
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
  }

  public startTunnel(): boolean {
    return this.connector.start();
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

  public async verifyPageKite(
    subdomain: string,
    secret: string,
    domain = 'pagekite.me'
  ): Promise<{ success: boolean; message: string; publicUrl: string; rawOutput?: string }> {
    return PageKiteConnector.verifyCredentials({
      subdomain,
      domain,
      secret,
      localPort: CONFIG.CUSTOMER_PORT || 7000,
      timeoutMs: 5000,
    });
  }

  public updateTunnelConfig(subdomain: string, enabled: boolean, secret?: string): TunnelState {
    const updated = this.connector.updateConfig({
      subdomain,
      enabled,
      secret: secret || undefined,
      localPort: CONFIG.CUSTOMER_PORT,
    });
    this.computeActiveCustomerUrl();

    // Persist configuration to appsettings.json if writable
    try {
      const fs = require('fs');
      const path = require('path');
      const possibleSettingsPaths = [
        'C:\\ProgramData\\AutoPrint\\config\\appsettings.json',
        path.resolve(process.cwd(), 'config/appsettings.json'),
      ];

      for (const p of possibleSettingsPaths) {
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf8');
          const json = JSON.parse(raw);
          json.pagekite = {
            ...(json.pagekite || {}),
            enabled,
            subdomain: subdomain.toLowerCase().trim(),
            domain: 'pagekite.me',
            ...(secret ? { secret: secret.trim() } : {}),
          };
          fs.writeFileSync(p, JSON.stringify(json, null, 2), 'utf8');
        }
      }
    } catch {
      // ignore persistence error
    }

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
