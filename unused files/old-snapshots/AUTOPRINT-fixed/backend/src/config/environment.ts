import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

// Attempt to read production appsettings.json if present
let appSettings: any = {};
const configPath = 'C:\\AutoPrint\\Config\\appsettings.json';
try {
  if (fs.existsSync(configPath)) {
    appSettings = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch {
  // Fallback gracefully
}

export const CONFIG = {
  PORT: Number(process.env.PORT || appSettings.ServerPort || 9000),
  MERCHANT_PORT: Number(process.env.MERCHANT_PORT || appSettings.MerchantDesktopPort || 5000),
  CUSTOMER_PORT: Number(process.env.CUSTOMER_PORT || appSettings.CustomerWebPort || 8085),
  NODE_ENV: process.env.NODE_ENV || 'production',
  API_PREFIX: process.env.API_PREFIX || '/api',
  MAX_DIGITAL_ATTEMPTS: Number(process.env.MAX_DIGITAL_ATTEMPTS || appSettings.MaxDigitalAttempts || 3),
  SECURITY_SALT: process.env.SECURITY_SALT || 'AP_VERIFY_HMAC_SECURE_2026',
  CORS_ORIGIN: process.env.CORS_ORIGIN || '*',
};
