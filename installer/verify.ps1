<#
.SYNOPSIS
    AutoPrint / QRPrint Integrity & Verification Runner
.DESCRIPTION
    Runs backend health diagnostics and executes the automated lifecycle test suite.
#>

param(
    [string]$InstallDir = (Split-Path $PSScriptRoot -Parent),
    [int]$BackendPort = 5000
)

. "$PSScriptRoot\common.ps1"

Show-AutoPrintBanner "Integrity & Health Verification"

Write-Host "1. Querying Backend Health Endpoint (http://localhost:$BackendPort/health)..." -ForegroundColor Cyan
try {
    $health = Invoke-RestMethod -Uri "http://localhost:$BackendPort/health" -TimeoutSec 3
    Write-Host "   Backend Service: ONLINE" -ForegroundColor Green
    Write-Host "   Database Status: $($health.database.status)" -ForegroundColor Gray
    Write-Host "   Uptime         : $([math]::Round($health.uptime, 2)) seconds" -ForegroundColor Gray
} catch {
    Write-Host "   Backend Service is currently OFFLINE or running on a different port." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "2. Running Backend Test Suite..." -ForegroundColor Cyan
Push-Location $InstallDir
try {
    npm run test:backend
} catch {
    Write-Host "   Test execution error: $_" -ForegroundColor Red
} finally {
    Pop-Location
}
