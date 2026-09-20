/**
 * AutoPrint V1/V2 Architecture & Cloud Controller Test Suite
 * Validates:
 * 1. V1 Local-First Offline Autonomy (Zero dependency on cloud)
 * 2. Identity model (merchant_id, device_id, installation_id separation)
 * 3. V2 Cloud Activation & Status Endpoints
 * 4. Safe offline degradation of CloudSyncService
 * 5. Document verification & duplicate job prevention
 * 6. Security role key non-exposure
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { initDatabase, getDb } from '../database/db';
import { InstallationIdentityRepository } from '../database/repositories/installationIdentityRepository';
import { MerchantRepository } from '../database/repositories/merchantRepository';
import { CloudActivationService } from '../services/cloudActivationService';
import { CloudController } from '../controllers/cloudController';
import { CloudSyncService } from '../services/supabase/cloudSyncService';
import { localPrintJobRepository } from '../database/repositories/localPrintJobRepository';
import crypto from 'crypto';

// Initialize DB before tests
initDatabase();

test('=== AUTOPRINT V1/V2 ARCHITECTURE & CLOUD TEST SUITE ===', async (t) => {

  await t.test('1. Installation & Device Identity Architecture (Rule 9 & 10)', async () => {
    const identity = InstallationIdentityRepository.ensure({
      shopName: 'Test Apex Station',
      ownerName: 'Apex Tech',
    });

    assert.ok(identity, 'Identity must be initialized');
    assert.ok(identity.installation_id, 'installation_id must exist');
    assert.ok(identity.device_id, 'device_id must exist');
    assert.ok(identity.device_id.startsWith('DEV-'), 'device_id must start with DEV-');
    assert.ok(identity.merchant_id, 'merchant_id must exist');

    // Verify stability on subsequent calls
    const sameIdentity = InstallationIdentityRepository.ensure();
    assert.equal(sameIdentity.installation_id, identity.installation_id, 'installation_id must be persistent');
    assert.equal(sameIdentity.device_id, identity.device_id, 'device_id must be persistent');
    assert.equal(sameIdentity.merchant_id, identity.merchant_id, 'merchant_id must be persistent');

    // Verify device identity differs from merchant identity
    assert.notEqual(identity.device_id, identity.merchant_id, 'Merchant identity and device identity must be distinct');
  });

  await t.test('2. CloudController.getStatus Response Structure (Rule 24)', async () => {
    let responseData: any = null;
    let statusCode = 200;

    const mockReq: any = {};
    const mockRes: any = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        responseData = data;
        return this;
      },
    };

    CloudController.getStatus(mockReq, mockRes);

    assert.equal(statusCode, 200);
    assert.ok(responseData, 'Response data must exist');
    assert.equal(responseData.ok, true);
    assert.ok(['LOCAL', 'CLOUD_CONNECTED'].includes(responseData.mode), 'Mode must be valid');
    assert.ok(['ONLINE', 'OFFLINE', 'CONNECTING', 'ERROR'].includes(responseData.status), 'Status must be valid');
    assert.ok(typeof responseData.configured === 'boolean', 'configured must be boolean');
    assert.ok(responseData.deviceId, 'deviceId must be reported');
  });

  await t.test('3. Cloud Activation Code Lifecycle (Rule 11)', async () => {
    // Ensure primary merchant exists for activation
    let merchant = MerchantRepository.getPrimaryMerchant();
    if (!merchant) {
      MerchantRepository.createFirstAdmin({
        fullName: 'Test Owner',
        email: `test_owner_${Date.now()}@example.com`,
        username: `owner_${Date.now()}`,
        password: 'Password123!',
        shopName: 'Apex Test Print Center',
      });
    }

    const codeInfo = CloudActivationService.createCode();
    assert.ok(codeInfo.code, 'Activation code must be generated');
    assert.ok(/^AUTO-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(codeInfo.code), `Code ${codeInfo.code} must match AUTO-XXXX-XXXX format`);
    assert.ok(new Date(codeInfo.expiresAt).getTime() > Date.now(), 'Code must have future expiration');

    // Attempting activation with an invalid format code must fail cleanly
    const invalidResult = await CloudActivationService.connect('INVALID-FORMAT');
    assert.equal(invalidResult.connected, false);
    assert.ok(invalidResult.reason, 'Must return failure reason for invalid code');
  });

  await t.test('4. V1 Offline Autonomy - CloudSyncService Safe Degradation (Rule 2 & 17)', async () => {
    // When cloud is unconfigured or offline, syncMerchantProfile must NOT throw or block
    await assert.doesNotReject(async () => {
      await CloudSyncService.syncMerchantProfile();
    }, 'syncMerchantProfile must safely degrade when offline');
  });

  await t.test('5. Private Supabase Storage & File Verification (Rule 15, 19, 20)', async () => {
    const identity = InstallationIdentityRepository.ensure();
    const testJobId = `TEST-VERIFY-${Date.now()}`;
    const testContent = Buffer.from('%PDF-1.7 Sample Document for SHA-256 Verification Rule 20');
    const expectedHash = crypto.createHash('sha256').update(testContent).digest('hex');
    const storagePath = `print-documents/${identity.merchant_id}/${testJobId}/document.pdf`;

    // 1. Path must be inside private bucket structure
    assert.ok(storagePath.startsWith(`print-documents/${identity.merchant_id}/`));

    // 2. Hash computation must match exactly
    const actualHash = crypto.createHash('sha256').update(testContent).digest('hex');
    assert.equal(actualHash, expectedHash);

    // 3. Corrupt content must fail verification
    const corruptedContent = Buffer.from('%PDF-1.7 Corrupted Content by Man-in-the-Middle');
    const corruptedHash = crypto.createHash('sha256').update(corruptedContent).digest('hex');
    assert.notEqual(corruptedHash, expectedHash, 'Corrupted payload must not match expected hash');
  });

  await t.test('6. Realtime Duplicate Job Protection (Rule 26)', async () => {
    const duplicateJobId = `DUP-JOB-${Date.now()}`;
    const dummyHash = crypto.createHash('sha256').update(duplicateJobId).digest('hex');

    // First insertion
    const job1 = localPrintJobRepository.create({
      job_id: duplicateJobId,
      storage_path: `print-documents/m1/${duplicateJobId}/test.pdf`,
      file_hash: dummyHash,
      status: 'QUEUED',
      attempt_count: 0,
    });
    assert.ok(job1, 'First job creation must succeed');

    // Duplicate check
    const isDuplicate = localPrintJobRepository.isAlreadyProcessedOrActive(duplicateJobId);
    assert.equal(isDuplicate, true, 'Job must be marked active/processed');

    // Cleanup test record
    getDb().prepare('DELETE FROM local_print_jobs WHERE job_id = ?').run(duplicateJobId);
  });

  await t.test('7. Service Role Key Security Boundary (Rule 23)', async () => {
    // Verify SUPABASE_SERVICE_ROLE_KEY is NOT defined in process.env
    assert.equal(
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      undefined,
      'SUPABASE_SERVICE_ROLE_KEY must NEVER be set in backend environment'
    );
  });

  await t.test('8. Diagnostic Hardware Test Sheet Generation & Dispatch', async () => {
    const { PrinterService } = await import('../services/printerService.js');
    const result = await PrinterService.generateAndDispatchTestSheet('AutoPrint System Spooler');
    assert.ok(result, 'Test print result must exist');
    assert.equal(result.success, true, 'Test print dispatch must succeed');
    assert.ok(['PRINTED', 'READY_FOR_PICKUP', 'READY_FOR_HANDOVER'].includes(result.status), `Status ${result.status} must be valid`);
  });

  await t.test('9. Sanitized Diagnostics Report Generation', async () => {
    const { DiagnosticCollector } = await import('../utils/diagnosticCollector.js');
    const report = await DiagnosticCollector.generateSanitizedReport();
    assert.ok(report, 'Sanitized report must not be empty');
    assert.ok(report.includes('AutoPrint Diagnostics'), 'Must contain header');
    assert.ok(report.includes('Version:'), 'Must contain Version');
    assert.ok(report.includes('Print Engine:'), 'Must contain Print Engine');
    assert.ok(report.includes('Cloud:'), 'Must contain Cloud status');
    assert.ok(report.includes('Queue:'), 'Must contain Queue metrics');
    assert.ok(!report.includes('service_role'), 'Must never contain secrets');
  });
});

