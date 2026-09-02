import multer from 'multer';
import { CONFIG } from '../config/environment';
import { AppError } from '../types';

// Allowed MIME types for printing
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain',
  'application/octet-stream', // Fallback for binary uploads
]);

// Memory storage for immediate processing into Watermark & StorageService
const storage = multer.memoryStorage();

export const upload = multer({
  storage,
  limits: {
    fileSize: CONFIG.MAX_FILE_SIZE_MB * 1024 * 1024, // Configurable max bytes
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME_TYPES.has(file.mimetype) || file.originalname.endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new AppError(`Unsupported file format (${file.mimetype}). Please upload a PDF, DOCX, TXT, or Image file.`, 400));
    }
  },
});
