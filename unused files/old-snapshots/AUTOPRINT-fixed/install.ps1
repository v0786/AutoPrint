# PowerShell Automated Installer for AutoPrint System
# Run with Administrator privileges

param(
    [string]$TargetDir = "C:\AutoPrint",
    [string]$SourceDir = "",
    [int]$ServerPort = 5000,
    [int]$CustomerWebPort = 3000,
    [int]$MerchantDesktopPort = 3001
)

$ErrorActionPreference = "Stop"

# Clean up path formatting to prevent Windows CMD trailing backslash quote escaping issues
if ($SourceDir) {
    $SourceDir = $SourceDir.Trim().Trim('"').Trim("'").TrimEnd('\')
}
if (-not $SourceDir -or -not (Test-Path -LiteralPath $SourceDir)) {
    $SourceDir = $PSScriptRoot
}

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "      AUTOPRINT SYSTEM PRODUCTION INSTALLER        " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
Write-Host " Source Directory: $SourceDir" -ForegroundColor Gray
Write-Host " Target Directory: $TargetDir" -ForegroundColor Gray

# 1. Check Administrator Privileges
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Error "This script requires Administrator privileges. Please re-run as Administrator."
    exit 1
}

# 2. Create Standardized Directory Layout
Write-Host "`n[1/5] Creating directory structure at $TargetDir..." -ForegroundColor Yellow

$folders = @(
    "$TargetDir\App\backend",
    "$TargetDir\App\merchant-desktop",
    "$TargetDir\App\customer-web",
    "$TargetDir\Config",
    "$TargetDir\Data\Database",
    "$TargetDir\Data\Templates",
    "$TargetDir\Logs\Application",
    "$TargetDir\Logs\Error",
    "$TargetDir\Logs\Print",
    "$TargetDir\Output\QR",
    "$TargetDir\Output\PDF",
    "$TargetDir\Backup\Database",
    "$TargetDir\Backup\Config",
    "$TargetDir\Temp"
)

foreach ($folder in $folders) {
    if (-not (Test-Path -LiteralPath $folder)) {
        New-Item -ItemType Directory -Path $folder -Force | Out-Null
        Write-Host "  Created: $folder" -ForegroundColor Gray
    }
}

# 3. Deploy Application Modules
Write-Host "`n[2/5] Deploying backend, merchant desktop, and customer web modules..." -ForegroundColor Yellow

$backendSource = Join-Path $SourceDir "backend"
if (Test-Path -LiteralPath $backendSource) {
    Copy-Item -Path "$backendSource\*" -Destination "$TargetDir\App\backend" -Recurse -Force
    Write-Host "  Deployed Backend Engine to $TargetDir\App\backend" -ForegroundColor Green
} else {
    Write-Warning "  Backend source directory not found at $backendSource"
}

$merchantSource = Join-Path $SourceDir "merchant-desktop"
if (Test-Path -LiteralPath $merchantSource) {
    Copy-Item -Path "$merchantSource\*" -Destination "$TargetDir\App\merchant-desktop" -Recurse -Force
    Write-Host "  Deployed Merchant Desktop Manager to $TargetDir\App\merchant-desktop" -ForegroundColor Green
} else {
    Write-Warning "  Merchant Desktop source directory not found at $merchantSource"
}

$customerSource = Join-Path $SourceDir "customer-web"
if (Test-Path -LiteralPath $customerSource) {
    Copy-Item -Path "$customerSource\*" -Destination "$TargetDir\App\customer-web" -Recurse -Force
    Write-Host "  Deployed Customer Web Interface to $TargetDir\App\customer-web" -ForegroundColor Green
} else {
    Write-Warning "  Customer Web source directory not found at $customerSource"
}

# 4. Generate Configuration Files
Write-Host "`n[3/5] Writing configuration settings..." -ForegroundColor Yellow

$appSettings = @{
    AppName = "AutoPrint System"
    Version = "1.0.0"
    ServerPort = $ServerPort
    CustomerWebPort = $CustomerWebPort
    MerchantDesktopPort = $MerchantDesktopPort
    DataPath = "$TargetDir\Data"
    LogsPath = "$TargetDir\Logs"
    OutputPath = "$TargetDir\Output"
    TempPath = "$TargetDir\Temp"
    MaxDigitalAttempts = 3
    EnableFailSafeCashLock = $true
} | ConvertTo-Json -Depth 4

Set-Content -Path "$TargetDir\Config\appsettings.json" -Value $appSettings -Encoding UTF8
Write-Host "  Configured $TargetDir\Config\appsettings.json" -ForegroundColor Green

# 5. Create Unified Master Service Launcher Script
Write-Host "`n[4/5] Creating unified production background launcher script..." -ForegroundColor Yellow

$launcherScript = @"
@echo off
TITLE AutoPrint Unified Production Host Service
COLOR 0A
cls
echo ====================================================
echo      STARTING AUTOPRINT UNIFIED PRODUCTION HOST    
echo ====================================================

cd /d "$TargetDir\App\backend"

echo Starting AutoPrint Server (API Port $ServerPort, Merchant Port $MerchantDesktopPort, Customer Port $CustomerWebPort)...
start /B "AutoPrint Core Service" cmd /c "node dist/server.js > \"$TargetDir\Logs\Application\service.log\" 2>&1"

timeout /t 3 /nobreak >nul

echo Opening Merchant Desktop Portal in Browser...
start http://localhost:$MerchantDesktopPort

echo.
echo ====================================================
echo  AutoPrint System successfully running!
echo  Merchant Desktop Portal: http://localhost:$MerchantDesktopPort
echo  Customer Web Interface:   http://localhost:$CustomerWebPort
echo  Backend API Base:         http://localhost:$ServerPort
echo ====================================================
"@

Set-Content -Path "$TargetDir\start-autoprint.bat" -Value $launcherScript -Encoding UTF8
Write-Host "  Created launcher at $TargetDir\start-autoprint.bat" -ForegroundColor Green

# 6. Verify Node.js Environment
Write-Host "`n[5/5] Checking environment dependencies..." -ForegroundColor Yellow
try {
    $nodeVer = node -v
    Write-Host "  Node.js environment detected: $nodeVer" -ForegroundColor Green
} catch {
    Write-Warning "  Node.js is not detected in PATH. Please install Node.js v18+ on this PC."
}

# Auto-launch services after installation
Write-Host "`nLaunching AutoPrint background services and browser portal..." -ForegroundColor Cyan
Start-Process -FilePath "$TargetDir\start-autoprint.bat" -WindowStyle Hidden

Write-Host "`n====================================================" -ForegroundColor Cyan
Write-Host "  INSTALLATION COMPLETED SUCCESSFULLY!             " -ForegroundColor Cyan
Write-Host "  Portal opened at http://localhost:$MerchantDesktopPort " -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
