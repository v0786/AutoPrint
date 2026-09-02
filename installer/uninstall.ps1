<#
.SYNOPSIS
    AutoPrint / QRPrint Safe Application Uninstaller
.DESCRIPTION
    Safely removes built application bundles and services while defaulting to
    preserving persistent customer datastore files, audit logs, and backups.
#>

param(
    [string]$InstallDir = (Split-Path $PSScriptRoot -Parent)
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\common.ps1"

Show-AutoPrintBanner "Safe Application Uninstaller"

Write-Host "WARNING: This utility will stop running AutoPrint services and remove compiled application binaries." -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Are you sure you want to uninstall AutoPrint? [Y/N] (Default: N)"
if ($confirm -notmatch "^[Yy]") {
    Write-Host "Uninstallation aborted." -ForegroundColor Green
    return
}

# 1. Automated safety backup
$backupDir = Join-Path $InstallDir "datastore\backups\pre-uninstall-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
Copy-Item "$InstallDir\datastore\backend\*" "$backupDir\" -Recurse -Force -ErrorAction SilentlyContinue
Copy-Item "$InstallDir\.env" "$backupDir\" -Force -ErrorAction SilentlyContinue
Write-InstallerLog "Safety backup created before uninstall at: $backupDir" -Level "SUCCESS"

# 2. Stop running services
Write-Host "Stopping AutoPrint background processes..." -ForegroundColor Cyan
Stop-Process -Name "node" -ErrorAction SilentlyContinue

# 3. Clean build output
Write-Host "Removing compiled application build artifacts..." -ForegroundColor Cyan
Remove-Item "$InstallDir\app\backend\dist" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$InstallDir\app\customer-web\dist" -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item "$InstallDir\app\merchant-desktop\dist" -Recurse -Force -ErrorAction SilentlyContinue

# 4. Remove Desktop Shortcuts
$desktopDir = [Environment]::GetFolderPath("Desktop")
$shortcut = Join-Path $desktopDir "AutoPrint Manager.lnk"
if (Test-Path $shortcut) {
    Remove-Item $shortcut -Force -ErrorAction SilentlyContinue
    Write-InstallerLog "Removed desktop shortcut." -Level "INFO"
}

# 5. Datastore Preservation
Write-Host ""
Write-Host "-------------------------------------------------------------------------------" -ForegroundColor White
Write-Host "  DATASTORE RETENTION" -ForegroundColor Cyan
Write-Host "-------------------------------------------------------------------------------" -ForegroundColor White
Write-Host "  Your persistent database, audit logs, and customer documents reside in:" -ForegroundColor Gray
Write-Host "    $InstallDir\datastore" -ForegroundColor White
Write-Host ""
$preserve = Read-Host "  Preserve persistent datastore files? [Y/N] (Default: Y - RECOMMENDED)"
if ([string]::IsNullOrWhiteSpace($preserve)) { $preserve = "Y" }

if ($preserve -notmatch "^[Yy]") {
    $confirmPurge = Read-Host "  CONFIRM PERMANENT DELETION OF ENTIRE DATASTORE? [Y/N] (Default: N)"
    if ($confirmPurge -match "^[Yy]") {
        Remove-Item "$InstallDir\datastore" -Recurse -Force -ErrorAction SilentlyContinue
        Write-InstallerLog "Datastore permanently removed." -Level "WARN"
    }
} else {
    Write-InstallerLog "Datastore preserved successfully." -Level "SUCCESS"
}

Write-Host ""
Write-Host "AutoPrint uninstallation completed." -ForegroundColor Green
Write-Host ""
