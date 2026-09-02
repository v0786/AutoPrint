@echo off
setlocal

title AutoPrint Datastore Snapshot Backup Utility
cls

echo ===============================================================================
echo    AUTOPRINT / QRPRINT -- LOCAL DATASTORE BACKUP UTILITY
echo ===============================================================================
echo.

powershell -NoProfile -Command "
`$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss';
`$backupDir = 'datastore\backups\manual-backup-' + `$timestamp;
New-Item -ItemType Directory -Path `$backupDir -Force | Out-Null;

if (Test-Path 'datastore\database') {
    Copy-Item 'datastore\database\*' `$backupDir\ -Recurse -Force -ErrorAction SilentlyContinue;
}
if (Test-Path 'datastore\audit-logs') {
    Copy-Item 'datastore\audit-logs\*' `$backupDir\ -Recurse -Force -ErrorAction SilentlyContinue;
}
if (Test-Path '.env') {
    Copy-Item '.env' `$backupDir\ -Force -ErrorAction SilentlyContinue;
}

Write-Host ('[SUCCESS] Safety backup created successfully at: ' + `$backupDir) -ForegroundColor Green;
"

echo.
pause
