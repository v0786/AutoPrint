# ===============================================================================
#   AUTOPRINT / QRPRINT — AUTOMATED PRODUCTION INSTALLER BUILD SCRIPT
#   Compiles all workspaces, bundles portable runtime, and generates AutoPrint-Setup.exe
# ===============================================================================

param(
    [switch]$SkipBuildAll = $false
)

$ErrorActionPreference = 'Stop'
$rootDir = (Split-Path $PSScriptRoot -Parent)
Set-Location $rootDir

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "   AUTOPRINT PRODUCTION INSTALLER BUILD PIPELINE                " -ForegroundColor White
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Compile All Workspaces
if (-not $SkipBuildAll) {
    Write-Host "[1/5] Compiling all project workspaces & native launcher..." -ForegroundColor Yellow
    & npm run build:all
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Workspace compilation failed. Aborting installer build."
    }
} else {
    Write-Host "[1/5] Skipping build:all (reusing existing builds)..." -ForegroundColor Gray
}

# 2. Setup Staging Payload Directory
Write-Host "[2/5] Preparing staging payload in dist-installer\payload..." -ForegroundColor Yellow
$distDir = Join-Path $rootDir "dist-installer"
$payloadDir = Join-Path $distDir "payload"

if (Test-Path $payloadDir) {
    Remove-Item $payloadDir -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $payloadDir -Force | Out-Null

# 3. Copy Application Artifacts & Production Dependencies
Write-Host "[3/5] Copying application binaries, assets, and production modules..." -ForegroundColor Yellow

# Copy root executables, scripts, and dependency locks
Copy-Item (Join-Path $rootDir "AutoPrint.exe") $payloadDir -Force
Copy-Item (Join-Path $rootDir "AutoPrint-Launcher.bat") $payloadDir -Force
Copy-Item (Join-Path $rootDir "Launch AutoPrint.bat") $payloadDir -Force
Copy-Item (Join-Path $rootDir "Launch AutoPrint.ps1") $payloadDir -Force
Copy-Item (Join-Path $rootDir "Start-Customer-Tunnel.cmd") $payloadDir -Force
Copy-Item (Join-Path $rootDir "package.json") $payloadDir -Force
if (Test-Path (Join-Path $rootDir "package-lock.json")) {
    Copy-Item (Join-Path $rootDir "package-lock.json") $payloadDir -Force
}
Copy-Item (Join-Path $rootDir ".env.example") $payloadDir -Force

# Copy tools directory (PageKite CLI and helper tools) with SHA-256 integrity check
if (Test-Path (Join-Path $rootDir "tools")) {
    $pkScript = Join-Path $rootDir "tools\pagekite\pagekite.py"
    if (Test-Path $pkScript) {
        $expectedHash = "5498F591F51F0E8721A7282C662950E57110BF1A0C092261F88C4CCADC981AE0"
        $actualHash = (Get-FileHash -Path $pkScript -Algorithm SHA256).Hash
        if ($actualHash -ne $expectedHash) {
            Write-Error "PageKite CLI SHA-256 integrity verification failed! Expected: $expectedHash, Got: $actualHash"
        }
        Write-Host "   [PASS] Verified PageKite CLI SHA-256 Checksum: $actualHash" -ForegroundColor Green
    }
    Copy-Item (Join-Path $rootDir "tools") $payloadDir -Recurse -Force
}

# Copy app subdirectories
$targetAppDir = Join-Path $payloadDir "app"
New-Item -ItemType Directory -Path $targetAppDir -Force | Out-Null

# Backend
$backendSrc = Join-Path $rootDir "app\backend"
$backendDest = Join-Path $targetAppDir "backend"
New-Item -ItemType Directory -Path (Join-Path $backendDest "dist") -Force | Out-Null
Copy-Item (Join-Path $backendSrc "dist\*") (Join-Path $backendDest "dist") -Recurse -Force
Copy-Item (Join-Path $backendSrc "package.json") $backendDest -Force
if (Test-Path (Join-Path $backendSrc "package-lock.json")) {
    Copy-Item (Join-Path $backendSrc "package-lock.json") $backendDest -Force
}

# Customer Web
$custSrc = Join-Path $rootDir "app\customer-web"
$custDest = Join-Path $targetAppDir "customer-web"
New-Item -ItemType Directory -Path (Join-Path $custDest "dist") -Force | Out-Null
Copy-Item (Join-Path $custSrc "dist\*") (Join-Path $custDest "dist") -Recurse -Force
Copy-Item (Join-Path $custSrc "server.js") $custDest -Force
Copy-Item (Join-Path $custSrc "package.json") $custDest -Force
if (Test-Path (Join-Path $custSrc "package-lock.json")) {
    Copy-Item (Join-Path $custSrc "package-lock.json") $custDest -Force
}

# Merchant Desktop
$merchSrc = Join-Path $rootDir "app\merchant-desktop"
$merchDest = Join-Path $targetAppDir "merchant-desktop"
New-Item -ItemType Directory -Path (Join-Path $merchDest "dist") -Force | Out-Null
Copy-Item (Join-Path $merchSrc "dist\*") (Join-Path $merchDest "dist") -Recurse -Force
Copy-Item (Join-Path $merchSrc "server.js") $merchDest -Force
Copy-Item (Join-Path $merchSrc "package.json") $merchDest -Force
if (Test-Path (Join-Path $merchSrc "package-lock.json")) {
    Copy-Item (Join-Path $merchSrc "package-lock.json") $merchDest -Force
}

# Connectors & Shared
Copy-Item (Join-Path $rootDir "app\connectors") $targetAppDir -Recurse -Force
Copy-Item (Join-Path $rootDir "app\shared") $targetAppDir -Recurse -Force

# Assets, scripts, installer helpers, and docs
Copy-Item (Join-Path $rootDir "assets") $payloadDir -Recurse -Force
Copy-Item (Join-Path $rootDir "scripts") $payloadDir -Recurse -Force
Copy-Item (Join-Path $rootDir "installer") $payloadDir -Recurse -Force
Copy-Item (Join-Path $rootDir "docs") $payloadDir -Recurse -Force

# Global Node.js Runtime Staging Note
Write-Host "[4/5] Staging global Node.js detection and installation engine..." -ForegroundColor Yellow
Write-Host "   (Zero bundled node runtime: Target system will use global Node.js)" -ForegroundColor Green

# 4. Compile Inno Setup Script
Write-Host "[5/5] Compiling Inno Setup Installer (AutoPrint-Setup.exe)..." -ForegroundColor Yellow

$isccCandidates = @(
    "C:\Program Files (x86)\Inno Setup 6\ISCC.exe",
    "C:\Program Files\Inno Setup 6\ISCC.exe",
    "C:\Program Files (x86)\Inno Setup 5\ISCC.exe",
    "C:\Program Files\Inno Setup 5\ISCC.exe"
)

$isccPath = $null
foreach ($candidate in $isccCandidates) {
    if (Test-Path $candidate) {
        $isccPath = $candidate
        break
    }
}

if (-not $isccPath) {
    $cmd = Get-Command iscc -ErrorAction SilentlyContinue
    if ($cmd) { $isccPath = $cmd.Source }
}

if (-not $isccPath) {
    Write-Error "Inno Setup compiler (ISCC.exe) not found. Please install Inno Setup 6."
}

$issFile = Join-Path $rootDir "installer\AutoPrint.iss"
& $isccPath $issFile

if ($LASTEXITCODE -ne 0) {
    Write-Error "Inno Setup compiler exited with error code $LASTEXITCODE."
}

$setupExe = Join-Path $distDir "AutoPrint-Setup.exe"
if (Test-Path $setupExe) {
    $sizeMb = [Math]::Round((Get-Item $setupExe).Length / 1MB, 2)
    Write-Host ""
    Write-Host "=================================================================" -ForegroundColor Green
    Write-Host "   AUTOPRINT INSTALLER BUILT SUCCESSFULLY!                       " -ForegroundColor White
    Write-Host "=================================================================" -ForegroundColor Green
    Write-Host "   Installer File : $setupExe" -ForegroundColor Green
    Write-Host "   Installer Size : $sizeMb MB" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Error "Installer executable was not generated at expected location: $setupExe"
}
