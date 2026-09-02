# AutoPrint / QRPrint — Datastore Specification & Lifecycle

The `datastore/` directory houses all persistent runtime state for the AutoPrint application, separated from source code.

## Directory Structure

```
datastore/
├── customer/
│   ├── uploads/               # Original files uploaded by customers (PDF, DOCX, IMG)
│   └── documents/             # Stamped & watermarked PDFs ready for physical printing
│
├── merchant/
│   ├── jobs/                  # Exported merchant reports and batch job summaries
│   ├── transactions/          # Transaction history archives
│   └── cash/                  # Cash drawer reconciliation records
│
├── backend/
│   ├── database/
│   │   ├── autoprint.db       # Primary SQLite 3 Database (WAL mode)
│   │   ├── autoprint.db-shm   # Shared-memory index file
│   │   └── autoprint.db-wal   # Write-Ahead Log
│   ├── audit/                 # Append-only audit logs for security compliance
│   └── logs/                  # Application runtime error and access logs
│
├── connectors/                # Connector runtime cache and spooler queue buffers
├── backups/                   # Automated timestamped database and config backups
└── temp/                      # Ephemeral multipart upload scratch space
```

---

## Retention & Backup Policies
1. **Automated Backups**: Backups are created automatically before every install, repair, or upgrade inside `datastore/backups/backup-YYYYMMDD-HHMMSS/`.
2. **Safe Uninstallation**: The uninstaller preserves `datastore/` by default unless explicitly confirmed by the operator.
3. **Immutability**: Audit logs in `backend/audit` and verification checksums are append-only.
