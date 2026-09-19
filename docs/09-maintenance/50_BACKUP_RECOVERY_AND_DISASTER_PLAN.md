# AutoPrint — Backup, Recovery & Disaster Recovery Plan

**Document ID**: 09-50  
**Category**: Maintenance  

---

## 1. Automated Local Database Backup

AutoPrint incorporates a safe SQLite backup mechanism that creates consistent snapshot backups without locking the active database:

1. **Trigger**: Executes automatically every 24 hours at 02:00 local time or on merchant demand via Settings.
2. **Snapshot Mechanism**: Uses SQLite Online Backup API (`VACUUM INTO '<BackupPath>'`), ensuring point-in-time consistency even while customer jobs are being written.
3. **Backup Directory**: `C:\ProgramData\AutoPrint\datastore\backups\`.
4. **Retention**: Keeps the 7 most recent daily snapshots; older backups are automatically pruned.
5. **Content**: Backs up `autoprint.db` (job history, pricing rates, printer configurations). Customer files in `uploads/` are intentionally **excluded** to conserve storage and preserve privacy.

---

## 2. Disaster Recovery Scenarios

### 2.1 Sudden Power Outage / PC Shutdown Mid-Print
* **Behavior**: Upon machine reboot, `AutoPrint.exe` restarts automatically via the Windows Startup folder.
* **State Recovery**: Backend reads `autoprint.db`. Any jobs caught in `SPOOLING` state are inspected:
  * If the spooler did not finish, the job status moves to `FAILED`.
  * The Merchant Dashboard flags the job with a yellow warning: *"PC restarted during printing. Please verify if sheets were printed before retrying."*

### 2.2 Database File Corruption
1. Stop AutoPrint via system tray Exit.
2. Navigate to `C:\ProgramData\AutoPrint\datastore\backend\database\`.
3. Rename corrupted `autoprint.db` to `autoprint.db.corrupt`.
4. Copy the latest valid snapshot from `C:\ProgramData\AutoPrint\datastore\backups\autoprint_backup_YYYYMMDD.db` and rename to `autoprint.db`.
5. Restart AutoPrint.
