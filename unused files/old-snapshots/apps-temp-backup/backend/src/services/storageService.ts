import fs from 'fs';
import path from 'path';
import { PATHS, CONFIG } from '../config/environment';
import { generateStorageFilename, generateProcessedFilename } from '../utils/crypto';
import { AppError } from '../types';

export class StorageService {
  /**
   * Saves an uploaded buffer/file to the uploads storage directory.
   */
  public static saveUploadedFile(
    jobId: string,
    buffer: Buffer,
    originalName: string
  ): { relativePath: string; absolutePath: string; fileName: string; sizeBytes: number } {
    const safeName = generateStorageFilename(jobId, originalName);
    const absolutePath = path.join(PATHS.UPLOADS_DIR, safeName);

    fs.writeFileSync(absolutePath, buffer);

    return {
      relativePath: path.join('Uploads', safeName),
      absolutePath,
      fileName: safeName,
      sizeBytes: buffer.length,
    };
  }

  /**
   * Saves a processed (e.g. watermarked) PDF buffer to the processed storage directory.
   */
  public static saveProcessedFile(
    jobId: string,
    buffer: Buffer,
    ext = 'pdf'
  ): { relativePath: string; absolutePath: string; fileName: string; sizeBytes: number } {
    const safeName = generateProcessedFilename(jobId, ext);
    const absolutePath = path.join(PATHS.PROCESSED_DIR, safeName);

    fs.writeFileSync(absolutePath, buffer);

    return {
      relativePath: path.join('Processed', safeName),
      absolutePath,
      fileName: safeName,
      sizeBytes: buffer.length,
    };
  }

  /**
   * Reads a file buffer from absolute path with defensive path validation.
   */
  public static readFile(absolutePath: string): Buffer {
    // Prevent traversal outside DATA_DIR
    const resolved = path.resolve(absolutePath);
    if (!resolved.startsWith(path.resolve(PATHS.DATA_DIR))) {
      throw new AppError('Access to unauthorized filesystem path is denied.', 403);
    }

    if (!fs.existsSync(resolved)) {
      throw new AppError('Requested file not found in storage.', 404);
    }

    return fs.readFileSync(resolved);
  }

  /**
   * Checks if a file exists safely.
   */
  public static fileExists(absolutePath: string): boolean {
    try {
      const resolved = path.resolve(absolutePath);
      if (!resolved.startsWith(path.resolve(PATHS.DATA_DIR))) {
        return false;
      }
      return fs.existsSync(resolved);
    } catch {
      return false;
    }
  }

  /**
   * Removes a file if needed.
   */
  public static deleteFile(absolutePath: string): void {
    try {
      const resolved = path.resolve(absolutePath);
      if (resolved.startsWith(path.resolve(PATHS.DATA_DIR)) && fs.existsSync(resolved)) {
        fs.unlinkSync(resolved);
      }
    } catch (err) {
      console.warn(`[STORAGE] Failed to delete file ${absolutePath}:`, err);
    }
  }
}
