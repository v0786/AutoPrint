/**
 * AutoPrint SystemGuard — Baseline Snapshot & Manifest Manager
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import os from 'os';
import { BaselineManifest, FileIntegrityRecord } from '../types';
import { GUARD_PATHS, GUARD_CONFIG } from '../config';
import { logger } from '../reporting/structuredLogger';

export class BaselineManager {
  private baselineDir: string;
  private manifestPath: string;

  constructor(customBaselineDir?: string) {
    this.baselineDir = customBaselineDir || GUARD_PATHS.BASELINES_DIR;
    this.manifestPath = path.join(this.baselineDir, 'manifest.json');
  }

  public getManifestPath(): string {
    return this.manifestPath;
  }

  public computeSha256(filePath: string): string {
    const buffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  public hasBaseline(): boolean {
    return fs.existsSync(this.manifestPath);
  }

  public loadBaseline(): BaselineManifest | null {
    if (!this.hasBaseline()) return null;
    try {
      const content = fs.readFileSync(this.manifestPath, 'utf8');
      return JSON.parse(content) as BaselineManifest;
    } catch (err: any) {
      logger.error('Failed to load baseline manifest', { error: err.message });
      return null;
    }
  }

  public createSnapshot(version = GUARD_CONFIG.VERSION): BaselineManifest {
    if (!fs.existsSync(this.baselineDir)) {
      fs.mkdirSync(this.baselineDir, { recursive: true });
    }

    const filesStoreDir = path.join(this.baselineDir, 'files');
    if (!fs.existsSync(filesStoreDir)) {
      fs.mkdirSync(filesStoreDir, { recursive: true });
    }

    const filesManifest: Record<string, FileIntegrityRecord> = {};
    const criticalTargets: string[] = [...GUARD_CONFIG.SERVICES.map((s) => s.cwd)];

    // Collect all critical files
    const allFiles = this.collectFiles(GUARD_PATHS.CRITICAL_SCAN_DIRS, GUARD_PATHS.CRITICAL_CONFIG_FILES);

    for (const absPath of allFiles) {
      if (!fs.existsSync(absPath)) continue;
      const relPath = path.relative(GUARD_PATHS.WORKSPACE_ROOT, absPath).replace(/\\/g, '/');

      try {
        const stats = fs.statSync(absPath);
        if (stats.isDirectory()) continue;

        const hash = this.computeSha256(absPath);
        const record: FileIntegrityRecord = {
          relativePath: relPath,
          absolutePath: absPath,
          sha256: hash,
          sizeBytes: stats.size,
          lastModifiedMs: stats.mtimeMs,
        };

        filesManifest[relPath] = record;

        // Save a clean backup copy keyed by hash inside baseline storage
        const backupCopyPath = path.join(filesStoreDir, `${hash}.bak`);
        if (!fs.existsSync(backupCopyPath)) {
          fs.copyFileSync(absPath, backupCopyPath);
        }
      } catch (err: any) {
        logger.warn(`Failed to snapshot file ${absPath}: ${err.message}`);
      }
    }

    const manifest: BaselineManifest = {
      version,
      createdAt: new Date().toISOString(),
      totalFiles: Object.keys(filesManifest).length,
      systemMetadata: {
        platform: os.platform(),
        nodeVersion: process.version,
        osRelease: os.release(),
        arch: os.arch(),
      },
      files: filesManifest,
    };

    fs.writeFileSync(this.manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    logger.info(`Clean system baseline snapshot created (${manifest.totalFiles} files registered)`, {
      manifestPath: this.manifestPath,
      version,
    });

    return manifest;
  }

  public getBackupFilePath(hash: string): string | null {
    const backupPath = path.join(this.baselineDir, 'files', `${hash}.bak`);
    return fs.existsSync(backupPath) ? backupPath : null;
  }

  private collectFiles(scanDirs: string[], explicitFiles: string[]): string[] {
    const collected = new Set<string>();

    for (const f of explicitFiles) {
      if (fs.existsSync(f)) collected.add(f);
    }

    for (const dir of scanDirs) {
      if (!fs.existsSync(dir)) continue;
      this.walkDir(dir, collected);
    }

    return Array.from(collected);
  }

  private walkDir(dir: string, fileSet: Set<string>): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        const isExcluded = GUARD_CONFIG.SCANNER.EXCLUDE_PATTERNS.some((p) => full.includes(p));
        if (isExcluded) continue;

        if (entry.isDirectory()) {
          this.walkDir(full, fileSet);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (GUARD_CONFIG.SCANNER.ALLOWED_EXTENSIONS.includes(ext)) {
            fileSet.add(full);
          }
        }
      }
    } catch {}
  }
}
