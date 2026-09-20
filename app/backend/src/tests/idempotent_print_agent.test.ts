/**
 * Idempotent Print Agent & Local Print Queue Test Suite
 * Validates local SQLite lock acquisition, duplicate event protection,
 * and concurrency safety for merchant agents.
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { LocalPrintJobRepository } from '../database/repositories/localPrintJobRepository';
import { initDatabase, getDb } from '../database/db';

describe('Idempotent Print Agent & Local Queue Tests', () => {
  const testJobId = `SB-TEST-${Date.now()}`;
  const testMerchantId = 'merchant_test_123';
  const testStoragePath = `print-documents/${testMerchantId}/${testJobId}/document.pdf`;
  const testPrinterId = 'PRINTER-LOCAL-01';

  before(() => {
    initDatabase();
  });

  it('should claim a new job atomically and set status to PRINTING', () => {
    const claimed = LocalPrintJobRepository.claimJob(testJobId, testMerchantId, testStoragePath, testPrinterId);
    assert.equal(claimed, true, 'First claim should succeed');

    const job = LocalPrintJobRepository.get(testJobId);
    assert.ok(job);
    assert.equal(job.job_id, testJobId);
    assert.equal(job.status, 'PRINTING');
    assert.equal(job.merchant_id, testMerchantId);
    assert.equal(job.printer_id, testPrinterId);
    assert.equal(job.attempt_count, 1);
  });

  it('should reject second claim attempt for the same job (Idempotency / Duplicate Guard)', () => {
    const duplicateClaim = LocalPrintJobRepository.claimJob(testJobId, testMerchantId, testStoragePath, testPrinterId);
    assert.equal(duplicateClaim, false, 'Duplicate claim for active/printing job must be rejected');

    const isBusy = LocalPrintJobRepository.isAlreadyProcessedOrActive(testJobId);
    assert.equal(isBusy, true, 'Job must be marked active or already processed');
  });

  it('should update local file path once downloaded', () => {
    const localPath = 'C:\\AutoPrint\\temp\\supabase\\doc.pdf';
    LocalPrintJobRepository.setLocalFilePath(testJobId, localPath);

    const job = LocalPrintJobRepository.get(testJobId);
    assert.ok(job);
    assert.equal(job.local_file_path, localPath);
  });

  it('should update status to PRINTED and prevent subsequent claims', () => {
    LocalPrintJobRepository.updateStatus(testJobId, 'PRINTED');

    const job = LocalPrintJobRepository.get(testJobId);
    assert.ok(job);
    assert.equal(job.status, 'PRINTED');

    const reClaim = LocalPrintJobRepository.claimJob(testJobId, testMerchantId, testStoragePath, testPrinterId);
    assert.equal(reClaim, false, 'Printed job must never be claimed again');
  });

  it('should track failure state and error message accurately', () => {
    const failedJobId = `SB-FAIL-${Date.now()}`;
    const claimSuccess = LocalPrintJobRepository.claimJob(failedJobId, testMerchantId, 'print-documents/fail/doc.pdf');
    assert.equal(claimSuccess, true);

    LocalPrintJobRepository.updateStatus(failedJobId, 'PRINT_FAILED', 'Printer tray empty');

    const failedJob = LocalPrintJobRepository.get(failedJobId);
    assert.ok(failedJob);
    assert.equal(failedJob.status, 'PRINT_FAILED');
    assert.equal(failedJob.error_message, 'Printer tray empty');

    // Retrying a PRINT_FAILED job should be allowed by claimJob
    const retryClaim = LocalPrintJobRepository.claimJob(failedJobId, testMerchantId, 'print-documents/fail/doc.pdf');
    assert.equal(retryClaim, true, 'Retry claim for PRINT_FAILED job should succeed');

    const retriedJob = LocalPrintJobRepository.get(failedJobId);
    assert.equal(retriedJob?.status, 'PRINTING');
    assert.equal(retriedJob?.attempt_count, 2);
  });
});
