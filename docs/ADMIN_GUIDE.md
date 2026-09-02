# AutoPrint / QRPrint — System Administrator Operations Manual

This guide provides technical operations instructions for administrators managing AutoPrint print stations, servers, and kiosks.

---

## 1. System Maintenance Utilities

AutoPrint includes a modular utility suite in the `installer/` directory:

| Script | Purpose |
| :--- | :--- |
| `installer\install.ps1` | Full interactive setup wizard with port and directory configuration. |
| `installer\update.ps1` | Pulls latest release tags from GitHub, runs DB migrations, and rebuilds apps. |
| `installer\repair.ps1` | Re-verifies filesystem integrity, reinstalls missing dependencies, and rebuilds without wiping data. |
| `installer\verify.ps1` | Runs automated integrity tests and checks backend health endpoints. |
| `installer\uninstall.ps1` | Safe uninstaller that retains persistent customer datastore files by default. |

---

## 2. Port Management & Customization

The system default ports are:
* **Backend REST API Engine**: `5000`
* **Merchant Desktop Manager**: `6000`
* **Customer Web Kiosk**: `7000`

### Changing Ports:
Edit the `.env` file at the root of the installation:
```env
PORT=5000
MERCHANT_PORT=6000
CUSTOMER_PORT=7000
```
Then restart services:
```cmd
scripts\stop-all.cmd
scripts\start-all.cmd
```

---

## 3. Persistent Datastore Layout & Retention

All persistent state is isolated from source code inside the `datastore/` directory:

```
datastore/
├── customer/uploads/          # Original uploaded customer documents (PDF, DOCX, images)
├── customer/documents/        # Watermarked PDFs with OCR stamps ready for printing
├── merchant/jobs/             # Batch job records and exported shift reports
├── backend/database/          # Primary SQLite 3 Database (autoprint.db)
├── backend/audit/             # Append-only immutable compliance audit ledger
├── backend/logs/              # Application diagnostics and server error logs
└── backups/                   # Automated timestamped database and config snapshots
```

### Database Persistence:
* AutoPrint uses SQLite 3 with Write-Ahead Logging (`WAL` mode).
* Database files (`autoprint.db`, `autoprint.db-wal`, `autoprint.db-shm`) survive system restarts and power outages without transaction loss.

---

## 4. Backup & Disaster Recovery

### Automated Backups:
The system automatically creates a timestamped snapshot before every update, repair, or uninstall in:
`datastore\backups\backup-YYYYMMDD-HHMMSS\`

### Creating a Manual Backup:
```cmd
installer\backup.cmd
```

### Restoring from a Backup:
```cmd
installer\restore.cmd
```
Follow the interactive prompt to select the target backup snapshot.

---

## 5. Security & HMAC Secret Configuration

### Production Secret Key:
Before deploying to production, generate a secure, random string ($\ge 32$ characters) and set it in `.env`:
```env
HMAC_SECRET=d8f72a9e3b4c1059f81a7402e8d91c73b0542fae9681bc74e2d31950afbc8430
```
* **Security Model**: The HMAC secret is kept strictly server-side and is used to compute the physical verification watermark checksum (`SEC-XXXX-XXXX`). It is never exposed in client bundles or public endpoints.

---

## 6. Printer Hardware Spooler Management

* AutoPrint integrates directly with the native Windows Print Spooler (`winspool`).
* To change the active printer, update `DEFAULT_PRINTER` in `.env` or re-run `installer\install.ps1`.
* If a physical printer goes offline, AutoPrint queues documents safely with status `READY_IN_TRAY` without crashing or losing the print job.
