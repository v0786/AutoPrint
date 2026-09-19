@echo off
setlocal
title AutoPrint Datastore Snapshot Restore Utility
color 0E
cls

echo ===============================================================================
echo          AUTOPRINT PRINT SHOP OPERATING SYSTEM — DATASTORE RESTORE
echo ===============================================================================
echo.

powershell -NoProfile -Command "
if (-not (Test-Path 'datastore\backups')) {
    Write-Host '[ERROR] No datastore\backups directory found.' -ForegroundColor Red;
    exit;
}

`$backups = Get-ChildItem 'datastore\backups' -Directory | Sort-Object CreationTime -Descending;

if (`$backups.Count -eq 0) {
    Write-Host '[ERROR] No backup snapshots found in datastore\backups.' -ForegroundColor Red;
    exit;
}

Write-Host 'Available Datastore Snapshots:' -ForegroundColor White;
for (`$i = 0; `$i -lt `$backups.Count; `$i++) {
    Write-Host ('  [' + (`$i + 1) + '] ' + `$backups[`$i].Name + ' (' + `$backups[`$i].CreationTime.ToString('yyyy-MM-dd HH:mm:ss') + ')') -ForegroundColor Gray;
}
Write-Host '';

`$choice = Read-Host 'Select backup number to restore [1-' + `$backups.Count + ']';
if (`$choice -match '^\d+$' -and [int]`$choice -ge 1 -and [int]`$choice -le `$backups.Count) {
    `$selected = `$backups[[int]`$choice - 1];
    Write-Host ('`nRestoring from snapshot: ' + `$selected.FullName) -ForegroundColor Yellow;
    `$confirm = Read-Host 'Are you sure you want to restore? Current unbacked-up data will be replaced [Y/N]';
    if (`$confirm -match '^[Yy]') {
        # Restore database
        if (Test-Path (`$selected.FullName + '\database')) {
            New-Item -ItemType Directory -Path 'datastore\backend\database' -Force | Out-Null;
            Copy-Item (`$selected.FullName + '\database\*') 'datastore\backend\database\' -Recurse -Force;
        }
        # Restore audit
        if (Test-Path (`$selected.FullName + '\audit')) {
            New-Item -ItemType Directory -Path 'datastore\backend\audit' -Force | Out-Null;
            Copy-Item (`$selected.FullName + '\audit\*') 'datastore\backend\audit\' -Recurse -Force;
        }
        Write-Host '[SUCCESS] Datastore successfully restored from snapshot!' -ForegroundColor Green;
    } else {
        Write-Host 'Restore operation cancelled.' -ForegroundColor Gray;
    }
} else {
    Write-Host 'Invalid selection.' -ForegroundColor Red;
}
"

echo.
pause
