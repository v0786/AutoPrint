# AutoPrint / QRPrint — Backup & Disaster Recovery Manual

## 1. Creating a Manual Backup

### Via Installer Utility:
```cmd
installer\backup.cmd
```

### Via PowerShell:
```powershell
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$dest = "datastore\backups\backup-$timestamp"
New-Item -ItemType Directory -Path $dest -Force
Copy-Item "datastore\backend\*" "$dest\backend\" -Recurse -Force
Copy-Item ".env" "$dest\.env" -Force
Write-Host "Backup created at $dest" -ForegroundColor Green
```

---

## 2. Restoring from a Backup

### Via Restore Utility:
```cmd
installer\restore.cmd
```
The utility will list available timestamped folders in `datastore/backups/`, prompt for selection, and safely restore the database and `.env` configuration.

---

## 3. Disaster Recovery Scenario: Full Database Reconstruction
If the primary SQLite file (`datastore/backend/database/autoprint.db`) becomes corrupted:
1. Stop running services (`scripts\stop-all.cmd`).
2. Run `installer\restore.cmd` and select the most recent valid backup.
3. Verify integrity with `scripts\health-check.cmd`.
4. Restart services with `scripts\start-all.cmd`.
