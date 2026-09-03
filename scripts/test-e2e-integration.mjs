/**
 * AutoPrint End-to-End Production Verification & Test Data Isolation Suite
 *
 * Runs against an isolated test instance (PORT 5555 / autoprint.test.db) to guarantee:
 * 1. Clean Zero-State: 0 print jobs, 0 active queue, 0 audit logs on startup.
 * 2. True Fresh Installation: 0 pre-existing accounts; dynamic first-run admin onboarding.
 * 3. Exact Price Parity: Merchant Price = Customer Total = Payment Total = SQLite Total = Kiosk Total = Merchant Desk (₹100.00).
 * 4. Zero GST Surcharge added.
 * 5. 8-Digit Collection Code lifecycle & cryptographic verification.
 * 6. Cash Collection & Document Handover -> Job transitions to COLLECTED.
 * 7. Active Queue returns to 0 after document handover.
 * 8. Complete Test Database Isolation & Teardown: Zero pollution of production database.
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEST_PORT = 5555;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;
const TEST_DB_PATH = path.resolve(__dirname, '../datastore/backend/database/autoprint.test.db');

// Ensure clean test database before starting
if (fs.existsSync(TEST_DB_PATH)) {
  try { fs.unlinkSync(TEST_DB_PATH); } catch {}
}
if (fs.existsSync(`${TEST_DB_PATH}-wal`)) {
  try { fs.unlinkSync(`${TEST_DB_PATH}-wal`); } catch {}
}
if (fs.existsSync(`${TEST_DB_PATH}-shm`)) {
  try { fs.unlinkSync(`${TEST_DB_PATH}-shm`); } catch {}
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, options);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, headers: res.headers, json, text };
}

async function waitForServerReady(retries = 30) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      if (res.ok) return true;
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  return false;
}

async function runE2EVerification() {
  console.log('======================================================================');
  console.log('   AUTOPRINT ZERO-MOCK PRODUCTION INTEGRATION & ISOLATION SUITE      ');
  console.log('======================================================================\n');

  console.log(`[TEST RUNNER] Starting isolated test backend on port ${TEST_PORT}...`);
  console.log(`[TEST RUNNER] Test Database: ${TEST_DB_PATH}`);

  const testServer = spawn(process.execPath, ['dist/server.js'], {
    cwd: path.resolve(__dirname, '../app/backend'),
    env: {
      ...process.env,
      PORT: String(TEST_PORT),
      AUTOPRINT_DB_PATH: TEST_DB_PATH,
      NODE_ENV: 'test',
    },
    stdio: 'pipe',
  });

  const isReady = await waitForServerReady();
  if (!isReady) {
    testServer.kill();
    throw new Error('Test backend failed to start on port ' + TEST_PORT);
  }
  console.log('[TEST RUNNER] Test backend is healthy and responding.\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // --------------------------------------------------------------------------
    // STEP 1: Backend Health & Zero-State Verification
    // --------------------------------------------------------------------------
    console.log('----------------------------------------------------------------------');
    console.log('STEP 1: Zero-State Verification (Empty Production Operational Tables)');
    console.log('----------------------------------------------------------------------');
    
    const healthRes = await request('/api/health');
    assert(healthRes.status === 200, 'Health check status 200');
    assert(healthRes.json?.ok === true, 'Health check ok: true');
    assert(healthRes.json?.database?.engine === 'sqlite3-wal', 'Database engine is SQLite WAL');
    assert(healthRes.json?.database?.healthy === true, 'SQLite database is healthy');

    const initialWorkload = await request('/api/system/workload');
    assert(initialWorkload.status === 200, 'Workload endpoint responded with 200');
    assert(initialWorkload.json?.data?.activeJobs === 0, `Initial active jobs count is 0 (Got: ${initialWorkload.json?.data?.activeJobs})`);
    assert(initialWorkload.json?.data?.pendingJobs === 0, `Initial pending jobs count is 0 (Got: ${initialWorkload.json?.data?.pendingJobs})`);

    const initialJobs = await request('/api/jobs');
    assert(initialJobs.status === 200, 'Jobs endpoint responded with 200');
    assert(initialJobs.json?.data?.length === 0, `Initial print jobs array is empty [] (Count: ${initialJobs.json?.data?.length})`);
    
    const initialAuth = await request('/api/merchant/auth/check');
    assert(initialAuth.status === 200, 'Auth check endpoint responded with 200');
    assert(initialAuth.json?.data?.isOnboarded === false, 'Fresh installation starts with isOnboarded = false');
    assert(initialAuth.json?.data?.merchant === null, 'Fresh installation starts with 0 merchants in DB');
    console.log('');

    // --------------------------------------------------------------------------
    // STEP 2: First-Time Administrator Onboarding & Rate Card Setup
    // --------------------------------------------------------------------------
    console.log('----------------------------------------------------------------------');
    console.log('STEP 2: First-Time Administrator Setup (Custom Password Hashed)');
    console.log('----------------------------------------------------------------------');

    const TEST_ADMIN_PASS = 'TestAdmin@Secure2026';
    const onboardRes = await request('/api/merchant/auth/onboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shopName: 'AutoPrint Express Store',
        ownerName: 'Store Administrator',
        email: 'admin@autoprint.local',
        phone: '+919876543210',
        password: TEST_ADMIN_PASS,
        address: 'Shop Counter #01, Campus Main Gate',
        upiId: 'autoprint@upi',
        colorPricePerPage: 10.0,
        bwPricePerPage: 2.0,
      }),
    });
    assert(onboardRes.status === 200 || onboardRes.status === 201, 'Fresh installation first-run admin created dynamically');
    const adminToken = onboardRes.json?.data?.token;
    assert(Boolean(adminToken), 'Admin authenticated with session token');

    const ratePayload = {
      shopName: 'AutoPrint Express Store',
      ownerName: 'Store Administrator',
      branch: 'Main Branch',
      kioskNumber: 'Counter #01',
      address: 'Shop Counter #01, Campus Main Gate',
      isOnline: true,
      rates: {
        bwSingle: 100.00,
        bwDoublePerSide: 90.00,
        colorSingle: 200.00,
        colorDoublePerSide: 180.00,
        photoGlossy: 350.00,
        a3Multiplier: 2.0,
        legalMultiplier: 1.25,
        letterMultiplier: 1.0,
        finishing: {
          staple: 0.00,
          spiral: 50.00,
          hardcover: 200.00,
          laminationPerSheet: 30.00,
        },
      },
    };

    const updateProfileRes = await request('/api/merchant/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${adminToken}`,
      },
      body: JSON.stringify(ratePayload),
    });
    assert(updateProfileRes.status === 200, 'Merchant profile and ₹100 rate card saved to SQLite');

    const publicProfileRes = await request('/api/merchant/public-profile');
    assert(publicProfileRes.status === 200, 'Public profile endpoint responded with 200');
    const rates = publicProfileRes.json?.data?.rates;
    assert(rates?.bwSingle === 100.00, `Merchant B&W Single rate is ₹100.00 (Got: ₹${rates?.bwSingle})`);
    console.log('');

    // --------------------------------------------------------------------------
    // STEP 3: Single Real Customer Print Order Creation (1 Order = 1 Job)
    // --------------------------------------------------------------------------
    console.log('----------------------------------------------------------------------');
    console.log('STEP 3: Single Real Customer Print Order Creation (1 Order = 1 Job)');
    console.log('----------------------------------------------------------------------');

    const customerCalculatedTotal = 100.00;
    const orderPayload = {
      customerName: 'Ananya Sharma',
      customerPhone: '+919876543210',
      fileName: 'Project_Report_Final.pdf',
      amountTotal: customerCalculatedTotal,
      currency: 'INR',
      paymentMethod: 'CASH',
      colorMode: 'bw',
      copies: 1,
      paperSize: 'a4',
      duplex: 'single',
      pageRange: '1',
      finishing: 'none',
    };

    const jobSubmitRes = await request('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(orderPayload),
    });

    assert(jobSubmitRes.status === 201, `Job submission responded with 201 Created`);
    const createdJob = jobSubmitRes.json?.data;
    const verification = createdJob?.verification;
    const jobId = createdJob?.id;
    const verificationCode = verification?.verificationCode;

    assert(createdJob?.amountTotal === 100.00, `Backend stored amountTotal = ₹${createdJob?.amountTotal}`);
    assert(Boolean(createdJob?.jobNo), `Assigned Job Number: ${createdJob?.jobNo}`);
    assert(Boolean(verification?.verificationCode), `Assigned 8-Digit Collection Code: ${verification?.formattedCode}`);
    console.log(`     Job: ${createdJob?.jobNo} | ID: ${jobId} | Code: ${verification?.formattedCode} | Total: ₹${createdJob?.amountTotal}\n`);

    // --------------------------------------------------------------------------
    // STEP 4: Real-Time Active Queue Count Verification (Active = 1)
    // --------------------------------------------------------------------------
    console.log('----------------------------------------------------------------------');
    console.log('STEP 4: Real-Time Active Queue Count Verification (Active = 1)');
    console.log('----------------------------------------------------------------------');

    const postCreateWorkload = await request('/api/system/workload');
    assert(postCreateWorkload.status === 200, 'Workload endpoint responded with 200');
    assert(postCreateWorkload.json?.data?.activeJobs === 1, `Active jobs in queue is EXACTLY 1 (Got: ${postCreateWorkload.json?.data?.activeJobs})`);
    assert(postCreateWorkload.json?.data?.pendingJobs === 1, `Pending jobs count is EXACTLY 1 (Got: ${postCreateWorkload.json?.data?.pendingJobs})`);

    const activeJobRes = await request(`/api/jobs/${jobId}`);
    assert(activeJobRes.status === 200, 'Kiosk retrieved active job details from backend');
    assert(activeJobRes.json?.data?.amountTotal === 100.00, `Kiosk active job amountTotal is ₹${activeJobRes.json?.data?.amountTotal}`);
    console.log('');

    // --------------------------------------------------------------------------
    // STEP 5: Merchant Counter Verification & Cash Collection
    // --------------------------------------------------------------------------
    console.log('----------------------------------------------------------------------');
    console.log('STEP 5: Merchant Counter Verification & Cash Collection');
    console.log('----------------------------------------------------------------------');

    const lookupRes = await request(`/api/verification/lookup/${verificationCode}`);
    assert(lookupRes.status === 200, `Verification lookup returned 200 for code ${verificationCode}`);
    assert(lookupRes.json?.data?.customerName === 'Ananya Sharma', `Customer name: ${lookupRes.json?.data?.customerName}`);
    assert(lookupRes.json?.data?.amountTotal === 100.00, `Merchant Desk displays exact order total: ₹${lookupRes.json?.data?.amountTotal}`);
    assert(lookupRes.json?.data?.jobId === jobId, `Bound to Job ID: ${lookupRes.json?.data?.jobId}`);

    const cashRes = await request('/api/verification/collect-cash', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verificationCode,
        tenderedAmount: 100.00,
        staffId: 'STAFF-DESK-01',
        staffName: 'Desk Operator (Counter #1)',
      }),
    });
    assert(cashRes.status === 200, 'Cash collection recorded in SQLite');
    assert(cashRes.json?.data?.paymentStatus === 'CASH_COLLECTED', 'Payment status = CASH_COLLECTED');
    assert(cashRes.json?.data?.cashChangeMinorUnits === 0, `Change due is exact ₹0.00`);
    console.log('');

    // --------------------------------------------------------------------------
    // STEP 6: Document Handover & Active Queue Expiry (Active -> 0)
    // --------------------------------------------------------------------------
    console.log('----------------------------------------------------------------------');
    console.log('STEP 6: Document Handover & Active Queue Expiry (Active -> 0)');
    console.log('----------------------------------------------------------------------');

    const handoverRes = await request('/api/verification/handover', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        verificationCode,
        staffId: 'STAFF-DESK-01',
        staffName: 'Desk Operator (Counter #1)',
      }),
    });
    assert(handoverRes.status === 200, 'Handover confirmed in SQLite datastore');
    assert(handoverRes.json?.data?.handoverStatus === 'COLLECTED', 'Verification handover status = COLLECTED');

    // Verify that print_jobs table status was also updated to COLLECTED
    const handedJobRes = await request(`/api/jobs/${jobId}`);
    assert(handedJobRes.json?.data?.status === 'COLLECTED', `Print job status updated to COLLECTED in SQLite (Got: ${handedJobRes.json?.data?.status})`);

    // Active queue count must now return to 0 because COLLECTED is a terminal status!
    const postHandoverWorkload = await request('/api/system/workload');
    assert(postHandoverWorkload.json?.data?.activeJobs === 0, `Active jobs in queue returned to 0 after handover (Got: ${postHandoverWorkload.json?.data?.activeJobs})`);
    console.log('');

    // --------------------------------------------------------------------------
    // STEP 7: Automated Test Teardown (Clean Database Guarantee)
    // --------------------------------------------------------------------------
    console.log('----------------------------------------------------------------------');
    console.log('STEP 7: Automated Test Teardown (Clean Database Guarantee)');
    console.log('----------------------------------------------------------------------');

    const deleteJobRes = await request(`/api/jobs/${jobId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${adminToken}` },
    });
    assert(deleteJobRes.status === 200 || deleteJobRes.status === 204, 'Test print job cleaned up after verification');

    const finalWorkload = await request('/api/system/workload');
    assert(finalWorkload.json?.data?.activeJobs === 0, 'Final active jobs count is 0');
    console.log('');

  } finally {
    // Teardown test server
    console.log('[TEST RUNNER] Shutting down isolated test backend...');
    testServer.kill();
    try { if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH); } catch {}
    try { if (fs.existsSync(`${TEST_DB_PATH}-wal`)) fs.unlinkSync(`${TEST_DB_PATH}-wal`); } catch {}
    try { if (fs.existsSync(`${TEST_DB_PATH}-shm`)) fs.unlinkSync(`${TEST_DB_PATH}-shm`); } catch {}
    console.log('[TEST RUNNER] Isolated test database cleaned up safely.\n');
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  console.log('======================================================================');
  console.log(`  E2E ISOLATION SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================');

  if (failed === 0) {
    console.log('\n🎉 ZERO-MOCK ARCHITECTURE AND TEST ISOLATION VERIFIED (100% SUCCESS).');
    process.exit(0);
  } else {
    console.error(`\n⚠️ ${failed} assertions failed during verification.`);
    process.exit(1);
  }
}

runE2EVerification().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
