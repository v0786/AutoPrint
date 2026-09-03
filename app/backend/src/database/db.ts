/**
 * SQLite Database — Schema definition and migration runner
 * Uses better-sqlite3 for synchronous, zero-config SQLite on Windows.
 */

import Database from 'better-sqlite3';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { PATHS, ensureDataDirectories } from '../config/environment';

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return _db;
}

export function initDatabase(): void {
  ensureDataDirectories();

  _db = new Database(PATHS.DB_FILE, {
    verbose: process.env.NODE_ENV === 'development'
      ? (msg: unknown) => {
          if (typeof msg === 'string' && msg.length < 500) {
            // Only log short statements to avoid flooding console
          }
        }
      : undefined,
  });

  // WAL mode for better concurrent read/write performance
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');
  _db.pragma('synchronous = NORMAL');

  runMigrations(_db);

  console.log(`[DB] SQLite initialized at: ${PATHS.DB_FILE}`);
}

export function closeDatabase(): void {
  if (_db) {
    _db.close();
    _db = null;
    console.log('[DB] SQLite connection closed.');
  }
}

// ─── Schema Migration ─────────────────────────────────────────────────────────

const SCHEMA_VERSION = 4;

function runMigrations(db: Database.Database): void {
  // Create migration tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version   INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const currentVersion = (
    db.prepare('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1').get() as { version: number } | undefined
  )?.version ?? 0;

  if (currentVersion < 1) {
    const migrate1 = db.transaction(() => {
      runMigration1(db);
      db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(1);
    });
    migrate1();
    console.log('[DB] Applied migration 1');
  }

  if (currentVersion < 2) {
    const migrate2 = db.transaction(() => {
      runMigration2(db);
      db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(2);
    });
    migrate2();
    console.log('[DB] Applied migration 2 (Merchant Onboarding, Sessions, Payment Config)');
  }

  if (currentVersion < 3) {
    const migrate3 = db.transaction(() => {
      runMigration3(db);
      db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(3);
    });
    migrate3();
    console.log('[DB] Applied migration 3 (Photo Rates & Custom Rate Specifications)');
  }

  if (currentVersion < 4) {
    const migrate4 = db.transaction(() => {
      runMigration4(db);
      db.prepare('INSERT INTO schema_migrations (version) VALUES (?)').run(4);
    });
    migrate4();
    console.log('[DB] Applied migration 4 (Admin Credentials, User Management & RBAC)');
  }
}

function runMigration1(db: Database.Database): void {
  db.exec(`
    -- Print Jobs
    CREATE TABLE IF NOT EXISTS print_jobs (
      id                   TEXT PRIMARY KEY,
      job_no               TEXT NOT NULL UNIQUE,
      title                TEXT NOT NULL,
      file_name            TEXT NOT NULL,
      file_path            TEXT NOT NULL DEFAULT '',
      processed_file_path  TEXT,
      customer_name        TEXT NOT NULL,
      customer_phone       TEXT,
      printer_id           TEXT,
      printer_name         TEXT NOT NULL,
      color_mode           TEXT NOT NULL DEFAULT 'bw',
      copies               INTEGER NOT NULL DEFAULT 1,
      page_range           TEXT NOT NULL DEFAULT 'all',
      paper_size           TEXT DEFAULT 'a4',
      duplex               TEXT DEFAULT 'single',
      finishing            TEXT DEFAULT 'none',
      amount_minor_units   INTEGER NOT NULL,
      currency             TEXT NOT NULL DEFAULT 'INR',
      payment_method       TEXT NOT NULL,
      status               TEXT NOT NULL DEFAULT 'CREATED',
      created_at           TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_jobs_status ON print_jobs(status);
    CREATE INDEX IF NOT EXISTS idx_jobs_created ON print_jobs(created_at DESC);

    -- Job sequence counter (for #NNNN job numbers)
    CREATE TABLE IF NOT EXISTS job_sequence (
      id  INTEGER PRIMARY KEY,
      seq INTEGER NOT NULL DEFAULT 1000
    );
    INSERT OR IGNORE INTO job_sequence (id, seq) VALUES (1, 1000);

    -- Verification Records
    CREATE TABLE IF NOT EXISTS verification_records (
      verification_code            TEXT PRIMARY KEY,
      formatted_code               TEXT NOT NULL,
      job_id                       TEXT NOT NULL UNIQUE,
      job_no                       TEXT NOT NULL,
      job_title                    TEXT NOT NULL,
      printer_name                 TEXT NOT NULL,
      customer_name                TEXT NOT NULL,
      customer_phone               TEXT,
      amount_minor_units           INTEGER NOT NULL,
      currency                     TEXT NOT NULL DEFAULT 'INR',
      failed_digital_attempts      INTEGER NOT NULL DEFAULT 0,
      max_digital_attempts         INTEGER NOT NULL DEFAULT 3,
      is_cash_locked               INTEGER NOT NULL DEFAULT 0,
      lockout_reason               TEXT,
      payment_status               TEXT NOT NULL DEFAULT 'PENDING',
      upi_transaction_id           TEXT,
      upi_payer_vpa                TEXT,
      cash_tendered_minor_units    INTEGER,
      cash_change_minor_units      INTEGER,
      handover_status              TEXT NOT NULL DEFAULT 'PENDING_PRINT',
      handover_completed_at        TEXT,
      verified_by_staff_id         TEXT,
      verified_by_staff_name       TEXT,
      security_checksum            TEXT NOT NULL,
      created_at                   TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at                   TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (job_id) REFERENCES print_jobs(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_ver_job_id ON verification_records(job_id);
    CREATE INDEX IF NOT EXISTS idx_ver_payment_status ON verification_records(payment_status);

    -- Payment Attempts
    CREATE TABLE IF NOT EXISTS payment_attempts (
      attempt_id            TEXT PRIMARY KEY,
      verification_code     TEXT NOT NULL,
      attempt_number        INTEGER NOT NULL,
      timestamp             TEXT NOT NULL DEFAULT (datetime('now')),
      method                TEXT NOT NULL,
      amount_minor_units    INTEGER NOT NULL,
      currency              TEXT NOT NULL,
      status                TEXT NOT NULL,
      gateway_ref           TEXT,
      vpa                   TEXT,
      error_code            TEXT,
      error_message         TEXT,
      FOREIGN KEY (verification_code) REFERENCES verification_records(verification_code) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_attempts_code ON payment_attempts(verification_code);

    -- Audit Logs (append-only)
    CREATE TABLE IF NOT EXISTS audit_logs (
      id                    TEXT PRIMARY KEY,
      timestamp             TEXT NOT NULL DEFAULT (datetime('now')),
      verification_code     TEXT NOT NULL,
      job_id                TEXT NOT NULL,
      job_no                TEXT NOT NULL,
      action                TEXT NOT NULL,
      actor                 TEXT NOT NULL,
      staff_id              TEXT,
      staff_name            TEXT,
      ip_address_or_station TEXT NOT NULL DEFAULT 'BACKEND-CORE-NODE',
      details               TEXT NOT NULL DEFAULT '{}'
    );

    CREATE INDEX IF NOT EXISTS idx_audit_code ON audit_logs(verification_code);
    CREATE INDEX IF NOT EXISTS idx_audit_job  ON audit_logs(job_id);
    CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(timestamp DESC);
  `);
}

