const Database = require('../app/backend/node_modules/better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPaths = [
  'C:\\ProgramData\\AutoPrint\\datastore\\backend\\database\\autoprint.db',
  path.resolve(__dirname, '../datastore/backend/database/autoprint.db')
];

for (const dbPath of dbPaths) {
  if (fs.existsSync(dbPath)) {
    console.log(`\n=== DATABASE: ${dbPath} ===`);
    const db = new Database(dbPath);
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
    for (const t of tables) {
      try {
        const count = db.prepare(`SELECT COUNT(*) as c FROM "${t.name}"`).get().c;
        console.log(`  ${t.name}: ${count}`);
      } catch (e) {
        console.log(`  ${t.name}: error (${e.message})`);
      }
    }
    db.close();
  }
}
