/**
 * AutoPrint SystemGuard — Configuration & Operational Thresholds
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

function findWorkspaceRoot(): string {
  let curr = __dirname;
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(curr, 'app', 'backend')) && fs.existsSync(path.join(curr, 'package.json'))) {
      return curr;
    }
    const parent = path.dirname(curr);
    if (parent === curr) break;
    curr = parent;
  }
  return path.resolve(__dirname, '../../..');
}

// Resolve workspace root
export const WORKSPACE_ROOT = findWorkspaceRoot();

export const GUARD_PATHS = {
  WORKSPACE_ROOT,
  BACKEND_ROOT: path.join(WORKSPACE_ROOT, 'app', 'backend'),
  CUSTOMER_ROOT: path.join(WORKSPACE_ROOT, 'app', 'customer-web'),
  MERCHANT_ROOT: path.join(WORKSPACE_ROOT, 'app', 'merchant-desktop'),
  DATASTORE_ROOT: process.env.AUTOPRINT_DATASTORE || path.join(WORKSPACE_ROOT, 'datastore'),
  BASELINES_DIR: path.join(process.env.AUTOPRINT_DATASTORE || path.join(WORKSPACE_ROOT, 'datastore'), 'guard', 'baselines'),
  LOGS_DIR: path.join(WORKSPACE_ROOT, 'logs', 'guard'),
  INCIDENTS_DIR: path.join(WORKSPACE_ROOT, 'logs', 'incidents'),
  CRITICAL_SCAN_DIRS: [
    path.join(WORKSPACE_ROOT, 'app', 'backend', 'src'),
    path.join(WORKSPACE_ROOT, 'config'),
    path.join(WORKSPACE_ROOT, 'scripts'),
  ],
  CRITICAL_CONFIG_FILES: [
    path.join(WORKSPACE_ROOT, 'package.json'),
    path.join(WORKSPACE_ROOT, 'app', 'backend', 'package.json'),
    path.join(WORKSPACE_ROOT, 'app', 'backend', 'tsconfig.json'),
    path.join(WORKSPACE_ROOT, 'app', 'backend', 'src', 'server.ts'),
    path.join(WORKSPACE_ROOT, 'app', 'backend', 'src', 'config', 'environment.ts'),
  ],
};

export const GUARD_CONFIG = {
  VERSION: '1.0.0',
  SERVICES: [
    {
      name: 'AutoPrint Backend API',
      port: 5000,
      url: 'http://127.0.0.1:5000/health',
      startCommand: 'node dist/server.js',
      cwd: GUARD_PATHS.BACKEND_ROOT,
    },
    {
      name: 'Customer Web Kiosk',
      port: 7000,
      url: 'http://127.0.0.1:7000',
      startCommand: 'node server.js',
      cwd: GUARD_PATHS.CUSTOMER_ROOT,
    },
    {
      name: 'Merchant Desktop POS',
      port: 8000,
      url: 'http://127.0.0.1:8000',
      startCommand: 'node server.js',
      cwd: GUARD_PATHS.MERCHANT_ROOT,
    },
  ],
  THRESHOLDS: {
    MAX_MEMORY_MB: 1024 * 3, // 3 GB application warning threshold
    MEMORY_LEAK_GROWTH_RATE_PERCENT: 15, // >15% steady increase across 5 samples flags leak
    HIGH_CPU_PERCENT: 85,
    MIN_DISK_FREE_MB: 500, // <500 MB triggers disk pressure alert
    SERVICE_TIMEOUT_MS: 3000, // 3s response timeout for HTTP health check
    MAX_RESTART_ATTEMPTS: 5, // Maximum consecutive restarts before incident escalation
    INITIAL_BACKOFF_MS: 1000, // 1 second
    MAX_BACKOFF_MS: 32000, // 32 seconds
    BACKOFF_MULTIPLIER: 2,
    JITTER_PERCENT: 20, // 20% randomized jitter
  },
  LOGGING: {
    MAX_LOG_FILE_BYTES: 10 * 1024 * 1024, // 10 MB per file
    MAX_ROTATED_FILES: 5,
    CONSOLE_OUTPUT: true,
  },
  SCANNER: {
    ALLOWED_EXTENSIONS: ['.ts', '.js', '.json', '.cjs', '.mjs', '.ps1', '.cmd', '.bat'],
    EXCLUDE_PATTERNS: ['node_modules', 'dist', '.git', 'coverage', '.cache', 'temp', 'uploads'],
  },
};
