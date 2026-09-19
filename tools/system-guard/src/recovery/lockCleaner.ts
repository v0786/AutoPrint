/**
 * AutoPrint SystemGuard — Stale Lock Cleaner, Orphan Killer & Temp Cache Purger
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { RecoveryAction } from '../types';
import { GUARD_PATHS, GUARD_CONFIG } from '../config';
import { logger } from '../reporting/structuredLogger';

export class LockCleaner {
  public cleanStaleLocks(): RecoveryAction[] {
    const actions: RecoveryAction[] = [];
    const timestamp = new Date().toISOString();

    // 1. Check SQLite Lockfiles in Datastore
    const dbDir = path.join(GUARD_PATHS.DATASTORE_ROOT, 'backend', 'database');
    if (fs.existsSync(dbDir)) {
      try {
        const entries = fs.readdirSync(dbDir);
        for (const entry of entries) {
          if (entry.endsWith('.lock') || entry.endsWith('-lock')) {
            const fullLock = path.join(dbDir, entry);
            const stats = fs.statSync(fullLock);
            // If lock is older than 5 minutes, consider it dangling
            if (Date.now() - stats.mtimeMs > 300000) {
              fs.unlinkSync(fullLock);
              const act: RecoveryAction = {
                id: `LOCK-${Date.now()}`,
                timestamp,
                type: 'LOCK_CLEANED',
                target: fullLock,
                success: true,
                details: `Removed stale database lockfile: ${entry}`,
              };
              actions.push(act);
              logger.info(`Stale lock cleaned: ${entry}`);
            }
          }
        }
      } catch (err: any) {
        logger.warn(`Lock cleaner encountered error scanning ${dbDir}: ${err.message}`);
      }
    }

    // 2. Clear old temporary files in uploads older than 24 hours
    const tempUploads = path.join(GUARD_PATHS.DATASTORE_ROOT, 'customer', 'temp');
    if (fs.existsSync(tempUploads)) {
      try {
        const files = fs.readdirSync(tempUploads);
        let purgedCount = 0;
        for (const f of files) {
          const full = path.join(tempUploads, f);
          const stat = fs.statSync(full);
          if (Date.now() - stat.mtimeMs > 86400000) {
            fs.unlinkSync(full);
            purgedCount++;
          }
        }
        if (purgedCount > 0) {
          actions.push({
            id: `CACHE-${Date.now()}`,
            timestamp,
            type: 'CACHE_PURGED',
            target: tempUploads,
            success: true,
            details: `Purged ${purgedCount} expired temporary files from upload cache.`,
          });
          logger.info(`Purged ${purgedCount} expired temporary files from ${tempUploads}`);
        }
      } catch (err: any) {
        logger.warn(`Temp cache cleaner encountered error: ${err.message}`);
      }
    }

    return actions;
  }

  public findOrphanProcessesByPort(port: number): number[] {
    const pids: number[] = [];

    try {
      if (process.platform === 'win32') {
        const stdout = execSync(`netstat -ano | findstr :${port} | findstr LISTENING`, {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore'],
        });
        const lines = stdout.split('\n');
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pidStr = parts[parts.length - 1];
          const pid = parseInt(pidStr, 10);
          if (!isNaN(pid) && pid > 0 && pid !== process.pid && !pids.includes(pid)) {
            pids.push(pid);
          }
        }
      } else {
        const stdout = execSync(`lsof -i :${port} -t`, {
          encoding: 'utf8',
          stdio: ['pipe', 'pipe', 'ignore'],
        });
        const lines = stdout.split('\n');
        for (const line of lines) {
          const pid = parseInt(line.trim(), 10);
          if (!isNaN(pid) && pid > 0 && pid !== process.pid && !pids.includes(pid)) {
            pids.push(pid);
          }
        }
      }
    } catch {
      // Port not in use or command error
    }

    return pids;
  }

  public terminateOrphan(pid: number, reason: string): RecoveryAction {
    const actionId = `KILL-${Date.now()}-${pid}`;
    const timestamp = new Date().toISOString();

    try {
      if (process.platform === 'win32') {
        execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
      } else {
        process.kill(pid, 'SIGKILL');
      }

      logger.info(`Terminated orphaned zombie process PID ${pid}: ${reason}`);
      return {
        id: actionId,
        timestamp,
        type: 'ORPHAN_TERMINATED',
        target: `PID ${pid}`,
        success: true,
        details: `Killed orphan process (PID: ${pid}). Reason: ${reason}`,
      };
    } catch (err: any) {
      logger.error(`Failed to terminate orphan process PID ${pid}: ${err.message}`);
      return {
        id: actionId,
        timestamp,
        type: 'ORPHAN_TERMINATED',
        target: `PID ${pid}`,
        success: false,
        details: `Kill failure: ${err.message}`,
      };
    }
  }
}
