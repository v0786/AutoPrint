# ==============================================================================
# QRPrint — Production Build & Packaging Pipeline (Windows 7 / 10 / 11)
# Compiles application, generates Inno Setup installer, packages portable zip,
# and generates cryptographic verification checksums in release/
# ==============================================================================

param(
    [switch]$SkipBuildAll = $false
)

$ErrorActionPreference = 'Stop'
$rootDir = (Split-Path $PSScriptRoot -Parent)
Set-Location $rootDir

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "   QRPRINT PRODUCTION WINDOWS PACKAGING & RELEASE PIPELINE       " -ForegroundColor White
Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host ""

# Ensure release directory exists
$releaseDir = Join-Path $rootDir "release"
if (-not (Test-Path $releaseDir)) {
    New-Item -ItemType Directory -Path $releaseDir -Force | Out-Null
}

# 1. Clean Staging Workspace
Write-Host "[1/7] Cleaning staging payload..." -ForegroundColor Yellow
$distDir = Join-Path $rootDir "dist-installer"
$payloadDir = Join-Path $distDir "payload"
if (Test-Path $payloadDir) {
    Remove-Item $payloadDir -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $payloadDir -Force | Out-Null

# 2. Validate Prerequisites
Write-Host "[2/7] Verifying embedded prerequisites (.NET 4.5.2 & Node.js)..." -ForegroundColor Yellow
$prereqDir = Join-Path $rootDir "installer\prerequisites"
$nodeMsi = Join-Path $prereqDir "node-v20.18.0-x64.msi"
$dotnetExe = Join-Path $prereqDir "NDP452-KB2901907-x86-x64-AllOS-ENU.exe"

if (-not (Test-Path $nodeMsi) -or -not (Test-Path $dotnetExe)) {
    Write-Host "   Downloading missing offline installer prerequisites..." -ForegroundColor Yellow
    if (-not (Test-Path $nodeMsi)) {
        Invoke-WebRequest -Uri "https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi" -OutFile $nodeMsi -UseBasicParsing
    }
    if (-not (Test-Path $dotnetExe)) {
        Invoke-WebRequest -Uri "https://download.microsoft.com/download/E/2/1/E21644B5-2DF2-47C2-91BD-63C560427900/NDP452-KB2901907-x86-x64-AllOS-ENU.exe" -OutFile $dotnetExe -UseBasicParsing
    }
}
Write-Host "   [PASS] Verified offline installer prerequisites." -ForegroundColor Green

# 3. Compile Native Launcher (AutoPrint.exe)
Write-Host "[3/7] Compiling native Windows launcher (AutoPrint.exe)..." -ForegroundColor Yellow
& cmd.exe /c "src-launcher\build-launcher.cmd"
if ($LASTEXITCODE -ne 0 -or -not (Test-Path (Join-Path $rootDir "AutoPrint.exe"))) {
    Write-Error "Native launcher compilation failed!"
}
Write-Host "   [PASS] AutoPrint.exe compiled successfully (.NET 4.5.2 Win7/10/11 target)." -ForegroundColor Green

# 4. Compile Workspaces
if (-not $SkipBuildAll) {
    Write-Host "[4/7] Compiling application workspaces (Backend, Merchant, Customer)..." -ForegroundColor Yellow
    & npm run build:backend
    & npm run build:merchant
    & npm run build:customer
} else {
    Write-Host "[4/7] Skipping workspace build (using existing production dist)..." -ForegroundColor Gray
}

# Validate production outputs
$backendServer = Join-Path $rootDir "app\backend\dist\server.js"
$custHtml = Join-Path $rootDir "app\customer-web\dist\index.html"
$merchHtml = Join-Path $rootDir "app\merchant-desktop\dist\index.html"

if (-not (Test-Path $backendServer)) { Write-Error "Backend production build missing: $backendServer" }
if (-not (Test-Path $custHtml)) { Write-Error "Customer Web production build missing: $custHtml" }
if (-not (Test-Path $merchHtml)) { Write-Error "Merchant Desktop production build missing: $merchHtml" }
Write-Host "   [PASS] Production builds validated." -ForegroundColor Green

# 5. Assemble Production Payload
Write-Host "[5/7] Assembling production payload in dist-installer\payload..." -ForegroundColor Yellow

Copy-Item (Join-Path $rootDir "AutoPrint.exe") $payloadDir -Force
if (Test-Path (Join-Path $rootDir "AutoPrint.exe.config")) {
    Copy-Item (Join-Path $rootDir "AutoPrint.exe.config") $payloadDir -Force
}
Copy-Item (Join-Path $rootDir "package.json") $payloadDir -Force
if (Test-Path (Join-Path $rootDir "package-lock.json")) {
    Copy-Item (Join-Path $rootDir "package-lock.json") $payloadDir -Force
}
Copy-Item (Join-Path $rootDir ".env.example") $payloadDir -Force
Get-ChildItem -Path $rootDir -Filter "*.cmd" | Copy-Item -Destination $payloadDir -Force
Get-ChildItem -Path $rootDir -Filter "*.bat" | Copy-Item -Destination $payloadDir -Force

if (Test-Path (Join-Path $rootDir "tools")) {
    Copy-Item (Join-Path $rootDir "tools") $payloadDir -Recurse -Force
}

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

# Staging node_modules
Write-Host "   Copying production modules..." -ForegroundColor Yellow
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

Copy-Item (Join-Path $rootDir "assets") $payloadDir -Recurse -Force
Copy-Item (Join-Path $rootDir "scripts") $payloadDir -Recurse -Force
Copy-Item (Join-Path $rootDir "installer") $payloadDir -Recurse -Force
Copy-Item (Join-Path $rootDir "docs") $payloadDir -Recurse -Force

Write-Host "   [PASS] Production payload assembled." -ForegroundColor Green

# 6. Compile Inno Setup Installer (QRPrint.iss)
Write-Host "[6/7] Compiling Inno Setup installer (QRPrint-Setup.exe)..." -ForegroundColor Yellow

$isccPath = "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
if (-not (Test-Path $isccPath)) {
    $isccPath = "C:\Program Files\Inno Setup 6\ISCC.exe"
}
if (-not (Test-Path $isccPath)) {
    $cmd = Get-Command iscc -ErrorAction SilentlyContinue
    if ($cmd) { $isccPath = $cmd.Source }
}
if (-not (Test-Path $isccPath)) {
    Write-Error "Inno Setup compiler (ISCC.exe) not found!"
}

$issFile = Join-Path $rootDir "installer\QRPrint.iss"
& $isccPath $issFile
if ($LASTEXITCODE -ne 0) {
    Write-Error "Inno Setup compilation failed with exit code $LASTEXITCODE!"
}

$setupExe = Join-Path $releaseDir "QRPrint-Setup.exe"
$versionedSetupExe = Join-Path $releaseDir "QRPrint-1.0.0-Setup.exe"
if (Test-Path $setupExe) {
    Copy-Item $setupExe $versionedSetupExe -Force
} else {
    Write-Error "Expected installer output not found at: $setupExe"
}
Write-Host "   [PASS] Compiled QRPrint-Setup.exe and QRPrint-1.0.0-Setup.exe." -ForegroundColor Green

# 7. Package Portable Distribution & Generate Checksums
Write-Host "[7/7] Packaging portable distribution and computing SHA-256 checksums..." -ForegroundColor Yellow

$portableZip = Join-Path $releaseDir "QRPrint-1.0.0-Portable.zip"
if (Test-Path $portableZip) {
    Remove-Item $portableZip -Force
}

# Compress payload into portable zip
Compress-Archive -Path "$payloadDir\*" -DestinationPath $portableZip -CompressionLevel Optimal
Write-Host "   [PASS] Created portable distribution: $portableZip" -ForegroundColor Green

# Generate checksums.txt
$checksumsFile = Join-Path $releaseDir "checksums.txt"
$hashLines = @()
$releaseFiles = Get-ChildItem -Path $releaseDir -File | Where-Object { $_.Name -ne "checksums.txt" }

foreach ($file in $releaseFiles) {
    $h = (Get-FileHash -Path $file.FullName -Algorithm SHA256).Hash
    $hashLines += "$h  $($file.Name)"
}

$hashLines | Set-Content -Path $checksumsFile -Encoding UTF8
Write-Host "   [PASS] Checksums generated in release/checksums.txt" -ForegroundColor Green

Write-Host ""
Write-Host "=================================================================" -ForegroundColor Green
Write-Host "   RELEASE ARTIFACTS GENERATED SUCCESSFULLY                      " -ForegroundColor White
Write-Host "=================================================================" -ForegroundColor Green
foreach ($file in (Get-ChildItem -Path $releaseDir -File)) {
    $mb = [Math]::Round($file.Length / 1MB, 2)
    Write-Host ("   {0,-32} : {1,8} MB" -f $file.Name, $mb) -ForegroundColor Green
}
Write-Host ""
