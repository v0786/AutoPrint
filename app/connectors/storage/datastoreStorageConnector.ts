/**
 * Datastore & Local Storage Connector
 * Manages filesystem operations with defensive boundary validation.
 */

import fs from 'fs';
import path from 'path';

export class DatastoreStorageConnector {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = path.resolve(baseDir);
    this.ensureDirectory(this.baseDir);
  }

  public ensureDirectory(dirPath: string): void {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  }

  public saveFile(subDir: string, fileName: string, buffer: Buffer): string {
    const targetDir = path.join(this.baseDir, subDir);
    this.ensureDirectory(targetDir);

    const safeFileName = path.basename(fileName);
    const targetPath = path.join(targetDir, safeFileName);

    // Defensive check: ensure target does not escape baseDir
    if (!path.resolve(targetPath).startsWith(this.baseDir)) {
      throw new Error('Unauthorized filesystem path access attempt.');
    }

    fs.writeFileSync(targetPath, buffer);
    return targetPath;
  }

  public readFile(filePath: string): Buffer {
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(this.baseDir)) {
      throw new Error('Access outside datastore boundary is restricted.');
    }
    if (!fs.existsSync(resolved)) {
      throw new Error(`File not found: ${filePath}`);
    }
    return fs.readFileSync(resolved);
  }

  public fileExists(filePath: string): boolean {
    const resolved = path.resolve(filePath);
    return resolved.startsWith(this.baseDir) && fs.existsSync(resolved);
  }
}
