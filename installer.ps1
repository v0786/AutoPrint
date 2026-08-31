$ErrorActionPreference = 'Stop'

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " QRPRINT INSTALLER" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

$IsAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $IsAdmin) {
    Write-Host "[ERROR] Administrator privileges are required." -ForegroundColor Red
    Write-Host "Please launch this script from an Administrator Command Prompt." -ForegroundColor Yellow
    exit 1
}

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $repoRoot

# Run diagnostics
Write-Host "[INFO] Running system diagnostics..." -ForegroundColor Cyan
try {
    & .\diagnose.ps1
} catch {
    Write-Host "[WARN] Diagnostics check encountered issues, but proceeding..." -ForegroundColor Yellow
}

$required = @('node', 'npm')
foreach ($tool in $required) {
    $exists = Get-Command $tool -ErrorAction SilentlyContinue
    if (-not $exists) {
        Write-Host "[ERROR] $tool is required but not installed." -ForegroundColor Red
        exit 1
    }
}

if (-not (Test-Path "$repoRoot\merchant\package.json")) {
    Write-Host "[ERROR] Merchant project is missing." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "$repoRoot\data")) {
    New-Item -ItemType Directory -Path "$repoRoot\data" -Force | Out-Null
}

if (-not (Test-Path "$repoRoot\data\merchant.db")) {
    New-Item -ItemType File -Path "$repoRoot\data\merchant.db" -Force | Out-Null
}

# Kill processes using critical ports
Write-Host "[INFO] Checking for port conflicts..." -ForegroundColor Cyan
if (Get-NetTCPConnection -LocalPort 4100 -ErrorAction SilentlyContinue) {
    Write-Host "[WARN] Port 4100 is in use. Attempting to free it..." -ForegroundColor Yellow
    $process = Get-NetTCPConnection -LocalPort 4100 | Select-Object -First 1 -ExpandProperty OwningProcess
    if ($process) {
        Stop-Process -Id $process -Force -ErrorAction SilentlyContinue
    }
}

Write-Host "[INFO] Installing root dependencies..." -ForegroundColor Cyan
& npm install

Write-Host "[INFO] Installing merchant dependencies..." -ForegroundColor Cyan
Set-Location "$repoRoot\merchant"
& npm install

Write-Host "[INFO] Building merchant for Electron..." -ForegroundColor Cyan
& npm run build:electron

Write-Host "[INFO] Installing customer dependencies..." -ForegroundColor Cyan
Set-Location "$repoRoot\customer"
& npm install

Set-Location $repoRoot

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Installation Complete!" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Merchant local setup is ready." -ForegroundColor Green
Write-Host ""
Write-Host "To start the application:" -ForegroundColor Cyan
Write-Host "  cd merchant" -ForegroundColor Gray
Write-Host "  npm run electron-dev" -ForegroundColor Gray
Write-Host ""
Write-Host "For development (separate frontend/backend):" -ForegroundColor Cyan
Write-Host "  Terminal 1: npm run server" -ForegroundColor Gray
Write-Host "  Terminal 2: npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "To build installer for distribution:" -ForegroundColor Cyan
Write-Host "  npm run package:win" -ForegroundColor Gray
Write-Host ""
Write-Host "Configure tunnel URL in merchant/.env and customer/.env.local" -ForegroundColor Yellow
Write-Host ""
Write-Host "For help, see: INSTALL_AND_USE.md" -ForegroundColor Cyan
Write-Host "" 
