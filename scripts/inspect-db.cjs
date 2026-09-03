const Database = require('../app/backend/node_modules/better-sqlite3');
const path = require('path');

const dbPath = path.resolve(__dirname, '../datastore/backend/database/autoprint.db');
const db = new Database(dbPath);

console.log('=== DATABASE USERS & MERCHANTS ===');
const merchants = db.prepare("SELECT id, username, shop_name, owner_name, email, role, is_active, is_onboarded, password_hash, password_salt FROM merchants").all();
console.log(`Total merchants: ${merchants.length}`);
merchants.forEach(m => {
  console.log(`  User: ${m.username} | Email: ${m.email} | Role: ${m.role} | Active: ${m.is_active} | Onboarded: ${m.is_onboarded}`);
});
db.close();
