import dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import fs from 'fs';

dotenv.config();

// ─── AppSettings JSON Loader ───────────────────────────────────────────────────
export interface AppSettings {
  installationId?: string;
  backendPort?: number;
  customerWebPort?: number;
  merchantDesktopPort?: number;
  apiBaseUrl?: string;
  updatedAt?: string;
  ports?: {
    backend?: number;
    merchant?: number;
    customer?: number;
  };
  paths?: {
    dataDirectory?: string;
    logsDirectory?: string;
  };
  database?: {
    path?: string;
  };
  pagekite?: {
    enabled?: boolean;
    subdomain?: string;
    domain?: string;
    secret?: string;
  };
}

export function loadAppSettings(): AppSettings {
  const possiblePaths = [
    process.env.AUTOPRINT_CONFIG_FILE,
    process.env.AUTOPRINT_CONFIG_PATH,
    'C:\\ProgramData\\AutoPrint\\config\\appsettings.json',
    path.resolve(process.cwd(), 'config', 'appsettings.json'),
    path.resolve(__dirname, '../../../../config/appsettings.json'),
  ].filter(Boolean) as string[];

  for (const configPath of possiblePaths) {
    if (fs.existsSync(configPath)) {
      try {
        const raw = fs.readFileSync(configPath, 'utf8').replace(/^\uFEFF/, '');
        return JSON.parse(raw);
      } catch (err) {
        console.warn(`[CONFIG] Failed to parse ${configPath}:`, err);
      }
    }
  }
  return {};
}

export const appSettings = loadAppSettings();

// ─── Data Directory Resolution ───────────────────────────────────────────────
function resolveDataDir(): string {
  if (process.env.AUTOPRINT_DATA_DIR) {
    return path.resolve(process.env.AUTOPRINT_DATA_DIR);
  }
  if (appSettings.paths?.dataDirectory) {
    return path.resolve(appSettings.paths.dataDirectory);
  }

  // Windows ProgramData priority for production
  if (process.platform === 'win32') {
    const programData = process.env.ProgramData || 'C:\\ProgramData';
    return path.join(programData, 'AutoPrint', 'datastore');
  }

  const localDatastore = path.resolve(process.cwd(), 'datastore');
  if (fs.existsSync(localDatastore)) {
    return localDatastore;
  }
  const projectDatastore = path.resolve(__dirname, '../../../../datastore');
  if (fs.existsSync(projectDatastore)) {
    return projectDatastore;
  }

  return path.join(os.homedir(), 'AutoPrint', 'Data');
}

const DATA_DIR = resolveDataDir();
const RUNTIME_DIR = path.join(path.dirname(DATA_DIR), 'runtime');

// ─── Sub-directory paths ──────────────────────────────────────────────────────
const resolvedDbFile = process.env.AUTOPRINT_DB_PATH
  ? path.resolve(process.env.AUTOPRINT_DB_PATH)
  : appSettings.database?.path
  ? path.resolve(appSettings.database.path)
  : path.join(DATA_DIR, 'backend', 'database', 'autoprint.db');

export const PATHS = {
  DATA_DIR,
  RUNTIME_DIR,
  DB_DIR:        path.dirname(resolvedDbFile),
  DB_FILE:       resolvedDbFile,
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
  return DEFAULT_DEV_SECRET;
}

// ─── CORS Origin Resolution ───────────────────────────────────────────────────
const RESOLVED_PORT = Number(process.env.PORT || appSettings.backendPort || appSettings.ports?.backend || 5000);
const RESOLVED_MERCHANT_PORT = Number(process.env.MERCHANT_PORT || appSettings.merchantDesktopPort || appSettings.ports?.merchant || 8000);
const RESOLVED_CUSTOMER_PORT = Number(process.env.CUSTOMER_PORT || appSettings.customerWebPort || appSettings.ports?.customer || 7000);

function resolveCorsOrigins(): string[] {
  const dynamicOrigins = [
    `http://localhost:${RESOLVED_PORT}`,
    `http://127.0.0.1:${RESOLVED_PORT}`,
    `http://localhost:${RESOLVED_MERCHANT_PORT}`,
    `http://127.0.0.1:${RESOLVED_MERCHANT_PORT}`,
    `http://localhost:${RESOLVED_CUSTOMER_PORT}`,
    `http://127.0.0.1:${RESOLVED_CUSTOMER_PORT}`,
  ];
  const raw = process.env.CORS_ORIGIN || 'http://localhost:5000,http://localhost:6000,http://localhost:7000,http://localhost:8000,http://localhost:3000,http://localhost:3001,http://localhost:8085';
  const parsed = raw.split(',').map((o) => o.trim()).filter(Boolean);
  return Array.from(new Set([...parsed, ...dynamicOrigins]));
}

// ─── Exported Config ──────────────────────────────────────────────────────────
export const CONFIG = {
  PORT:                 RESOLVED_PORT,
  MERCHANT_PORT:        RESOLVED_MERCHANT_PORT,
  CUSTOMER_PORT:        RESOLVED_CUSTOMER_PORT,
  API_BASE_URL:         appSettings.apiBaseUrl || `http://127.0.0.1:${RESOLVED_PORT}`,
  NODE_ENV:             process.env.NODE_ENV || 'development',
  API_PREFIX:           process.env.API_PREFIX || '/api',
  MAX_DIGITAL_ATTEMPTS: Number(process.env.MAX_DIGITAL_ATTEMPTS || 3),
  HMAC_SECRET:          resolveHmacSecret(),
  CORS_ORIGINS:         resolveCorsOrigins(),
  CURRENCY:             process.env.CURRENCY || 'INR',
  MAX_FILE_SIZE_MB:     Number(process.env.MAX_FILE_SIZE_MB || 50),
  APP_VERSION:          '2.0.0',
  PATHS,
  PAGEKITE: {
    enabled:   process.env.PAGEKITE_ENABLED === 'true' || appSettings.pagekite?.enabled || false,
    subdomain: process.env.PAGEKITE_NAME || appSettings.pagekite?.subdomain || 'autoprint',
    domain:    appSettings.pagekite?.domain || 'pagekite.me',
    secret:    process.env.PAGEKITE_SECRET || appSettings.pagekite?.secret || '',
  },
} as const;