const Database = require('../app/backend/node_modules/better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../datastore/backend/database/autoprint.db');
const db = new Database(dbPath);

console.log('[RESET] Creating true fresh production state (Zero Merchants, Zero Jobs, Zero Logs)...');
db.transaction(() => {
  db.exec(`
    DELETE FROM audit_logs;
    DELETE FROM payment_attempts;
    DELETE FROM verification_records;
    DELETE FROM print_jobs;
    DELETE FROM merchant_sessions;
    DELETE FROM payment_config;
    DELETE FROM merchants;
    UPDATE job_sequence SET seq = 1000 WHERE id = 1;
  `);
})();

console.log('[RESET] Verification:');
console.log('  merchants count:', db.prepare('SELECT COUNT(*) as c FROM merchants').get().c);
console.log('  print_jobs count:', db.prepare('SELECT COUNT(*) as c FROM print_jobs').get().c);
console.log('  audit_logs count:', db.prepare('SELECT COUNT(*) as c FROM audit_logs').get().c);
db.close();
console.log('[RESET] Fresh installation simulation ready.');
