@echo off
setlocal

title AutoPrint Datastore Snapshot Restore Utility
cls

echo ===============================================================================
echo    AUTOPRINT / QRPRINT -- LOCAL DATASTORE RESTORE UTILITY
echo ===============================================================================
echo.

powershell -NoProfile -Command "
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
    Write-Host ('Restoring from: ' + `$selected.FullName) -ForegroundColor Yellow;
    `$confirm = Read-Host 'Are you sure you want to overwrite the current database? [Y/N]';
    if (`$confirm -match '^[Yy]') {
        Copy-Item (`$selected.FullName + '\*') 'datastore\database\' -Recurse -Force;
        Write-Host '[SUCCESS] Datastore successfully restored!' -ForegroundColor Green;
    } else {
        Write-Host 'Restore operation cancelled.' -ForegroundColor Gray;
    }
} else {
    Write-Host 'Invalid selection.' -ForegroundColor Red;
}
"

echo.
pause
