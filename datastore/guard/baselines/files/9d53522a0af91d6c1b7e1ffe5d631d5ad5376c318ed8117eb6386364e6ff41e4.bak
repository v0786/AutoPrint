# ==============================================================================
# QRPrint — Clean Build Workspace Script
# Removes intermediate build artifacts and staging payload
# ==============================================================================

param(
    [switch]$All = $false
)

$ErrorActionPreference = 'SilentlyContinue'
$rootDir = (Split-Path $PSScriptRoot -Parent)

Write-Host "Cleaning QRPrint build workspace..." -ForegroundColor Yellow

# Clean dist-installer staging payload
$payloadDir = Join-Path $rootDir "dist-installer\payload"
if (Test-Path $payloadDir) {
    Remove-Item $payloadDir -Recurse -Force
    Write-Host "  Removed: dist-installer\payload" -ForegroundColor Gray
}

# Clean workspace build folders if requested
if ($All) {
    $backendDist = Join-Path $rootDir "app\backend\dist"
    $custDist = Join-Path $rootDir "app\customer-web\dist"
    $merchDist = Join-Path $rootDir "app\merchant-desktop\dist"

    if (Test-Path $backendDist) { Remove-Item $backendDist -Recurse -Force; Write-Host "  Removed: app/backend/dist" -ForegroundColor Gray }
    if (Test-Path $custDist) { Remove-Item $custDist -Recurse -Force; Write-Host "  Removed: app/customer-web/dist" -ForegroundColor Gray }
    if (Test-Path $merchDist) { Remove-Item $merchDist -Recurse -Force; Write-Host "  Removed: app/merchant-desktop/dist" -ForegroundColor Gray }
}

Write-Host "Workspace clean complete." -ForegroundColor Green
