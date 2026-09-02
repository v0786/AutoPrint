import fs from 'fs';
import path from 'path';
import { CollectionVerificationRecord, PrintJobResponse, MerchantPaymentConfig } from '../types';

const DATA_DIR = process.platform === 'win32' ? 'C:\\AutoPrint\\Data\\Database' : path.resolve(process.cwd(), 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'merchant_payment_config.json');

/**
 * Production Database Engine
 * Manages Jobs, Verification Records, and Merchant Payment Configurations.
 */
class ProductionDatabase {
  public jobs: Map<string, PrintJobResponse> = new Map();
  public verificationRecords: Map<string, CollectionVerificationRecord> = new Map();
  public merchantPaymentConfig: MerchantPaymentConfig = {
    shopId: 'STATION-01',
    paymentMethod: 'BOTH',
    upiId: 'autoprint@upi',
    qrImageUrl: '',
    shopName: 'AutoPrint Express • Counter 1',
    updatedAt: new Date().toISOString(),
  };

  constructor() {
    this.ensureDataDir();
    this.loadMerchantConfig();
  }

  private ensureDataDir(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
    } catch {
      // Fallback gracefully
    }
  }

  private loadMerchantConfig(): void {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
        this.merchantPaymentConfig = { ...this.merchantPaymentConfig, ...JSON.parse(raw) };
      }
    } catch {
      // Use defaults
    }
  }

  public saveMerchantConfig(config: Partial<MerchantPaymentConfig>): MerchantPaymentConfig {
    this.merchantPaymentConfig = {
      ...this.merchantPaymentConfig,
      ...config,
      updatedAt: new Date().toISOString(),
    };
    try {
      this.ensureDataDir();
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.merchantPaymentConfig, null, 2), 'utf8');
    } catch {
      // Ignore disk errors
    }
    return this.merchantPaymentConfig;
  }

  public clear(): void {
    this.jobs.clear();
    this.verificationRecords.clear();
  }
}

export const db = new ProductionDatabase();

