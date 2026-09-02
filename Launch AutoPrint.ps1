<#
.SYNOPSIS
    AutoPrint 1-Click PowerShell System Launcher
.DESCRIPTION
    Launches AutoPrint Backend, Customer Web, Merchant Desk, and PageKite Tunnel,
    then automatically opens the default web browser to both the Merchant Desk and Customer Kiosk interfaces.
#>

$ErrorActionPreference = 'SilentlyContinue'

$rootDir = Split-Path -Parent $PSCommandPath
if (-not $rootDir) { $rootDir = Get-Location }
Set-Location $rootDir

# Clean stale background processes
Stop-Process -Name "node" -Force -ErrorAction SilentlyContinue
Stop-Process -Name "python" -Force -ErrorAction SilentlyContinue

# Ensure runtime directories exist
New-Item -ItemType Directory -Force -Path "$rootDir\datastore\database", "$rootDir\datastore\generated\qr", "$rootDir\runtime\logs", "$rootDir\runtime\pid" | Out-Null

$backendPort = 5000
$merchantPort = 8000
$customerPort = 7000
$pagekiteEnabled = $true
$pagekiteName = "autoprint"
$pagekiteSecret = "xakd4af2azx229x94effe9az79262cxz"

if (Test-Path "$rootDir\.env") {
    Get-Content "$rootDir\.env" | ForEach-Object {
        if ($_ -match '^PORT=(\d+)') { $backendPort = [int]$matches[1] }
        if ($_ -match '^MERCHANT_PORT=(\d+)') { $merchantPort = [int]$matches[1] }
        if ($_ -match '^CUSTOMER_PORT=(\d+)') { $customerPort = [int]$matches[1] }
        if ($_ -match '^PAGEKITE_ENABLED=(.+)') { $pagekiteEnabled = ($matches[1].Trim() -eq 'true') }
        if ($_ -match '^PAGEKITE_NAME=(.+)') { $pagekiteName = $matches[1].Trim() }
        if ($_ -match '^PAGEKITE_SECRET=(.+)') { $pagekiteSecret = $matches[1].Trim() }
    }
}

Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "   AUTOPRINT / QRPRINT -- 1-CLICK SYSTEM LAUNCHER" -ForegroundColor White
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[1/4] Starting AutoPrint Backend REST API Engine (Port $backendPort)..." -ForegroundColor Gray
Start-Process node -ArgumentList "$rootDir\app\backend\dist\server.js" -WindowStyle Hidden

Write-Host "[2/4] Starting Customer Web Kiosk (Port $customerPort)..." -ForegroundColor Gray
Start-Process node -ArgumentList "$rootDir\app\customer-web\server.js" -WindowStyle Hidden

Write-Host "[3/4] Starting Merchant Desktop Desk (Port $merchantPort)..." -ForegroundColor Gray
Start-Process node -ArgumentList "$rootDir\app\merchant-desktop\server.js" -WindowStyle Hidden

if ($pagekiteEnabled) {
    Write-Host "[4/4] Starting PageKite Tunnel (https://$pagekiteName.pagekite.me)..." -ForegroundColor Gray
    Start-Process python -ArgumentList "$rootDir\scripts\pagekite.py", "--nossl", "--service_cfg=$pagekiteName.pagekite.me:$customerPort:$pagekiteSecret", "$customerPort", "$pagekiteName.pagekite.me" -WindowStyle Hidden
}

Write-Host ""
Write-Host "Waiting for services to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "[OK] Opening Web Browser to Merchant Desk & Customer Kiosk..." -ForegroundColor Green
Start-Process "http://localhost:$merchantPort"
Start-Process "http://localhost:$customerPort"

Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Green
Write-Host "   AUTOPRINT SERVICES ARE ONLINE!" -ForegroundColor White
Write-Host "===============================================================================" -ForegroundColor Green
Write-Host "   Merchant Desk  : http://localhost:$merchantPort" -ForegroundColor Cyan
Write-Host "   Customer Kiosk : http://localhost:$customerPort" -ForegroundColor Cyan
Write-Host "   Public Portal  : https://$pagekiteName.pagekite.me" -ForegroundColor Cyan
Write-Host ""
