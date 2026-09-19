# AutoPrint — Database Schema & Data Models

**Document ID**: 02-12  
**Category**: Design  
**Database Engine**: SQLite 3 with Write-Ahead Logging (`WAL`)  
**Storage Location**: `C:\ProgramData\AutoPrint\datastore\backend\database\autoprint.db`  

---

## 1. Schema DDL & Table Definitions

### 1.1 `print_jobs` Table
Stores primary job metadata, verification codes, and lifecycle statuses.
```sql
CREATE TABLE IF NOT EXISTS print_jobs (
    id TEXT PRIMARY KEY,                       -- Internal ID: AP-XXXXXXXX
    job_no TEXT,                               -- Friendly sequence: #1001
    verification_code TEXT UNIQUE NOT NULL,    -- 8-digit customer code: 48291039
    customer_name TEXT NOT NULL,               -- Entered customer name
    status TEXT NOT NULL DEFAULT 'QUEUED',     -- QUEUED, PRINTED, FAILED, COLLECTED, CANCELLED
    payment_status TEXT DEFAULT 'PENDING',     -- PENDING, PAID, CASH_HELD, REFUNDED
    print_status TEXT DEFAULT 'PENDING',       -- PENDING, SPOOLING, PRINTED, ERROR
    file_name TEXT NOT NULL,                   -- Stored filename in uploads/
    original_file_name TEXT NOT NULL,          -- User's original uploaded filename
    file_size INTEGER NOT NULL,                -- Size in bytes
    file_path TEXT NOT NULL,                   -- Absolute storage path
    page_count INTEGER NOT NULL DEFAULT 1,     -- Extracted page count
    copies INTEGER NOT NULL DEFAULT 1,         -- Number of copies requested
    color_mode TEXT NOT NULL DEFAULT 'BW',     -- BW or COLOR
    paper_format TEXT DEFAULT 'A4',            -- A4, A3, LETTER
    duplex_mode TEXT DEFAULT 'SINGLE',         -- SINGLE or DOUBLE
    page_range TEXT,                           -- Custom page ranges: '1-5, 8'
    total_price REAL NOT NULL DEFAULT 0.0,     -- Calculated price
    printer_name TEXT,                         -- Assigned target printer
    modification_required INTEGER DEFAULT 0,   -- 1 if customer requested editing
    print_settings_json TEXT,                  -- Complete normalized settings snapshot
    created_at TEXT NOT NULL,                  -- ISO timestamp
    updated_at TEXT NOT NULL                   -- ISO timestamp
);

CREATE INDEX IF NOT EXISTS idx_print_jobs_code ON print_jobs(verification_code);
CREATE INDEX IF NOT EXISTS idx_print_jobs_status ON print_jobs(status, created_at);
```

### 1.2 `merchants` & `merchant_credentials` Tables
```sql
CREATE TABLE IF NOT EXISTS merchants (
    id TEXT PRIMARY KEY,
    business_name TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    country TEXT NOT NULL DEFAULT 'IN',
    currency_symbol TEXT NOT NULL DEFAULT '₹',
    language TEXT NOT NULL DEFAULT 'en',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS merchant_credentials (
    merchant_id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,              -- Salted Argon2id / Scrypt hash
    recovery_code_hash TEXT NOT NULL,          -- Hash of emergency recovery key
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY(merchant_id) REFERENCES merchants(id)
);
```

### 1.3 `pricing_rules` Table
```sql
CREATE TABLE IF NOT EXISTS pricing_rules (
    id TEXT PRIMARY KEY,
    service_type TEXT NOT NULL,               -- 'PRINT_A4_BW', 'PRINT_A4_COLOR', etc.
    rate_per_unit REAL NOT NULL,              -- Price in configured currency
    duplex_discount REAL DEFAULT 0.0,         -- Optional discount for double-sided
    min_charge REAL DEFAULT 0.0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
```

### 1.4 `audit_logs` Table
```sql
CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,                 -- JOB_CREATED, CASH_COLLECTED, DOCUMENT_PURGED, etc.
    entity_id TEXT,
    actor TEXT NOT NULL,                      -- CUSTOMER, MERCHANT, SYSTEM
    details_json TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
```

---

## 2. Concurrency & Integrity Controls

1. **Write-Ahead Logging (`WAL`) Mode**:
   ```sql
   PRAGMA journal_mode = WAL;
   PRAGMA synchronous = NORMAL;
   PRAGMA busy_timeout = 5000;
   ```
   Ensures reads (merchant dashboard polling, customer status checks) never block writes (new job submissions, spooler status updates).
2. **Crash Resilience**:
   In the event of an abrupt power outage, transactions committed to the WAL are replayed automatically upon the next connection initialization.
