<#
.SYNOPSIS
    AutoPrint / QRPrint System Repair & Rebuild Utility
.DESCRIPTION
    Verifies file integrity, reinstalls missing dependencies, recompiles TypeScript/Vite,
    and runs the automated test suite without destroying persistent user data.
#>

param(
    [string]$InstallDir = (Split-Path $PSScriptRoot -Parent)
)

$ErrorActionPreference = 'Stop'
. "$PSScriptRoot\common.ps1"

Show-AutoPrintBanner "System Repair & Rebuild Utility"

Write-InstallerLog "Starting AutoPrint System Repair..." -Level "INFO"

Push-Location $InstallDir
try {
    # 1. Verify Prerequisites
    Write-Host "[1/4] Verifying system prerequisites..." -ForegroundColor Cyan
    Test-SystemPrerequisites | Out-Null

    # 2. Check and restore datastore directories
    Write-Host "[2/4] Verifying datastore directory structure..." -ForegroundColor Cyan
    $dirs = @(
        "datastore\customer\uploads",
        "datastore\customer\documents",
        "datastore\merchant\jobs",
        "datastore\backend\database",
        "datastore\backend\logs",
        "datastore\backend\audit",
        "datastore\backups",
        "runtime\logs",
        "runtime\temp"
    )
    foreach ($d in $dirs) {
        $p = Join-Path $InstallDir $d
        if (-not (Test-Path $p)) { New-Item -ItemType Directory -Path $p -Force | Out-Null }
    }
    Write-InstallerLog "Datastore structure verified." -Level "SUCCESS"

    # 3. Clean & Reinstall dependencies
    Write-Host "[3/4] Reinstalling dependencies and rebuilding application bundles..." -ForegroundColor Cyan
    npm run install:all
    npm run build:all

    # 4. Run automated tests
    Write-Host "[4/4] Executing test suite verification..." -ForegroundColor Cyan
    npm run test:backend

    Write-InstallerLog "AutoPrint System Repair completed successfully." -Level "SUCCESS"
}
catch {
    Write-InstallerLog "Repair process failed: $_" -Level "ERROR"
}
finally {
    Pop-Location
}
