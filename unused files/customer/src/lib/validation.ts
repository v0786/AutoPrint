import type {
  CustomerInfo,
  PrintPreferences,
  UploadedFileItem,
} from '@/types';

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_REGEX = /^[+\d\s()-]{8,20}$/;
export const NAME_REGEX = /^[\p{L}\s'.-]{2,100}$/u;
export const PAGE_RANGE_REGEX = /^(\s*\d+\s*(-\s*\d+\s*)?)(,\s*\d+\s*(-\s*\d+\s*)?)*$/i;

export function isValidEmail(value: string): boolean {
  if (!value) return true;
  return EMAIL_REGEX.test(value.trim());
}

export function isValidPhone(value: string): boolean {
  if (!value) return false;
  return PHONE_REGEX.test(value.trim());
}

export function isValidName(value: string): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (trimmed.length < 2 || trimmed.length > 100) return false;
  return NAME_REGEX.test(trimmed);
}

export function sanitizePageRange(value: string): string {
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === 'all') return 'All';
  return trimmed.replace(/\s+/g, '');
}

export function isValidPageRange(value: string, maxPages: number = 9999): boolean {
  const cleaned = value.trim();
  if (!cleaned || cleaned.toLowerCase() === 'all') return true;

  if (!PAGE_RANGE_REGEX.test(cleaned)) return false;

  const parts = cleaned.split(',');
  for (const part of parts) {
    const [startStr, endStr] = part.trim().split('-');
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : start;

    if (isNaN(start) || isNaN(end)) return false;
    if (start < 1 || end < 1) return false;
    if (start > maxPages || end > maxPages) return false;
    if (endStr && start > end) return false;
  }

  return true;
}

export function validateCustomerInfo(info: Partial<CustomerInfo>): ValidationResult {
  const errors: Record<string, string> = {};

  if (!info.name || !isValidName(info.name)) {
    errors.name = 'Please enter a valid full name (2-100 characters)';
  }

  if (!info.phone || !isValidPhone(info.phone)) {
    errors.phone = 'Please enter a valid phone number';
  }

  if (info.email && !isValidEmail(info.email)) {
    errors.email = 'Please enter a valid email address';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validatePrintPreferences(
  prefs: Partial<PrintPreferences>
): ValidationResult {
  const errors: Record<string, string> = {};

  if (!prefs.colorMode) {
    errors.colorMode = 'Color mode is required';
  }

  if (!prefs.paperSize) {
    errors.paperSize = 'Paper size is required';
  }

  if (!prefs.sidedness) {
    errors.sidedness = 'Sidedness is required';
  }

  const copies = Number(prefs.copies);
  if (isNaN(copies) || copies < 1 || copies > 500) {
    errors.copies = 'Copies must be between 1 and 500';
  }

  if (prefs.pageRange && !isValidPageRange(prefs.pageRange)) {
    errors.pageRange = 'Invalid page range format. Use: All, 1-5, or 1,3,5';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function validateUploadedFiles(files: UploadedFileItem[]): ValidationResult {
  const errors: Record<string, string> = {};

  if (files.length === 0) {
    errors.files = 'Please upload at least one document to print';
  }

  const MAX_FILES = 5;
  if (files.length > MAX_FILES) {
    errors.files = `Maximum ${MAX_FILES} files allowed per order`;
  }

  const MAX_FILE_SIZE_BYTES = 100 * 1024 * 1024;
  files.forEach((file, idx) => {
    if (file.sizeBytes > MAX_FILE_SIZE_BYTES) {
      errors[`file-${idx}`] = `File "${file.name}" exceeds 100MB limit`;
    }
    if (file.pageCount < 1 || file.pageCount > 999) {
      errors[`file-${idx}-pages`] = `File "${file.name}" page count must be 1-999`;
    }
  });

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 10) {
    return digits.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  }
  return digits;
}

export function normalizePhone(value: string): string {
  return value.replace(/\D/g, '').slice(0, 15);
}
