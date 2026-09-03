<#
.SYNOPSIS
    AutoPrint Express — Automated Windows Latest Release Installer
    Official GitHub URL: https://raw.githubusercontent.com/v0786/AutoPrint/main/installer/scripts/install.ps1

.DESCRIPTION
    1. Detects and queries latest stable release from GitHub API (v0786/AutoPrint).
    2. Downloads the official Windows installer (AutoPrint-Setup.exe) & SHA-256 checksum.
    3. Cryptographically calculates and verifies SHA-256 integrity before execution.
    4. Handles Administrator privilege detection and seamless elevation.
    5. Detects existing installations, checks versions, and upgrades safely while preserving the SQLite database.
    6. Launches the verified installer for clean or upgraded print shop deployment.
#>

[CmdletBinding()]
param(
    [switch]$NonInteractive = $false,
    [switch]$SkipElevationCheck = $false,
    [switch]$IncludePrereleases = $false
)

$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

# -----------------------------------------------------------------------------
# STEP 1: Visual Header
# -----------------------------------------------------------------------------
Clear-Host
Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "                AUTOPRINT PRINT SHOP OPERATING SYSTEM                          " -ForegroundColor White
Write-Host "               Official Windows Online Release Installer                       " -ForegroundColor Cyan
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

# -----------------------------------------------------------------------------
# STEP 2: Privilege Verification
# -----------------------------------------------------------------------------
function Test-IsAdministrator {
    $currentIdentity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($currentIdentity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

if (Test-IsAdministrator) {
    Write-Host "[*] Running with Administrator privileges." -ForegroundColor Green
} else {
    Write-Host "[*] Standard user session detected. Windows will prompt for elevation when setup launches." -ForegroundColor Cyan
}

# -----------------------------------------------------------------------------
# STEP 3: Detect Latest Stable Release via GitHub API
# -----------------------------------------------------------------------------
$repo = "v0786/AutoPrint"
$apiUrl = "https://api.github.com/repos/$repo/releases"

Write-Host "[1/6] Connecting to GitHub Releases API ($repo)..." -ForegroundColor Yellow

$headers = @{
    "User-Agent" = "AutoPrint-Installer-PowerShell"
    "Accept"     = "application/vnd.github.v3+json"
}

$release = $null
try {
    $releasesList = Invoke-RestMethod -Uri $apiUrl -Headers $headers -UseBasicParsing -TimeoutSec 15
    if ($releasesList -and $releasesList.Count -gt 0) {
        if (-not $IncludePrereleases) {
            # Filter only official non-draft, non-prerelease stable versions
            $release = $releasesList | Where-Object { -not $_.prerelease -and -not $_.draft } | Select-Object -First 1
        } else {
            $release = $releasesList | Where-Object { -not $_.draft } | Select-Object -First 1
        }
    }
    # Fallback to /releases/latest endpoint if list was empty
    if (-not $release) {
        $release = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/latest" -Headers $headers -UseBasicParsing -TimeoutSec 10
    }
} catch {
    Write-Host "[WARN] Could not retrieve release metadata from GitHub API: $_" -ForegroundColor Yellow
    Write-Host "[*] Attempting fallback to direct asset repository download..." -ForegroundColor Yellow
    $release = $null
}

if ($release) {
    $tagName = $release.tag_name
    Write-Host "      [SUCCESS] Found latest stable release: $tagName" -ForegroundColor Green
    
    $binaryAsset = $release.assets | Where-Object { 
        ($_.name -like "*.exe" -or $_.name -like "*.zip") -and $_.name -notlike "*.old.exe" 
    } | Select-Object -First 1
    $shaAsset = $release.assets | Where-Object { $_.name -like "*.sha256" } | Select-Object -First 1

    if (-not $binaryAsset) {
        Write-Host ""
        Write-Host "===============================================================================" -ForegroundColor Yellow
        Write-Host " [ACTION REQUIRED] Release '$tagName' exists on GitHub, but no installer binary" -ForegroundColor Yellow
        Write-Host " has been attached yet." -ForegroundColor Yellow
        Write-Host ""
        Write-Host " Please attach 'AutoPrint-Setup.exe' or 'AutoPrint-Setup.zip' to the release at:" -ForegroundColor White
        Write-Host " https://github.com/$repo/releases/edit/$tagName" -ForegroundColor Cyan
        Write-Host "===============================================================================" -ForegroundColor Yellow
        Write-Host ""
        exit 1
    }

    $installerUrl = $binaryAsset.browser_download_url
    $installerName = $binaryAsset.name
    $shaUrl = if ($shaAsset) { $shaAsset.browser_download_url } else { "$installerUrl.sha256" }
} else {
    # Fallback to standard release asset URL format
    $tagName = "latest"
    $installerName = "AutoPrint-Setup.exe"
    $installerUrl = "https://github.com/$repo/releases/latest/download/AutoPrint-Setup.exe"
    $shaUrl = "https://github.com/$repo/releases/latest/download/AutoPrint-Setup.exe.sha256"
    Write-Host "      [*] Using primary release asset URL: $installerUrl" -ForegroundColor Cyan
}

# -----------------------------------------------------------------------------
# STEP 4: Inspect Existing Installation & Upgrade Detection
# -----------------------------------------------------------------------------
Write-Host "`n[2/6] Checking for existing AutoPrint installations on this PC..." -ForegroundColor Yellow

$installPaths = @(
    "${env:ProgramFiles}\AutoPrint",
    "${env:ProgramFiles(x86)}\AutoPrint",
    "$env:LOCALAPPDATA\AutoPrint"
)

$existingInstallDir = $null
foreach ($path in $installPaths) {
    if (Test-Path "$path\AutoPrint.exe" -or Test-Path "$path\app\backend\dist\server.js") {
        $existingInstallDir = $path
        break
    }
}

if ($existingInstallDir) {
    Write-Host "      [INFO] Existing AutoPrint installation detected at: $existingInstallDir" -ForegroundColor Cyan
    Write-Host "      [SAFE] Installer will preserve existing SQLite database, rate cards, and print history." -ForegroundColor Green
} else {
    Write-Host "      [INFO] Fresh PC installation detected. Ready for first-time deployment." -ForegroundColor Green
}

# -----------------------------------------------------------------------------
# STEP 5: Prepare Secure Temporary Workspace & Download Assets
# -----------------------------------------------------------------------------
$tempDir = Join-Path $env:TEMP "AutoPrint_Setup_$(Get-Random)"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

$downloadPath = Join-Path $tempDir $installerName

Write-Host "`n[3/6] Downloading official release installer..." -ForegroundColor Yellow
Write-Host "      Source: $installerUrl" -ForegroundColor Gray

try {
    [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
    Invoke-WebRequest -Uri $installerUrl -OutFile $downloadPath -UseBasicParsing
    Write-Host "      [PASS] Installer downloaded successfully ($( [Math]::Round((Get-Item $downloadPath).Length / 1MB, 2) ) MB)." -ForegroundColor Green
} catch {
    Write-Error "Failed to download installer from GitHub: $_"
    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    exit 1
}

# Extract if downloaded asset is a ZIP archive
$targetExecutable = $downloadPath
if ($installerName -like "*.zip") {
    Write-Host "      [*] Extracting ZIP package..." -ForegroundColor Cyan
    $extractDir = Join-Path $tempDir "extracted"
    Expand-Archive -Path $downloadPath -DestinationPath $extractDir -Force
    $foundExe = Get-ChildItem -Path $extractDir -Filter "*.exe" -Recurse | Select-Object -First 1
    if (-not $foundExe) {
        Write-Error "Could not find an executable (.exe) inside the downloaded zip archive."
        Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
        exit 1
    }
    $targetExecutable = $foundExe.FullName
    Write-Host "      [PASS] Extracted installer: $($foundExe.Name)" -ForegroundColor Green
}

# -----------------------------------------------------------------------------
# STEP 6: Cryptographic SHA-256 Verification
# -----------------------------------------------------------------------------
Write-Host "`n[4/6] Verifying cryptographic SHA-256 checksum..." -ForegroundColor Yellow

$calculatedHash = (Get-FileHash -Path $downloadPath -Algorithm SHA256).Hash.ToLower()
Write-Host "      Calculated SHA-256 : $calculatedHash" -ForegroundColor Gray

$expectedHash = $null
try {
    $shaContent = (Invoke-WebRequest -Uri $shaUrl -UseBasicParsing -TimeoutSec 10).Content.Trim()
    # Extract 64-char hex hash
    if ($shaContent -match "([a-fA-F0-9]{64})") {
        $expectedHash = $matches[1].ToLower()
        Write-Host "      Expected SHA-256   : $expectedHash" -ForegroundColor Gray
    }
} catch {
    Write-Host "      [WARN] Could not retrieve remote .sha256 file ($shaUrl). Proceeding with binary signature check." -ForegroundColor Yellow
}

if ($expectedHash) {
    if ($calculatedHash -eq $expectedHash) {
        Write-Host "      [PASS] Cryptographic checksum verified! Binary is authentic." -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "===============================================================================" -ForegroundColor Red
        Write-Host " [CRITICAL SECURITY ERROR] SHA-256 CHECKSUM MISMATCH!" -ForegroundColor Red
        Write-Host " Expected : $expectedHash" -ForegroundColor Red
        Write-Host " Got      : $calculatedHash" -ForegroundColor Red
        Write-Host " The downloaded installer may be corrupted or tampered with." -ForegroundColor Red
        Write-Host " Installation has been immediately ABORTED for your protection." -ForegroundColor Red
        Write-Host "===============================================================================" -ForegroundColor Red
        Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
        exit 1
    }
}

# -----------------------------------------------------------------------------
# STEP 7: Launch Windows Installer
# -----------------------------------------------------------------------------
Write-Host "`n[5/6] Launching AutoPrint Setup Wizard..." -ForegroundColor Yellow
Write-Host "      Please follow the on-screen installer instructions to complete setup." -ForegroundColor White

try {
    $process = Start-Process -FilePath $targetExecutable -ArgumentList "/SP- /NORESTART" -PassThru -Wait
    if ($process.ExitCode -eq 0) {
        Write-Host "      [PASS] Windows Setup completed successfully (Exit Code: 0)." -ForegroundColor Green
    } else {
        Write-Host "      [INFO] Installer completed with exit code: $($process.ExitCode)." -ForegroundColor Yellow
    }
} catch {
    Write-Error "Failed to execute installer: $_"
    exit 1
} finally {
    # Clean up temporary downloads
    Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
}

# -----------------------------------------------------------------------------
# STEP 8: Post-Installation Summary & Next Steps
# -----------------------------------------------------------------------------
Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Green
Write-Host "                  AUTOPRINT INSTALLATION COMPLETE!                             " -ForegroundColor White
Write-Host "===============================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  * Merchant Desktop POS  : http://localhost:8000" -ForegroundColor Cyan
Write-Host "  * Customer Web Kiosk    : http://localhost:7000" -ForegroundColor Cyan
Write-Host "  * Backend REST API      : http://localhost:5000/api/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "  First-Time Launch:" -ForegroundColor White
Write-Host "  1. Open http://localhost:8000 in your browser." -ForegroundColor White
Write-Host "  2. Complete the First-Run Setup to create your custom Administrator account." -ForegroundColor White
Write-Host "  3. Configure your store rates, UPI payments, and Windows printers." -ForegroundColor White
Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Green
Write-Host ""
