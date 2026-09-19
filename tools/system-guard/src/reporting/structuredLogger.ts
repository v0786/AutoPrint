/**
 * AutoPrint SystemGuard — Structured Hierarchical Logger with Automatic Rotation
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { LogLevel } from '../types';
import { GUARD_PATHS, GUARD_CONFIG } from '../config';

const SENSITIVE_PATTERNS = [
  /password["']?\s*[:=]\s*["']?([^"',\s]+)/gi,
  /secret["']?\s*[:=]\s*["']?([^"',\s]+)/gi,
  /token["']?\s*[:=]\s*["']?([^"',\s]+)/gi,
  /authorization["']?\s*[:=]\s*["']?Bearer\s+([^"',\s]+)/gi,
  /razorpay_key_secret["']?\s*[:=]\s*["']?([^"',\s]+)/gi,
  /pagekite[_-]?secret["']?\s*[:=]\s*["']?([^"',\s]+)/gi,
];

export class StructuredLogger {
  private logFilePath: string;

  constructor(filename = 'guard.log') {
    if (!fs.existsSync(GUARD_PATHS.LOGS_DIR)) {
      fs.mkdirSync(GUARD_PATHS.LOGS_DIR, { recursive: true });
    }
    this.logFilePath = path.join(GUARD_PATHS.LOGS_DIR, filename);
  }

  public redact(text: string): string {
    let sanitized = text;
    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, (match, secret) => {
        if (secret && secret.length > 4) {
          const masked = secret.substring(0, 2) + '*'.repeat(secret.length - 4) + secret.slice(-2);
          return match.replace(secret, masked);
        }
        return match.replace(secret, '********');
      });
    }
    return sanitized;
  }

  private rotateIfNeeded(): void {
    try {
      if (!fs.existsSync(this.logFilePath)) return;
      const stats = fs.statSync(this.logFilePath);
      if (stats.size < GUARD_CONFIG.LOGGING.MAX_LOG_FILE_BYTES) return;

      // Rotate: shift log.5 -> deleted, log.4 -> log.5, etc.
      const max = GUARD_CONFIG.LOGGING.MAX_ROTATED_FILES;
      for (let i = max - 1; i >= 1; i--) {
        const current = `${this.logFilePath}.${i}`;
        const next = `${this.logFilePath}.${i + 1}`;
        if (fs.existsSync(current)) {
          if (i === max - 1 && fs.existsSync(next)) {
            fs.unlinkSync(next);
          }
          fs.renameSync(current, next);
        }
      }
      fs.renameSync(this.logFilePath, `${this.logFilePath}.1`);
    } catch (err) {
      // Rotation error must not crash the logger
    }
  }

  public log(level: LogLevel, message: string, context?: Record<string, any>): void {
    const timestamp = new Date().toISOString();
    const cleanMsg = this.redact(message);
    const sanitizedContext = context ? JSON.parse(this.redact(JSON.stringify(context))) : undefined;

    const entry = {
      timestamp,
      level,
      message: cleanMsg,
      pid: process.pid,
      hostname: os.hostname(),
      platform: os.platform(),
      context: sanitizedContext,
    };

    const line = JSON.stringify(entry);

    this.rotateIfNeeded();
    try {
      fs.appendFileSync(this.logFilePath, line + '\n', 'utf8');
    } catch {}

    if (GUARD_CONFIG.LOGGING.CONSOLE_OUTPUT) {
      const color =
        level === 'CRITICAL'
          ? '\x1b[41m\x1b[37m[CRITICAL]\x1b[0m'
          : level === 'ERROR'
          ? '\x1b[31m[ERROR]\x1b[0m'
          : level === 'WARNING'
          ? '\x1b[33m[WARN]\x1b[0m'
          : level === 'INFO'
          ? '\x1b[32m[INFO]\x1b[0m'
          : '\x1b[36m[DEBUG]\x1b[0m';

      const ctxStr = context ? ` ${JSON.stringify(sanitizedContext)}` : '';
      console.log(`[${timestamp}] ${color} ${cleanMsg}${ctxStr}`);
    }
  }

  public debug(msg: string, ctx?: Record<string, any>): void {
    this.log('DEBUG', msg, ctx);
  }

  public info(msg: string, ctx?: Record<string, any>): void {
    this.log('INFO', msg, ctx);
  }

  public warn(msg: string, ctx?: Record<string, any>): void {
    this.log('WARNING', msg, ctx);
  }

  public error(msg: string, ctx?: Record<string, any>): void {
    this.log('ERROR', msg, ctx);
  }

  public critical(msg: string, ctx?: Record<string, any>): void {
    this.log('CRITICAL', msg, ctx);
  }

  public getRecentLogs(maxLines = 50): string[] {
    if (!fs.existsSync(this.logFilePath)) return [];
    try {
      const content = fs.readFileSync(this.logFilePath, 'utf8');
      const lines = content.split('\n').filter((l) => l.trim().length > 0);
      return lines.slice(-maxLines);
    } catch {
      return [];
    }
  }
}

export const logger = new StructuredLogger();