function runMigration2(db: Database.Database): void {
  db.exec(`
    -- Merchants Profile & Credentials Table
    CREATE TABLE IF NOT EXISTS merchants (
      id                   TEXT PRIMARY KEY,
      shop_name            TEXT NOT NULL,
      owner_name           TEXT NOT NULL,
      email                TEXT UNIQUE NOT NULL,
      phone                TEXT,
      password_hash        TEXT NOT NULL,
      password_salt        TEXT NOT NULL,
      address              TEXT NOT NULL DEFAULT '',
      branch               TEXT NOT NULL DEFAULT 'Main Counter',
      kiosk_number         TEXT NOT NULL DEFAULT 'Counter #01',
      upi_id               TEXT,
      upi_qr_data_url      TEXT,
      selected_printer     TEXT NOT NULL DEFAULT 'AutoPrint Virtual Spooler',
      color_price_per_page INTEGER NOT NULL DEFAULT 1000, -- 10.00 INR
      bw_price_per_page    INTEGER NOT NULL DEFAULT 200,  -- 2.00 INR
      is_onboarded         INTEGER NOT NULL DEFAULT 1,
      is_online            INTEGER NOT NULL DEFAULT 1,
      created_at           TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_merchant_email ON merchants(email);

    -- Merchant Persistent Sessions Table ("Keep me signed in")
    CREATE TABLE IF NOT EXISTS merchant_sessions (
      token                TEXT PRIMARY KEY,
      merchant_id          TEXT NOT NULL,
      created_at           TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at           TEXT NOT NULL,
      FOREIGN KEY (merchant_id) REFERENCES merchants(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sessions_merchant ON merchant_sessions(merchant_id);

    -- Payment Receiver Configuration (UPI, Custom QR, Razorpay / Gateway)
    CREATE TABLE IF NOT EXISTS payment_config (
      id                   TEXT PRIMARY KEY,
      merchant_id          TEXT,
      provider             TEXT NOT NULL DEFAULT 'UPI_DIRECT',
      upi_id               TEXT,
      upi_payee_name       TEXT,
      upi_qr_data_url      TEXT,
      razorpay_key_id      TEXT,
      razorpay_key_secret  TEXT,
      is_active            INTEGER NOT NULL DEFAULT 1,
      created_at           TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at           TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function runMigration3(db: Database.Database): void {
  // Add photo_price_per_page and rates_json columns to merchants table if not existing
  const columns = db.prepare("PRAGMA table_info(merchants)").all() as Array<{ name: string }>;
  const colNames = new Set(columns.map((c) => c.name));

  if (!colNames.has('photo_price_per_page')) {
    db.exec(`ALTER TABLE merchants ADD COLUMN photo_price_per_page INTEGER NOT NULL DEFAULT 2500;`);
  }
  if (!colNames.has('rates_json')) {
    db.exec(`ALTER TABLE merchants ADD COLUMN rates_json TEXT;`);
  }
}

function runMigration4(db: Database.Database): void {
  // 1. Add username, role, is_active to merchants table
  const columns = db.prepare("PRAGMA table_info(merchants)").all() as Array<{ name: string }>;
  const colNames = new Set(columns.map((c) => c.name));

  if (!colNames.has('username')) {
    db.exec(`ALTER TABLE merchants ADD COLUMN username TEXT;`);
  }
  if (!colNames.has('role')) {
    db.exec(`ALTER TABLE merchants ADD COLUMN role TEXT NOT NULL DEFAULT 'staff';`);
  }
  if (!colNames.has('is_active')) {
    db.exec(`ALTER TABLE merchants ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;`);
  }

  db.exec(`CREATE INDEX IF NOT EXISTS idx_merchants_username ON merchants(username);`);
}