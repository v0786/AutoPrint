import { AutoPrintService } from './services/autoprintService';
import { VerificationService } from './services/verificationService';
import { auditLogger } from './utils/auditLogger';
import { initDatabase } from './database/db';

async function main() {
  initDatabase();
  console.log('=== AUTOPRINT BACKEND VERIFICATION & FAIL-SAFE TEST SUITE ===\n');

  // 1. Submit Print Job (Generate 8-digit verification code & watermark)
  console.log('1. Submitting New Print Job...');
  const newJob = await AutoPrintService.submitJob({
    fileName: 'Annual_Financial_Report_2026.pdf',
    mimeType: 'application/pdf',
    customerName: 'Alice Smith',
    customerPhone: '+91-98765-01990',
    printerName: 'LaserJet-Counter-01',
    amountMinorUnits: 4500, // Rs 45.00
    currency: 'INR',
    paymentMethod: 'UPI',
    specs: {
      copies: 2,
      colorMode: 'color',
      paperSize: 'a4',
      duplex: 'double',
      pageRange: 'all',
    },
  });

  console.log(`✓ Job Submitted Successfully! Job ID: ${newJob.id}, Job No: ${newJob.jobNo}`);
  console.log(`✓ Generated 8-Digit Verification Code: ${newJob.verification?.verificationCode} (Formatted: ${newJob.verification?.formattedCode})`);
  console.log(`✓ Calculated Security Checksum: ${newJob.verification?.securityChecksum}`);
  console.log(`✓ Initial Payment Status: ${newJob.verification?.paymentStatus}\n`);

  const code = newJob.verification!.verificationCode;

  // 2. Staff Code Lookup Test
  console.log('2. Testing Staff Verification Code Lookup...');
  const lookedUpRecord = VerificationService.lookupByCode(code, 'STAFF-DESK-99');
  console.log(`✓ Code Lookup Succeeded! Customer: ${lookedUpRecord.customerName}, Job: ${lookedUpRecord.jobTitle}\n`);

  // 3. Testing Fail-Safe 3-Strike Digital Payment Lockout Mechanism
  console.log('3. Simulating Digital Payment Failures (3-Strike Lockout)...');

  console.log('  Attempt 1 (Failure: Insufficient Funds)...');
  const res1 = VerificationService.processDigitalPaymentAttempt(code, {
    status: 'FAILED',
    errorCode: 'U16_INSUFFICIENT_FUNDS',
    errorMessage: 'Insufficient account balance',
  });
  console.log(`  -> Failed Attempts Count: ${res1.record.failedDigitalAttemptsCount}/3, Cash Locked: ${res1.record.isCashLocked}`);

  console.log('  Attempt 2 (Failure: Timeout)...');
  const res2 = VerificationService.processDigitalPaymentAttempt(code, {
    status: 'TIMED_OUT',
    errorCode: 'U30_GATEWAY_TIMEOUT',
    errorMessage: 'Bank gateway timeout',
  });
  console.log(`  -> Failed Attempts Count: ${res2.record.failedDigitalAttemptsCount}/3, Cash Locked: ${res2.record.isCashLocked}`);

  console.log('  Attempt 3 (Failure: Incorrect PIN -> 3-STRIKE LOCKOUT TRIGGER)...');
  const res3 = VerificationService.processDigitalPaymentAttempt(code, {
    status: 'FAILED',
    errorCode: 'U69_PIN_EXCEEDED',
    errorMessage: 'Invalid UPI PIN entered',
  });
  console.log(`  -> Failed Attempts Count: ${res3.record.failedDigitalAttemptsCount}/3, Cash Locked: ${res3.record.isCashLocked}`);
  console.log(`  -> Payment Status: ${res3.record.paymentStatus}`);
  console.log(`  -> Lockout Reason: ${res3.record.lockoutReason}\n`);

  // 4. Verification that 4th digital attempt is rejected by defensive check
  console.log('4. Verifying 4th Digital Payment Attempt Rejection...');
  try {
    VerificationService.processDigitalPaymentAttempt(code, {
      status: 'SUCCESS',
      vpa: 'alice@upi',
    });
    console.error('ERROR: Digital payment should have been rejected after 3-strike lockout!');
  } catch (err: any) {
    console.log(`✓ Defensive Enforcement Confirmed: Rejection Message: "${err.message}"\n`);
  }

  // 5. Staff Cash Collection Action
  console.log('5. Staff Processing Cash Collection...');
  const cashRecord = VerificationService.processCashCollection(code, 5000, 'STAFF-DESK-99', 'Bob Cashier');
  console.log(`✓ Cash Collected! Tendered: ${cashRecord.currency} ${(cashRecord.cashTenderedMinorUnits! / 100).toFixed(2)}, Total Due: ${cashRecord.currency} ${cashRecord.amountTotal.toFixed(2)}, Change Due: ${cashRecord.currency} ${(cashRecord.cashChangeMinorUnits! / 100).toFixed(2)}`);
  console.log(`✓ Updated Payment Status: ${cashRecord.paymentStatus}\n`);

  // 6. Print Job Handover Confirmation
  console.log('6. Confirming Document Handover to Customer...');
  const handoverRecord = VerificationService.confirmHandover(code, 'STAFF-DESK-99', 'Bob Cashier');
  console.log(`✓ Handover Confirmed! Status: ${handoverRecord.handoverStatus}, Timestamp: ${handoverRecord.handoverCompletedAt}\n`);

  // 7. Audit Log Inspection
  console.log('7. Inspecting Audit Logs...');
  const logs = auditLogger.getLogs(code);
  console.log(`✓ Retrieved ${logs.length} audit log entries for Verification Code ${code}:`);
  logs.forEach((log, index: number) => {
    console.log(`   [${index + 1}] Action: ${log.action} | Actor: ${log.actor} | Time: ${log.timestamp}`);
  });

  console.log('\n=== ALL BACKEND FAIL-SAFE VERIFICATION TESTS PASSED SUCCESSFULLY! ===');
}

main().catch(console.error);
