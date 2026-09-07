/**
 * Automated Verification Script for AutoPrint First User Setup & Welcome Flow
 * Tests:
 * 1. Fresh database setup status check (initialized=false, hasUsers=false)
 * 2. Creating first merchant admin user
 * 3. Token verification and session persistence
 * 4. Setup status transition (initialized=true, hasUsers=true)
 * 5. Security check: rejection of subsequent unauthenticated create-first-user calls
 * 6. Normal merchant login with credentials
 */

const http = require('http');

async function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, headers: res.headers, body: parsed });
        } catch {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function run() {
  console.log('===============================================================');
  console.log(' AUTOPRINT MERCHANT DESK — FIRST USER ONBOARDING VERIFICATION  ');
  console.log('===============================================================\n');

  // STEP 1: Check initial status on 0 users
  console.log('--- TEST 1: Initial Setup Status (0 Users) ---');
  const statusRes1 = await request({
    hostname: '127.0.0.1',
    port: 8000,
    path: '/api/setup/status',
    method: 'GET',
  });
  console.log('HTTP Status:', statusRes1.status);
  console.log('Response:', JSON.stringify(statusRes1.body, null, 2));
  if (statusRes1.body.hasUsers !== false || statusRes1.body.initialized !== false) {
    throw new Error('Test 1 Failed: hasUsers should be false on fresh install');
  }
  console.log('✅ TEST 1 PASSED: Correctly reports fresh uninitialized state.\n');

  // STEP 2: Create First User
  console.log('--- TEST 2: Create First User ---');
  const createPayload = {
    fullName: 'Ramesh Sharma',
    email: 'ramesh.sharma@autoprint.local',
    username: 'ramesh',
    password: 'Password123',
    confirmPassword: 'Password123',
    rememberMe: true,
  };
  const createRes = await request(
    {
      hostname: '127.0.0.1',
      port: 8000,
      path: '/api/setup/create-first-user',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    createPayload
  );
  console.log('HTTP Status:', createRes.status);
  console.log('Response:', JSON.stringify(createRes.body, null, 2));
  if (createRes.status !== 201 || !createRes.body.data?.token) {
    throw new Error('Test 2 Failed: Did not return 201 Created with session token');
  }
  const sessionToken = createRes.body.data.token;
  console.log('✅ TEST 2 PASSED: Successfully created initial administrator account.\n');

  // STEP 3: Setup Status Transition
  console.log('--- TEST 3: Setup Status Transition (User Exists) ---');
  const statusRes2 = await request({
    hostname: '127.0.0.1',
    port: 8000,
    path: '/api/setup/status',
    method: 'GET',
  });
  console.log('HTTP Status:', statusRes2.status);
  console.log('Response:', JSON.stringify(statusRes2.body, null, 2));
  if (statusRes2.body.hasUsers !== true || statusRes2.body.initialized !== true) {
    throw new Error('Test 3 Failed: hasUsers should be true after setup');
  }
  console.log('✅ TEST 3 PASSED: Setup status correctly transitioned to initialized.\n');

  // STEP 4: Security Enforcement — Reject Subsequent First User Creation
  console.log('--- TEST 4: Security Rule — Reject Subsequent Calls ---');
  const exploitPayload = {
    fullName: 'Intruder User',
    email: 'intruder@exploit.local',
    username: 'intruder',
    password: 'Password999',
    confirmPassword: 'Password999',
  };
  const exploitRes = await request(
    {
      hostname: '127.0.0.1',
      port: 8000,
      path: '/api/setup/create-first-user',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    exploitPayload
  );
  console.log('HTTP Status:', exploitRes.status);
  console.log('Response:', JSON.stringify(exploitRes.body, null, 2));
  if (exploitRes.status !== 403) {
    throw new Error('Test 4 Failed: Expected 403 Forbidden when users already exist');
  }
  console.log('✅ TEST 4 PASSED: First-user creation strictly rejected when user count > 0.\n');

  // STEP 5: Verify Session Authentication
  console.log('--- TEST 5: Verify Remembered Session Token ---');
  const authRes = await request({
    hostname: '127.0.0.1',
    port: 8000,
    path: '/api/merchant/auth/check',
    method: 'GET',
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  console.log('HTTP Status:', authRes.status);
  console.log('Response:', JSON.stringify(authRes.body, null, 2));
  if (!authRes.body.data?.isAuthenticated) {
    throw new Error('Test 5 Failed: Session token failed verification');
  }
  console.log('✅ TEST 5 PASSED: Session token successfully verified.\n');

  // STEP 6: Verify Normal Login with Username and Password
  console.log('--- TEST 6: Normal Future Login Flow ---');
  const loginRes = await request(
    {
      hostname: '127.0.0.1',
      port: 8000,
      path: '/api/merchant/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    {
      emailOrPhone: 'ramesh',
      password: 'Password123',
      rememberMe: true,
    }
  );
  console.log('HTTP Status:', loginRes.status);
  console.log('Response:', JSON.stringify(loginRes.body, null, 2));
  if (loginRes.status !== 200 || !loginRes.body.data?.token) {
    throw new Error('Test 6 Failed: Normal login failed');
  }
  console.log('✅ TEST 6 PASSED: Normal login functions flawlessly.\n');

  console.log('🎉 ALL 6 ONBOARDING & AUTHENTICATION TESTS PASSED PERFECTLY!\n');
}

run().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
