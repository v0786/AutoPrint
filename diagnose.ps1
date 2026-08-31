param(
    [switch]$Repair = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = 'Continue'

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " QRPrint System Diagnostics & Repair Utility" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Counter variables
$errors = 0
$warnings = 0
$fixes_applied = 0

function Test-Administrator {
    $principal = [Security.Principal.WindowsPrincipal]::new([Security.Principal.WindowsIdentity]::GetCurrent())
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Repair-NodeInstallation {
    Write-Host ""
    Write-Host "[REPAIR] Attempting to fix Node.js installation..." -ForegroundColor Yellow
    Write-Host "Rebuilding npm cache..." -ForegroundColor Gray
    & npm cache clean --force 2>&1 | Out-Null
    Write-Host "[FIXED] npm cache cleared" -ForegroundColor Green
    $script:fixes_applied++
}

function Repair-PortConflict {
    param([int]$Port)
    
    Write-Host ""
    Write-Host "[REPAIR] Finding and terminating process on port $Port..." -ForegroundColor Yellow
    
    $process = & netstat -ano | Select-String ":$Port" | ForEach-Object {
        $_ -split '\s+' | Where-Object { $_ } | Select-Object -Last 1
    } | Select-Object -First 1
    
    if ($process) {
        Write-Host "Found process with PID: $process" -ForegroundColor Gray
        & taskkill /PID $process /F 2>&1 | Out-Null
        Write-Host "[FIXED] Process terminated" -ForegroundColor Green
        $script:fixes_applied++
    } else {
        Write-Host "[INFO] No process found on port $Port" -ForegroundColor Cyan
    }
}

function Repair-DatabaseDirectory {
    Write-Host ""
    Write-Host "[REPAIR] Creating database directory..." -ForegroundColor Yellow
    
    if (-not (Test-Path "data")) {
        New-Item -ItemType Directory -Path "data" -Force | Out-Null
        Write-Host "[FIXED] Created data/ directory" -ForegroundColor Green
        $script:fixes_applied++
    }
    
    if (-not (Test-Path "data\merchant.db")) {
        New-Item -ItemType File -Path "data\merchant.db" -Force | Out-Null
        Write-Host "[FIXED] Created merchant.db file" -ForegroundColor Green
        $script:fixes_applied++
    }
}

function Repair-NPMDependencies {
    Write-Host ""
    Write-Host "[REPAIR] Reinstalling npm dependencies..." -ForegroundColor Yellow
    
    Write-Host "Installing root dependencies..." -ForegroundColor Gray
    & npm install 2>&1 | Out-Null
    
    Write-Host "Installing merchant dependencies..." -ForegroundColor Gray
    Push-Location merchant
    & npm install 2>&1 | Out-Null
    Pop-Location
    
    Write-Host "Installing customer dependencies..." -ForegroundColor Gray
    Push-Location customer
    & npm install 2>&1 | Out-Null
    Pop-Location
    
    Write-Host "[FIXED] All dependencies reinstalled" -ForegroundColor Green
    $script:fixes_applied++
}

function Repair-PathEnvironment {
    Write-Host ""
    Write-Host "[REPAIR] Checking and fixing PATH environment..." -ForegroundColor Yellow
    
    $nodePath = "C:\Program Files\nodejs"
    $env_path = [Environment]::GetEnvironmentVariable("Path", "Machine")
    
    if ($env_path -notcontains $nodePath) {
        Write-Host "Node.js not found in system PATH, attempting to add..." -ForegroundColor Gray
        [Environment]::SetEnvironmentVariable(
            "Path",
            "$env_path;$nodePath",
            "Machine"
        )
        Write-Host "[FIXED] Added Node.js to system PATH" -ForegroundColor Green
        Write-Host "[NOTICE] Please restart Command Prompt for changes to take effect" -ForegroundColor Yellow
        $script:fixes_applied++
    }
}

# ============================================================
# DIAGNOSTICS START
# ============================================================

Write-Host "[CHECK 1] Administrator privileges..." -ForegroundColor Cyan
if (-not (Test-Administrator)) {
    Write-Host "  [FAIL] This script must be run as Administrator" -ForegroundColor Red
    Write-Host "  [ACTION] Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    $errors++
} else {
    Write-Host "  [PASS] Administrator privileges confirmed" -ForegroundColor Green
}

Write-Host ""
Write-Host "[CHECK 2] Node.js installation..." -ForegroundColor Cyan
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
if (-not $nodeCmd) {
    Write-Host "  [FAIL] Node.js is not installed or not in PATH" -ForegroundColor Red
    Write-Host "  [ACTION] Install from: https://nodejs.org/en/download" -ForegroundColor Yellow
    $errors++
} else {
    $nodeVersion = & node --version
    Write-Host "  [PASS] $nodeVersion is installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "[CHECK 3] npm installation..." -ForegroundColor Cyan
$npmCmd = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npmCmd) {
    Write-Host "  [FAIL] npm is not installed or not in PATH" -ForegroundColor Red
    Write-Host "  [ACTION] Reinstall Node.js from: https://nodejs.org/" -ForegroundColor Yellow
    $errors++
    
    if ($Repair) {
        Repair-PathEnvironment
    }
} else {
    $npmVersion = & npm --version
    Write-Host "  [PASS] npm $npmVersion is installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "[CHECK 4] Git installation..." -ForegroundColor Cyan
$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCmd) {
    Write-Host "  [WARN] Git is not installed (optional)" -ForegroundColor Yellow
    Write-Host "  [ACTION] Install from: https://git-scm.com/download/win" -ForegroundColor Gray
    $warnings++
} else {
    $gitVersion = & git --version
    Write-Host "  [PASS] $gitVersion is installed" -ForegroundColor Green
}

Write-Host ""
Write-Host "[CHECK 5] Repository structure..." -ForegroundColor Cyan
if (-not (Test-Path "merchant\package.json")) {
    Write-Host "  [FAIL] merchant/package.json not found" -ForegroundColor Red
    Write-Host "  [ACTION] Run from repository root: cd D:\QRPrint" -ForegroundColor Yellow
    $errors++
} else {
    Write-Host "  [PASS] Merchant project found" -ForegroundColor Green
}

if (-not (Test-Path "customer\package.json")) {
    Write-Host "  [FAIL] customer/package.json not found" -ForegroundColor Red
    $errors++
} else {
    Write-Host "  [PASS] Customer project found" -ForegroundColor Green
}

if (-not (Test-Path "shared\src\index.ts")) {
    Write-Host "  [FAIL] shared/src/index.ts not found" -ForegroundColor Red
    $errors++
} else {
    Write-Host "  [PASS] Shared package found" -ForegroundColor Green
}

Write-Host ""
Write-Host "[CHECK 6] Database directory..." -ForegroundColor Cyan
if (-not (Test-Path "data")) {
    Write-Host "  [WARN] data/ directory does not exist" -ForegroundColor Yellow
    Write-Host "  [ACTION] Will be created during installation" -ForegroundColor Gray
    $warnings++
    
    if ($Repair) {
        Repair-DatabaseDirectory
    }
} else {
    Write-Host "  [PASS] data/ directory exists" -ForegroundColor Green
    
    if (Test-Path "data\merchant.db") {
        Write-Host "  [PASS] merchant.db exists" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] merchant.db not found (will be created on first run)" -ForegroundColor Yellow
        $warnings++
        
        if ($Repair) {
            Repair-DatabaseDirectory
        }
    }
}

Write-Host ""
Write-Host "[CHECK 7] Port availability..." -ForegroundColor Cyan
$port4100 = & netstat -ano | Select-String ":4100"
if ($port4100) {
    Write-Host "  [WARN] Port 4100 is already in use (merchant backend)" -ForegroundColor Yellow
    Write-Host "  [ACTION] See INSTALL_AND_USE.md section: 'Port 4100 already in use'" -ForegroundColor Gray
    $warnings++
    
    if ($Repair) {
        Repair-PortConflict -Port 4100
    }
} else {
    Write-Host "  [PASS] Port 4100 is available" -ForegroundColor Green
}

$port5173 = & netstat -ano | Select-String ":5173"
if ($port5173) {
    Write-Host "  [WARN] Port 5173 is already in use (Vite dev server)" -ForegroundColor Yellow
    Write-Host "  [ACTION] Close other applications using this port" -ForegroundColor Gray
    $warnings++
    
    if ($Repair) {
        Repair-PortConflict -Port 5173
    }
} else {
    Write-Host "  [PASS] Port 5173 is available" -ForegroundColor Green
}

Write-Host ""
Write-Host "[CHECK 8] Windows version..." -ForegroundColor Cyan
$osInfo = Get-WmiObject -Class Win32_OperatingSystem
$osName = $osInfo.Caption
$osVersion = $osInfo.Version
Write-Host "  OS: $osName (Build $osVersion)" -ForegroundColor Gray

if ($osName -like "*Windows 10*" -or $osName -like "*Windows 11*") {
    Write-Host "  [PASS] Supported Windows version" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Untested Windows version" -ForegroundColor Yellow
    $warnings++
}

Write-Host ""
Write-Host "[CHECK 9] npm cache integrity..." -ForegroundColor Cyan
$cacheSize = & npm cache ls | Measure-Object -Line
if ($cacheSize.Lines -gt 0) {
    Write-Host "  [PASS] npm cache found ($('{0:N0}' -f $cacheSize.Lines) items)" -ForegroundColor Green
} else {
    Write-Host "  [INFO] npm cache is empty" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "[CHECK 10] Dependencies status..." -ForegroundColor Cyan
if (Test-Path "node_modules") {
    Write-Host "  [INFO] Root node_modules found" -ForegroundColor Cyan
}
if (Test-Path "merchant\node_modules") {
    Write-Host "  [INFO] Merchant node_modules found" -ForegroundColor Cyan
} else {
    Write-Host "  [WARN] Merchant node_modules not found" -ForegroundColor Yellow
    $warnings++
}
if (Test-Path "customer\node_modules") {
    Write-Host "  [INFO] Customer node_modules found" -ForegroundColor Cyan
} else {
    Write-Host "  [WARN] Customer node_modules not found" -ForegroundColor Yellow
    $warnings++
}

# ============================================================
# SUMMARY
# ============================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Summary" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Errors found:        $errors" -ForegroundColor $(if ($errors -gt 0) { "Red" } else { "Green" })
Write-Host "Warnings found:      $warnings" -ForegroundColor $(if ($warnings -gt 0) { "Yellow" } else { "Green" })
Write-Host "Fixes applied:       $fixes_applied" -ForegroundColor $(if ($fixes_applied -gt 0) { "Green" } else { "Cyan" })
Write-Host ""

if ($errors -ge 1) {
    Write-Host "[ACTION REQUIRED]" -ForegroundColor Red
    Write-Host "Your system has errors that must be fixed before QRPrint can run." -ForegroundColor Red
    Write-Host "Please review the [FAIL] and [ACTION] sections above." -ForegroundColor Red
    Write-Host ""
    Write-Host "To attempt automatic repairs, run:" -ForegroundColor Yellow
    Write-Host "  powershell -ExecutionPolicy Bypass -File diagnose.ps1 -Repair" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

if ($warnings -ge 1) {
    Write-Host "[NOTICE]" -ForegroundColor Yellow
    Write-Host "Your system has warnings but QRPrint may still work." -ForegroundColor Yellow
    Write-Host "Review the [WARN] and [ACTION] sections for optimal performance." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "[SUCCESS] System diagnostics passed!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  1. Run the installer: installer.bat" -ForegroundColor Gray
Write-Host "  2. Launch Electron: npm run electron-dev" -ForegroundColor Gray
Write-Host "  3. Complete the setup wizard" -ForegroundColor Gray
Write-Host ""

Read-Host "Press Enter to exit"
