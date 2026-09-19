const Database = require('../app/backend/node_modules/better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPaths = [
  'C:\\ProgramData\\AutoPrint\\datastore\\backend\\database\\autoprint.db',
  path.resolve(__dirname, '../datastore/backend/database/autoprint.db')
];

console.log('=== RESETTING AUTOPRINT OPERATIONAL STATE TO ZERO ===');

for (const dbPath of dbPaths) {
  if (fs.existsSync(dbPath)) {
    console.log(`Resetting: ${dbPath}`);
    const db = new Database(dbPath);
    try {
      db.transaction(() => {
        // Operational tables
        db.exec(`
          DELETE FROM audit_logs;
          DELETE FROM payment_attempts;
          DELETE FROM verification_records;
          DELETE FROM print_jobs;
          DELETE FROM print_job_status_history;
          DELETE FROM refund_requests;
          DELETE FROM customer_feedback;
          DELETE FROM support_tickets;
          DELETE FROM support_ticket_history;
          DELETE FROM support_sync_queue;
          DELETE FROM diagnostic_attachments;
          UPDATE job_sequence SET seq = 1000 WHERE id = 1;
        `);
      })();

      console.log('Verification counts:');
      console.log('  print_jobs:', db.prepare('SELECT COUNT(*) as c FROM print_jobs').get().c);
      console.log('  verification_records:', db.prepare('SELECT COUNT(*) as c FROM verification_records').get().c);
      console.log('  audit_logs:', db.prepare('SELECT COUNT(*) as c FROM audit_logs').get().c);
      console.log('  refund_requests:', db.prepare('SELECT COUNT(*) as c FROM refund_requests').get().c);
      console.log('  customer_feedback:', db.prepare('SELECT COUNT(*) as c FROM customer_feedback').get().c);
      console.log('  support_tickets:', db.prepare('SELECT COUNT(*) as c FROM support_tickets').get().c);
      console.log('  merchants preserved:', db.prepare('SELECT COUNT(*) as c FROM merchants').get().c);
      console.log('  sessions preserved:', db.prepare('SELECT COUNT(*) as c FROM merchant_sessions').get().c);
    } catch (err) {
      console.error('Error resetting:', err.message);
    } finally {
      db.close();
    }
  }
}

// Clean uploads directory
const uploadsDir = path.resolve(__dirname, '../uploads');
if (fs.existsSync(uploadsDir)) {
  const files = fs.readdirSync(uploadsDir);
  for (const file of files) {
    if (file !== '.gitkeep') {
      try {
        fs.unlinkSync(path.join(uploadsDir, file));
      } catch {}
    }
  }
  console.log(`Cleaned ${files.length} files from uploads directory.`);
}

console.log('[SUCCESS] All operational metrics and dashboard reset to zero!');
