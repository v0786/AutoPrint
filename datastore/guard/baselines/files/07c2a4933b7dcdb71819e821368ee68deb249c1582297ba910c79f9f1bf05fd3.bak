@echo off
setlocal
title AutoPrint Datastore Snapshot Backup Utility
color 0B
cls

echo ===============================================================================
echo          AUTOPRINT PRINT SHOP OPERATING SYSTEM — DATASTORE BACKUP
echo ===============================================================================
echo.

powershell -NoProfile -Command "
`$timestamp = Get-Date -Format 'yyyyMMdd-HHmmss';
`$backupDir = 'datastore\backups\backup-' + `$timestamp;
New-Item -ItemType Directory -Path `$backupDir -Force | Out-Null;

if (Test-Path 'datastore\backend\database') {
    New-Item -ItemType Directory -Path (`$backupDir + '\database') -Force | Out-Null;
    Copy-Item 'datastore\backend\database\*' (`$backupDir + '\database\') -Recurse -Force -ErrorAction SilentlyContinue;
}
if (Test-Path 'datastore\backend\audit') {
    New-Item -ItemType Directory -Path (`$backupDir + '\audit') -Force | Out-Null;
    Copy-Item 'datastore\backend\audit\*' (`$backupDir + '\audit\') -Recurse -Force -ErrorAction SilentlyContinue;
}
if (Test-Path '.env') {
    Copy-Item '.env' (`$backupDir + '\') -Force -ErrorAction SilentlyContinue;
}

Write-Host ('[SUCCESS] Datastore backup created successfully at: ' + `$backupDir) -ForegroundColor Green;
`$files = Get-ChildItem `$backupDir -Recurse -File;
Write-Host ('[INFO] Backed up ' + `$files.Count + ' file(s).') -ForegroundColor Cyan;
"

echo.
pause
