/**
 * Merchant Agent Crash Recovery Test Suite
 * Validates recovery from mid-print crashes, power loss, and orphaned locks.
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { LocalPrintJobRepository, LocalPrintJobRow } from '../database/repositories/localPrintJobRepository';
import { initDatabase, getDb } from '../database/db';

describe('Merchant Agent Crash Recovery Tests', () => {
  const crashedJobId = `CRASH-TEST-${Date.now()}`;
  const testMerchantId = 'merchant_crash_test';

  before(() => {
    initDatabase();
  });

  it('should detect unfinished jobs stuck in PRINTING state on startup', () => {
    // Simulate a job that was actively claimed and printing when the agent abruptly stopped
    const claimed = LocalPrintJobRepository.claimJob(
      crashedJobId,
      testMerchantId,
      `print-documents/${testMerchantId}/${crashedJobId}/doc.pdf`
    );
    assert.equal(claimed, true);

    const activeJob = LocalPrintJobRepository.get(crashedJobId);
    assert.equal(activeJob?.status, 'PRINTING');

    // Startup recovery scan: getUnfinishedJobs must identify the crashed job
    const unfinished = LocalPrintJobRepository.getUnfinishedJobs(testMerchantId);
    const found = unfinished.find((j: LocalPrintJobRow) => j.job_id === crashedJobId);
    assert.ok(found, 'Crashed job must be identified during startup scan');
    assert.equal(found?.job_id, crashedJobId);
    assert.equal(found?.status, 'PRINTING');
  });

  it('should update crashed job status to PRINT_FAILED so it can be retried safely', () => {
    // The crash recovery handler marks stuck jobs as PRINT_FAILED with recovery message
    LocalPrintJobRepository.updateStatus(
      crashedJobId,
      'PRINT_FAILED',
      'Recovered from unexpected agent restart during print'
    );

    const recoveredJob = LocalPrintJobRepository.get(crashedJobId);
    assert.ok(recoveredJob);
    assert.equal(recoveredJob.status, 'PRINT_FAILED');
    assert.equal(recoveredJob.error_message, 'Recovered from unexpected agent restart during print');

    // Now re-claiming for retry should succeed cleanly
    const reClaim = LocalPrintJobRepository.claimJob(
      crashedJobId,
      testMerchantId,
      `print-documents/${testMerchantId}/${crashedJobId}/doc.pdf`
    );
    assert.equal(reClaim, true, 'Retry claim should succeed after recovery');

    const retried = LocalPrintJobRepository.get(crashedJobId);
    assert.equal(retried?.status, 'PRINTING');
    assert.equal(retried?.attempt_count, 2);
  });

  it('should never re-queue or touch a job that was already marked PRINTED prior to crash', () => {
    const finishedJobId = `FINISHED-${Date.now()}`;
    LocalPrintJobRepository.claimJob(finishedJobId, testMerchantId, 'print-documents/finished.pdf');
    LocalPrintJobRepository.updateStatus(finishedJobId, 'PRINTED');

    const unfinished = LocalPrintJobRepository.getUnfinishedJobs(testMerchantId);
    const found = unfinished.find((j: LocalPrintJobRow) => j.job_id === finishedJobId);
    assert.equal(found, undefined, 'Already completed jobs must never appear in unfinished jobs scan');
  });
});
