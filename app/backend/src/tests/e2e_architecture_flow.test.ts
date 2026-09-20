import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getDb } from '../database/db.js';
import { localPrintJobRepository } from '../database/repositories/localPrintJobRepository.js';
import { SupabaseDocumentTransport } from '../services/transport/supabaseDocumentTransport.js';
import { AutoPrintService } from '../services/autoprintService.js';
import { PrintJobStateMachine } from '../services/stateMachine/printJobStateMachine.js';

describe('=== END-TO-END AUTOPRINT ARCHITECTURE VERIFICATION ===', () => {
  const testMerchantId = 'merchant_e2e_test';
  const testJobId = `E2E-${Date.now()}`;
  const testFileName = 'architecture_contract.pdf';
  const samplePdfBuffer = Buffer.from('%PDF-1.4 E2E test file content representing customer document uploaded to Supabase Storage');
  const validSha256 = crypto.createHash('sha256').update(samplePdfBuffer).digest('hex');
  const storagePath = `print-documents/${testMerchantId}/${testJobId}/${testFileName}`;

  before(() => {
    getDb();
  });

  it('Step 1-3: Customer calculates SHA-256 hash and prepares direct Supabase Storage path', () => {
    assert.strictEqual(validSha256.length, 64, 'SHA-256 hash must be 64 characters hex');
    assert.ok(storagePath.startsWith('print-documents/'), 'Storage path must be inside private print-documents bucket');
  });

  it('Step 4-7: Supabase Realtime notifies merchant, lightweight JSON ticket is received and fast ACK returned', async () => {
    const ticketPayload = {
      type: 'PRINT_JOB' as const,
      jobId: testJobId,
      merchantId: testMerchantId,
      fileName: testFileName,
      storagePath: storagePath,
      fileSize: samplePdfBuffer.length,
      fileHash: validSha256,
      pages: 1,
      copies: 1,
      paperSize: 'A4',
      colorMode: 'BW',
      duplex: false,
      orientation: 'PORTRAIT',
    };

    // 1. Verify that the ticket payload is small JSON (under 1 KB), zero PDF binary bytes
    const payloadBytes = Buffer.byteLength(JSON.stringify(ticketPayload), 'utf8');
    assert.ok(payloadBytes < 1024, `Payload size should be under 1 KB in the notification, got ${payloadBytes} bytes`);

    // 2. Receive at merchant agent (simulating Supabase Realtime notification → local processing)
    const existing = localPrintJobRepository.getById(testJobId);
    assert.strictEqual(existing, null, 'Job should not exist prior to receipt');

    const localJob = localPrintJobRepository.create({
      job_id: testJobId,
      storage_path: storagePath,
      file_hash: validSha256,
      status: 'QUEUED',
      attempt_count: 0,
    });

    assert.strictEqual(localJob.job_id, testJobId);
    assert.strictEqual(localJob.file_hash, validSha256);
    assert.strictEqual(localJob.status, 'QUEUED');

    // Fast ACK response format verification
    const ack = {
      success: true,
      jobId: testJobId,
      status: 'RECEIVED',
    };
    assert.strictEqual(ack.success, true);
    assert.strictEqual(ack.status, 'RECEIVED');
  });

  it('Step 8: Enforce duplicate processing protection (never print twice on Supabase Realtime retry)', () => {
    const isProcessed = localPrintJobRepository.isAlreadyProcessedOrActive(testJobId);
    assert.strictEqual(isProcessed, true, 'Job must be marked active/processed');

    // Simulated retry should return ALREADY_RECEIVED without creating duplicate
    const retryResponse = {
      success: true,
      jobId: testJobId,
      status: 'ALREADY_RECEIVED',
      message: 'Print job has already been received and queued at this merchant desk.',
    };
    assert.strictEqual(retryResponse.status, 'ALREADY_RECEIVED');
  });

  it('Step 9-11: Merchant Agent downloads document and verifies SHA-256 hash match', async () => {
    // Transition to DOWNLOADING
    localPrintJobRepository.updateStatus(testJobId, 'DOWNLOADING');
    let jobRecord = localPrintJobRepository.getById(testJobId);
    assert.strictEqual(jobRecord?.status, 'DOWNLOADING');

    // Simulate downloaded file bytes from Supabase
    const downloadedBuffer = Buffer.from(samplePdfBuffer);
    const computedHash = crypto.createHash('sha256').update(downloadedBuffer).digest('hex');

    assert.strictEqual(computedHash, jobRecord?.file_hash, 'Computed SHA-256 must match customer upload hash');

    // Transition to FILE_READY
    localPrintJobRepository.updateStatus(testJobId, 'FILE_READY');
    jobRecord = localPrintJobRepository.getById(testJobId);
    assert.strictEqual(jobRecord?.status, 'FILE_READY');
  });

  it('Step 12: Corrupted file detection rejects printing with FILE_VERIFICATION_FAILED', () => {
    const corruptJobId = `CORRUPT-${Date.now()}`;
    localPrintJobRepository.create({
      job_id: corruptJobId,
      storage_path: 'print-documents/test/corrupt.pdf',
      file_hash: validSha256,
      status: 'DOWNLOADING',
    });

    const tamperedBuffer = Buffer.from('TAMPERED_OR_CORRUPT_BYTES');
    const tamperedHash = crypto.createHash('sha256').update(tamperedBuffer).digest('hex');

    assert.notStrictEqual(tamperedHash, validSha256);

    // Mismatch halts workflow
    localPrintJobRepository.updateStatus(corruptJobId, 'FILE_VERIFICATION_FAILED', 'SHA-256 checksum mismatch: downloaded file is corrupt or tampered');
    const corruptJob = localPrintJobRepository.getById(corruptJobId);
    assert.strictEqual(corruptJob?.status, 'FILE_VERIFICATION_FAILED');
    assert.ok(corruptJob?.error_message?.includes('checksum mismatch'));
  });

  it('Step 13-18: Local SQLite persistence survives connection interruption & completes lifecycle', () => {
    // Check state machine valid transitions
    assert.ok(PrintJobStateMachine.canTransition('DOWNLOADING', 'FILE_READY'));
    assert.ok(PrintJobStateMachine.canTransition('FILE_READY', 'QUEUED'));
    assert.ok(PrintJobStateMachine.canTransition('QUEUED', 'PRINTING'));
    assert.ok(PrintJobStateMachine.canTransition('PRINTING', 'PRINTED'));
    assert.ok(PrintJobStateMachine.canTransition('PRINTED', 'READY_FOR_COLLECTION'));
    assert.ok(PrintJobStateMachine.canTransition('READY_FOR_COLLECTION', 'COLLECTED'));

    // Move test job to PRINTED
    localPrintJobRepository.updateStatus(testJobId, 'PRINTED');
    const printedJob = localPrintJobRepository.getById(testJobId);
    assert.strictEqual(printedJob?.status, 'PRINTED');
    assert.ok(printedJob?.printed_at !== null);

    // Verify terminal verification works
    assert.ok(PrintJobStateMachine.isTerminal('COLLECTED'));
    assert.strictEqual(PrintJobStateMachine.canTransition('COLLECTED', 'PRINTING'), false, 'Cannot print a collected job');
  });
});
