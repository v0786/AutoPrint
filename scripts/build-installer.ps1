# ===============================================================================
#   AUTOPRINT / QRPRINT — AUTOMATED PRODUCTION INSTALLER BUILD SCRIPT
#   Builds all workspaces, validates components, and generates AutoPrint-Setup.exe
# ===============================================================================

param(
    [switch]$SkipBuildAll = $false
)

$ErrorActionPreference = 'Stop'
$rootDir = (Split-Path $PSScriptRoot -Parent)
Set-Location $rootDir

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "   AUTOPRINT PRODUCTION SINGLE-EXE INSTALLER BUILD PIPELINE      " -ForegroundColor White
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

# 0. Validate Prerequisite Node.js MSI
Write-Host "[1/6] Validating embedded Node.js prerequisite MSI..." -ForegroundColor Yellow
$msiPath = Join-Path $rootDir "installer\prerequisites\node-v20.18.0-x64.msi"
if (-not (Test-Path $msiPath)) {
    Write-Host "   Downloading official Node.js v20.18.0 x64 MSI prerequisite..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path (Join-Path $rootDir "installer\prerequisites") -Force | Out-Null
    Invoke-WebRequest -Uri "https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi" -OutFile $msiPath -UseBasicParsing
}
if (-not (Test-Path $msiPath)) {
    Write-Error "CRITICAL: node-v20.18.0-x64.msi is missing from installer\prerequisites!"
}
$msiSizeMb = [Math]::Round((Get-Item $msiPath).Length / 1MB, 2)
Write-Host "   [PASS] Found embedded Node.js prerequisite ($msiSizeMb MB): $msiPath" -ForegroundColor Green

# 1. Compile Native Launcher (AutoPrint.exe)
Write-Host "[2/6] Compiling native Windows System Tray Launcher (AutoPrint.exe)..." -ForegroundColor Yellow
& cmd.exe /c "src-launcher\build-launcher.cmd"
if ($LASTEXITCODE -ne 0 -or -not (Test-Path (Join-Path $rootDir "AutoPrint.exe"))) {
    Write-Error "CRITICAL: AutoPrint.exe compilation failed!"
}
Write-Host "   [PASS] AutoPrint.exe compiled successfully." -ForegroundColor Green

# 2. Compile Workspaces / Validate Production Outputs
if (-not $SkipBuildAll) {
    Write-Host "[3/6] Compiling all project workspaces..." -ForegroundColor Yellow
    & npm run build:all
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Workspace compilation failed. Aborting installer build."
    }
} else {
    Write-Host "[3/6] Skipping build:all (validating existing production builds)..." -ForegroundColor Gray
}

# Validate production build artifacts
$backendServer = Join-Path $rootDir "app\backend\dist\server.js"
$custHtml = Join-Path $rootDir "app\customer-web\dist\index.html"
$merchHtml = Join-Path $rootDir "app\merchant-desktop\dist\index.html"

if (-not (Test-Path $backendServer)) { Write-Error "Backend production build missing: $backendServer" }
if (-not (Test-Path $custHtml)) { Write-Error "Customer Web production build missing: $custHtml" }
if (-not (Test-Path $merchHtml)) { Write-Error "Merchant Desktop production build missing: $merchHtml" }
Write-Host "   [PASS] Verified pre-compiled Backend, Customer Web, and Merchant Desktop outputs." -ForegroundColor Green

# 3. Setup Staging Payload Directory
Write-Host "[4/6] Preparing clean staging payload in dist-installer\payload..." -ForegroundColor Yellow
$distDir = Join-Path $rootDir "dist-installer"
$payloadDir = Join-Path $distDir "payload"

