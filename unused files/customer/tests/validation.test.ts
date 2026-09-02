import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidEmail,
  isValidPhone,
  isValidName,
  isValidPageRange,
  sanitizePageRange,
  normalizePhone,
  validateCustomerInfo,
  validatePrintPreferences,
  validateUploadedFiles,
  formatPhone,
} from '../src/lib/validation';
import type { CustomerInfo, PrintPreferences, UploadedFileItem } from '../src/types';

test('isValidEmail: valid emails pass', () => {
  assert.equal(isValidEmail(''), true);
  assert.equal(isValidEmail('user@example.com'), true);
  assert.equal(isValidEmail('user.name+tag@domain.co.uk'), true);
});

test('isValidEmail: invalid emails fail', () => {
  assert.equal(isValidEmail('notanemail'), false);
  assert.equal(isValidEmail('missing@domain'), false);
  assert.equal(isValidEmail('@nodomain.com'), false);
  assert.equal(isValidEmail('spaces in@address.com'), false);
});

test('isValidPhone: valid phone numbers pass', () => {
  assert.equal(isValidPhone('+1 (555) 019-2831'), true);
  assert.equal(isValidPhone('9876543210'), true);
  assert.equal(isValidPhone('+91 98765 43210'), true);
});

test('isValidPhone: invalid phone numbers fail', () => {
  assert.equal(isValidPhone(''), false);
  assert.equal(isValidPhone('123'), false);
  assert.equal(isValidPhone('abcdefghij'), false);
  assert.equal(isValidPhone('1'), false);
});

test('isValidName: valid names pass', () => {
  assert.equal(isValidName('John Doe'), true);
  assert.equal(isValidName('O\u2019Connor'), true);
  assert.equal(isValidName('Mary-Ann Smith-Jones'), true);
  assert.equal(isValidName('John'), true);
});

test('isValidName: invalid names fail', () => {
  assert.equal(isValidName(''), false);
  assert.equal(isValidName('A'), false);
  assert.equal(isValidName('123Numbers'), false);
  assert.equal(isValidName('a'.repeat(101)), false);
});

test('isValidPageRange: valid formats pass', () => {
  assert.equal(isValidPageRange('All'), true);
  assert.equal(isValidPageRange('all'), true);
  assert.equal(isValidPageRange(''), true);
  assert.equal(isValidPageRange('1'), true);
  assert.equal(isValidPageRange('1-5'), true);
  assert.equal(isValidPageRange('1,3,5'), true);
  assert.equal(isValidPageRange('1-5, 8, 10-12'), true);
});

test('isValidPageRange: invalid formats fail', () => {
  assert.equal(isValidPageRange('abc'), false);
  assert.equal(isValidPageRange('1-'), false);
  assert.equal(isValidPageRange('-5'), false);
  assert.equal(isValidPageRange('5-1'), false);
  assert.equal(isValidPageRange('0-5'), false);
});

test('sanitizePageRange: normalizes input', () => {
  assert.equal(sanitizePageRange(' All  '), 'All');
  assert.equal(sanitizePageRange(''), 'All');
  assert.equal(sanitizePageRange(' 1 - 5 , 3 '), '1-5,3');
});

test('normalizePhone: strips non-digits', () => {
  assert.equal(normalizePhone('+1 (555) 019-2831'), '15550192831');
  assert.equal(normalizePhone('abc123def456'), '123456');
  assert.equal(normalizePhone(''), '');
});

test('formatPhone: formats 10 digit US phone', () => {
  assert.equal(formatPhone('5550192831'), '(555) 019-2831');
});

const VALID_CUSTOMER: CustomerInfo = {
  name: 'John Doe',
  phone: '+1 (555) 019-2831',
  email: 'john@example.com',
  notifyVia: 'whatsapp',
};

test('validateCustomerInfo: valid customer passes', () => {
  const result = validateCustomerInfo(VALID_CUSTOMER);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
});

test('validateCustomerInfo: missing name and phone fail', () => {
  const result = validateCustomerInfo({ name: '', phone: '', notifyVia: 'none' });
  assert.equal(result.valid, false);
  assert.ok('name' in result.errors);
  assert.ok('phone' in result.errors);
});

test('validateCustomerInfo: invalid email fails but optional', () => {
  const result = validateCustomerInfo({ ...VALID_CUSTOMER, email: 'bad-email' });
  assert.equal(result.valid, false);
  assert.ok('email' in result.errors);
});

const VALID_PREFS: PrintPreferences = {
  colorMode: 'bw',
  paperSize: 'A4',
  sidedness: 'single',
  orientation: 'portrait',
  pageRange: 'All',
  copies: 1,
  paperFinish: 'standard_80gsm',
  binding: 'none',
};

test('validatePrintPreferences: valid preferences pass', () => {
  const result = validatePrintPreferences(VALID_PREFS);
  assert.equal(result.valid, true);
});

test('validatePrintPreferences: copies range validated', () => {
  const r1 = validatePrintPreferences({ ...VALID_PREFS, copies: 0 });
  assert.equal(r1.valid, false);
  assert.ok('copies' in r1.errors);

  const r2 = validatePrintPreferences({ ...VALID_PREFS, copies: 501 });
  assert.equal(r2.valid, false);
  assert.ok('copies' in r2.errors);
});

test('validatePrintPreferences: invalid page range fails', () => {
  const result = validatePrintPreferences({ ...VALID_PREFS, pageRange: 'invalid!!!' });
  assert.equal(result.valid, false);
  assert.ok('pageRange' in result.errors);
});

const TEST_FILE: UploadedFileItem = {
  id: 'f1',
  name: 'test.pdf',
  sizeBytes: 1024,
  mimeType: 'application/pdf',
  pageCount: 5,
  sha256Hash: 'abc',
  isShredded: false,
};

test('validateUploadedFiles: empty files fail', () => {
  const result = validateUploadedFiles([]);
  assert.equal(result.valid, false);
  assert.ok('files' in result.errors);
});

test('validateUploadedFiles: too many files fail', () => {
  const files: UploadedFileItem[] = Array.from({ length: 6 }, (_, i) => ({
    ...TEST_FILE,
    id: `f${i}`,
  }));
  const result = validateUploadedFiles(files);
  assert.equal(result.valid, false);
  assert.ok('files' in result.errors);
});

test('validateUploadedFiles: file size over limit fails', () => {
  const bigFile: UploadedFileItem = {
    ...TEST_FILE,
    sizeBytes: 200 * 1024 * 1024,
  };
  const result = validateUploadedFiles([bigFile]);
  assert.equal(result.valid, false);
});

test('validateUploadedFiles: invalid page count fails', () => {
  const badPageFile: UploadedFileItem = { ...TEST_FILE, pageCount: 0 };
  const result = validateUploadedFiles([badPageFile]);
  assert.equal(result.valid, false);
});
