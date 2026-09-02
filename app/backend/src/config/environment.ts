import dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import fs from 'fs';

dotenv.config();

// ─── Data Directory Resolution ───────────────────────────────────────────────
// Prioritize AUTOPRINT_DATA_DIR, then local datastore in project root, then C:\AutoPrint\Data
function resolveDataDir(): string {
  if (process.env.AUTOPRINT_DATA_DIR) {
    return path.resolve(process.env.AUTOPRINT_DATA_DIR);
  }
  const localDatastore = path.resolve(process.cwd(), 'datastore');
  if (fs.existsSync(localDatastore)) {
    return localDatastore;
  }
  const projectDatastore = path.resolve(__dirname, '../../../../datastore');
  if (fs.existsSync(projectDatastore)) {
    return projectDatastore;
  }
  if (process.platform === 'win32') {
    return 'C:\\AutoPrint\\Data';
  }
  return path.join(os.homedir(), 'AutoPrint', 'Data');
}

const DATA_DIR = resolveDataDir();
const RUNTIME_DIR = path.join(path.dirname(DATA_DIR), 'runtime');

// ─── Sub-directory paths ──────────────────────────────────────────────────────
export const PATHS = {
  DATA_DIR,
  RUNTIME_DIR,
  DB_DIR:        path.join(DATA_DIR, 'backend', 'database'),
  DB_FILE:       path.join(DATA_DIR, 'backend', 'database', 'autoprint.db'),
  UPLOADS_DIR:   path.join(DATA_DIR, 'customer', 'uploads'),
  PROCESSED_DIR: path.join(DATA_DIR, 'customer', 'documents'),
  JOBS_DIR:      path.join(DATA_DIR, 'merchant', 'jobs'),
  LOGS_DIR:      path.join(DATA_DIR, 'backend', 'logs'),
  AUDIT_DIR:     path.join(DATA_DIR, 'backend', 'audit'),
  BACKUP_DIR:    path.join(DATA_DIR, 'backups'),
  TEMP_DIR:      path.join(DATA_DIR, 'temp'),
  CONFIG_DIR:    path.join(DATA_DIR, 'config'),
  PAYMENTS_DIR:  path.join(DATA_DIR, 'payments'),
  VERIFY_DIR:    path.join(DATA_DIR, 'verification'),
  CACHE_DIR:     path.join(DATA_DIR, 'cache'),
};

// Ensure required data directories exist
export function ensureDataDirectories(): void {
  const dirs = [
    PATHS.DATA_DIR,
    PATHS.DB_DIR,
    PATHS.UPLOADS_DIR,
    PATHS.PROCESSED_DIR,
    PATHS.JOBS_DIR,
    PATHS.LOGS_DIR,
    PATHS.AUDIT_DIR,
    PATHS.BACKUP_DIR,
    PATHS.TEMP_DIR,
    PATHS.CONFIG_DIR,
    PATHS.PAYMENTS_DIR,
    PATHS.VERIFY_DIR,
    PATHS.CACHE_DIR,
  ];
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

// ─── HMAC Secret Validation ───────────────────────────────────────────────────
const DEFAULT_DEV_SECRET = 'DEV_ONLY_NOT_FOR_PRODUCTION_PLEASE_SET_HMAC_SECRET_2026';
const rawSecret = process.env.HMAC_SECRET || process.env.SECURITY_SALT || '';

function resolveHmacSecret(): string {
  if (rawSecret && rawSecret.length >= 32) {
    return rawSecret;
  }
  if (process.env.NODE_ENV === 'production') {
    console.error(
      '[FATAL] HMAC_SECRET is missing or too short (< 32 chars). ' +
      'Set a strong HMAC_SECRET environment variable before running in production.'
    );
    process.exit(1);
  }
  // Development only fallback
  return DEFAULT_DEV_SECRET;
}

// ─── CORS Origin Resolution ───────────────────────────────────────────────────
function resolveCorsOrigins(): string[] {
  const raw = process.env.CORS_ORIGIN || 'http://localhost:5000,http://localhost:6000,http://localhost:7000,http://localhost:3000,http://localhost:3001,http://localhost:8085';
  return raw.split(',').map((o) => o.trim()).filter(Boolean);
}

// ─── Exported Config ──────────────────────────────────────────────────────────
export const CONFIG = {
  PORT:                 Number(process.env.PORT || 5000),
  MERCHANT_PORT:        Number(process.env.MERCHANT_PORT || 8000),
  CUSTOMER_PORT:        Number(process.env.CUSTOMER_PORT || 7000),
  NODE_ENV:             process.env.NODE_ENV || 'development',
  API_PREFIX:           process.env.API_PREFIX || '/api',
  MAX_DIGITAL_ATTEMPTS: Number(process.env.MAX_DIGITAL_ATTEMPTS || 3),
  HMAC_SECRET:          resolveHmacSecret(),
  CORS_ORIGINS:         resolveCorsOrigins(),
  CURRENCY:             process.env.CURRENCY || 'INR',
  MAX_FILE_SIZE_MB:     Number(process.env.MAX_FILE_SIZE_MB || 50),
  APP_VERSION:          '2.0.0',
  PATHS,
} as const;