if (Test-Path $payloadDir) {
    Remove-Item $payloadDir -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $payloadDir -Force | Out-Null

# 4. Copy Application Artifacts & Production Dependencies
Write-Host "[5/6] Copying application binaries, assets, and production modules..." -ForegroundColor Yellow

# Copy root executables, scripts, and dependency locks
Copy-Item (Join-Path $rootDir "AutoPrint.exe") $payloadDir -Force
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

# Customer Web
$custSrc = Join-Path $rootDir "app\customer-web"
$custDest = Join-Path $targetAppDir "customer-web"
New-Item -ItemType Directory -Path (Join-Path $custDest "dist") -Force | Out-Null
Copy-Item (Join-Path $custSrc "dist\*") (Join-Path $custDest "dist") -Recurse -Force
Copy-Item (Join-Path $custSrc "server.js") $custDest -Force
Copy-Item (Join-Path $custSrc "package.json") $custDest -Force

# Merchant Desktop
$merchSrc = Join-Path $rootDir "app\merchant-desktop"
$merchDest = Join-Path $targetAppDir "merchant-desktop"
New-Item -ItemType Directory -Path (Join-Path $merchDest "dist") -Force | Out-Null
Copy-Item (Join-Path $merchSrc "dist\*") (Join-Path $merchDest "dist") -Recurse -Force
Copy-Item (Join-Path $merchSrc "server.js") $merchDest -Force
Copy-Item (Join-Path $merchSrc "package.json") $merchDest -Force

# Connectors & Shared
Copy-Item (Join-Path $rootDir "app\connectors") $targetAppDir -Recurse -Force
Copy-Item (Join-Path $rootDir "app\shared") $targetAppDir -Recurse -Force

# Stage Production Node Modules for Zero-Setup Offline Execution
Write-Host "   Staging production node_modules (Backend, Customer, Merchant)..." -ForegroundColor Yellow
$backendNm = Join-Path $backendSrc "node_modules"
if (Test-Path $backendNm) {
    robocopy $backendNm (Join-Path $backendDest "node_modules") /E /NFL /NDL /NJH /NJS /XD .cache | Out-Null
}
$custNm = Join-Path $custSrc "node_modules"
if (Test-Path $custNm) {
    robocopy $custNm (Join-Path $custDest "node_modules") /E /NFL /NDL /NJH /NJS /XD .cache | Out-Null
}
$merchNm = Join-Path $merchSrc "node_modules"
if (Test-Path $merchNm) {
    robocopy $merchNm (Join-Path $merchDest "node_modules") /E /NFL /NDL /NJH /NJS /XD .cache | Out-Null
}

# Assets, scripts, installer helpers, and docs
Copy-Item (Join-Path $rootDir "assets") $payloadDir -Recurse -Force
Copy-Item (Join-Path $rootDir "scripts") $payloadDir -Recurse -Force
Copy-Item (Join-Path $rootDir "installer") $payloadDir -Recurse -Force
Copy-Item (Join-Path $rootDir "docs") $payloadDir -Recurse -Force

# Bundled Private Portable Node.js Runtime fallback
$nodeSrc = Join-Path $rootDir "runtime\node\node.exe"
if (Test-Path $nodeSrc) {
    $runtimeDest = Join-Path $payloadDir "runtime\node"
    New-Item -ItemType Directory -Path $runtimeDest -Force | Out-Null
    Copy-Item $nodeSrc $runtimeDest -Force
}

# 5. Compile Inno Setup Script
Write-Host "[6/6] Compiling Inno Setup Single-EXE Installer (AutoPrint-Setup.exe)..." -ForegroundColor Yellow

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
    $hash = (Get-FileHash -Path $setupExe -Algorithm SHA256).Hash
    Set-Content (Join-Path $distDir "AutoPrint-Setup.exe.sha256") "$hash  AutoPrint-Setup.exe"

    Write-Host ""
    Write-Host "=================================================================" -ForegroundColor Green
    Write-Host "   AUTOPRINT SINGLE-EXE INSTALLER BUILT SUCCESSFULLY!            " -ForegroundColor White
    Write-Host "=================================================================" -ForegroundColor Green
    Write-Host "   Installer File : $setupExe" -ForegroundColor Green
    Write-Host "   Installer Size : $sizeMb MB" -ForegroundColor Green
    Write-Host "   SHA-256 Hash   : $hash" -ForegroundColor Green
    Write-Host ""
} else {
    Write-Error "Installer executable was not generated at expected location: $setupExe"
}
