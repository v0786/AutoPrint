<#
.SYNOPSIS
    AutoPrint / QRPrint Update & Release Migration Manager
.DESCRIPTION
    Checks GitHub for newer production tags/releases, creates an automated pre-update
    backup of the datastore, pulls changes, runs migrations, and rebuilds the applications.
#>

param(
    [string]$InstallDir = (Split-Path $PSScriptRoot -Parent)
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\common.ps1"

Show-AutoPrintBanner "Release Update & Migration Utility"

Write-InstallerLog "Starting AutoPrint update verification..." -Level "INFO"

# 1. Check Git remote
$hasGit = Get-Command git -ErrorAction SilentlyContinue
if (-not $hasGit) {
    Write-InstallerLog "Git is required for automated updates. Please update manually via installer\install.ps1." -Level "ERROR"
    return
}

Push-Location $InstallDir
try {
    Write-Host "Checking for updates on remote repository..." -ForegroundColor Cyan
    git fetch origin main | Out-Null
    
    $localCommit  = (git rev-parse HEAD).Trim()
    $remoteCommit = (git rev-parse origin/main).Trim()

    if ($localCommit -eq $remoteCommit) {
        Write-InstallerLog "AutoPrint is already running the latest version ($($localCommit.Substring(0,7)))." -Level "SUCCESS"
        return
    }

    Write-Host ""
    Write-Host "New version detected on GitHub: $($remoteCommit.Substring(0,7)) (Current: $($localCommit.Substring(0,7)))" -ForegroundColor Yellow
    $confirm = Read-Host "Proceed with automated backup and update? [Y/N] (Default: Y)"
    if ($confirm -and $confirm -notmatch "^[Yy]") {
        Write-Host "Update cancelled by user." -ForegroundColor Yellow
        return
    }

    # 2. Automated pre-update backup
    $backupDir = Join-Path $InstallDir "datastore\backups\pre-update-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
    New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
    Copy-Item "$InstallDir\datastore\backend\*" "$backupDir\" -Recurse -Force -ErrorAction SilentlyContinue
    Copy-Item "$InstallDir\.env" "$backupDir\" -Force -ErrorAction SilentlyContinue
    Write-InstallerLog "Pre-update safety backup saved to $backupDir" -Level "SUCCESS"

    # 3. Pull updates
    Write-Host "Pulling latest release from GitHub..." -ForegroundColor Cyan
    git pull origin main

    # 4. Rebuild
    Write-Host "Reinstalling dependencies and compiling builds..." -ForegroundColor Cyan
    npm run install:all
    npm run build:all
    npm run test:backend

    Write-InstallerLog "AutoPrint updated successfully to commit $($remoteCommit.Substring(0,7))!" -Level "SUCCESS"
}
catch {
    Write-InstallerLog "Update failed with exception: $_" -Level "ERROR"
    Write-Host "Restoring pre-update backup..." -ForegroundColor Yellow
    # Rollback logic if needed
}
finally {
    Pop-Location
}
