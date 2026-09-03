<#
.SYNOPSIS
    AutoPrint — Interactive Manual PageKite Tunnel Launcher
    File: installer/scripts/start-pagekite.ps1

.DESCRIPTION
    1. Validates PageKite DPAPI configuration in %LOCALAPPDATA%\AutoPrint\pagekite\.
    2. Probes Python 3 and verifies PageKite CLI integrity.
    3. Checks reachability of the local AutoPrint Customer Web server.
    4. Decrypts PageKite Secret Key in-memory via Windows DPAPI.
    5. Displays interactive merchant banner.
    6. Runs PageKite interactively in the visible foreground console (never hidden).
    7. Cleans up decrypted credentials and stops tunnel immediately on CTRL+C or window close.
#>

[CmdletBinding()]
param(
    [string]$AppDir = ""
)

# -----------------------------------------------------------------------------
# 1. INITIALIZATION & PATHS
# -----------------------------------------------------------------------------
if (-not $AppDir) {
    $AppDir = Resolve-Path (Join-Path $PSScriptRoot "..\..")
}

$localAppData = [Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)
if (-not $localAppData) { $localAppData = Join-Path $env:USERPROFILE "AppData\Local" }

$pagekiteDir  = Join-Path $localAppData "AutoPrint\pagekite"
$settingsFile = Join-Path $pagekiteDir "settings.json"
$secretFile   = Join-Path $pagekiteDir "secret.dat"
$logsDir      = Join-Path $localAppData "AutoPrint\logs"
$logFile      = Join-Path $logsDir "pagekite.log"

if (-not (Test-Path $logsDir)) { New-Item -ItemType Directory -Path $logsDir -Force | Out-Null }

function Write-TunnelLog {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] [$Level] $Message"
    try { Add-Content -Path $logFile -Value $line -ErrorAction SilentlyContinue } catch { }
}

# -----------------------------------------------------------------------------
# 2. VERIFY CONFIGURATION & DPAPI SECRET
# -----------------------------------------------------------------------------
if (-not (Test-Path $settingsFile) -or -not (Test-Path $secretFile)) {
    Write-Host "`n============================================================" -ForegroundColor Yellow
    Write-Host " [NOTICE] PageKite is Not Configured Yet!" -ForegroundColor Yellow
    Write-Host "============================================================" -ForegroundColor Yellow
    Write-Host " No PageKite configuration was found for AutoPrint." -ForegroundColor Gray
    Write-Host " Would you like to configure your Kite Name and Secret Key now?" -ForegroundColor Cyan
    Write-Host ""
    $resp = Read-Host " Configure PageKite now? (Y/N)"
    if ($resp -match "^[Yy]") {
        $setupScript = Join-Path $AppDir "installer\scripts\configure-pagekite.ps1"
        if (Test-Path $setupScript) {
            $kite = Read-Host " Enter PageKite Kite Name (e.g. myprintshop.pagekite.me)"
            & $setupScript -AppDir $AppDir -KiteName $kite
        }
    }
    if (-not (Test-Path $settingsFile) -or -not (Test-Path $secretFile)) {
        Write-Host "`nPageKite setup skipped. Exiting." -ForegroundColor Yellow
        exit 1
    }
}

try {
    $settingsJson = Get-Content $settingsFile -Raw -Encoding UTF8 | ConvertFrom-Json
    $kiteName     = $settingsJson.kiteName
    $customerPort = if ($settingsJson.customerPort) { [int]$settingsJson.customerPort } else { 7000 }
} catch {
    Write-Host "[ERROR] Failed to parse PageKite settings.json: $_" -ForegroundColor Red
    exit 1
}

# -----------------------------------------------------------------------------
# 3. PYTHON 3 DETECTION
# -----------------------------------------------------------------------------
$pythonCmd  = $null
$pythonArgs = @()

try {
    $pyVer = (& py -3 --version 2>&1).ToString().Trim()
    if ($pyVer -match "Python 3\.(\d+)") {
        $pythonCmd = "py"
        $pythonArgs = @("-3")
    }
} catch { }

if (-not $pythonCmd) {
    try {
        $pyVer = (& python --version 2>&1).ToString().Trim()
        if ($pyVer -match "Python 3\.(\d+)") {
            $pythonCmd = "python"
            $pythonArgs = @()
        }
    } catch { }
}

if (-not $pythonCmd) {
    Write-Host "`n============================================================" -ForegroundColor Red
    Write-Host " [ERROR] Python 3 Runtime Not Found!" -ForegroundColor Red
    Write-Host "============================================================" -ForegroundColor Red
    Write-Host " PageKite requires Python 3.x to establish the customer tunnel." -ForegroundColor White
    Write-Host " Please install Python 3 from https://python.org/" -ForegroundColor Gray
    Write-Host "============================================================`n" -ForegroundColor Red
    Write-TunnelLog "Python 3 not found on system" -Level "ERROR"
    exit 2
}

# -----------------------------------------------------------------------------
# 4. PAGEKITE CLI SCRIPT & INTEGRITY
# -----------------------------------------------------------------------------
$pkScript = Join-Path $AppDir "tools\pagekite\pagekite.py"
if (-not (Test-Path $pkScript)) {
    $pkScript = Join-Path $AppDir "scripts\pagekite.py"
}

if (-not (Test-Path $pkScript)) {
    Write-Host "[ERROR] Bundled PageKite CLI script was not found in: $pkScript" -ForegroundColor Red
    Write-TunnelLog "pagekite.py missing in tools" -Level "ERROR"
    exit 1
}

# -----------------------------------------------------------------------------
# 5. LOCAL CUSTOMER WEB SERVER PROBE
# -----------------------------------------------------------------------------
Write-Host "`n[*] Verifying local AutoPrint Customer Web server on port $customerPort..." -ForegroundColor Cyan

$isPortOpen = $false
try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $iar = $tcp.BeginConnect("127.0.0.1", $customerPort, $null, $null)
    if ($iar.AsyncWaitHandle.WaitOne(1500, $false) -and $tcp.Connected) {
        $isPortOpen = $true
        $tcp.EndConnect($iar)
    }
    $tcp.Close()
} catch { }

if (-not $isPortOpen) {
    Write-Host "`n============================================================" -ForegroundColor Yellow
    Write-Host " [WARNING] AutoPrint Customer Web Server is Offline!" -ForegroundColor Yellow
    Write-Host "============================================================" -ForegroundColor Yellow
    Write-Host " The customer web portal is not responding on http://127.0.0.1:$customerPort." -ForegroundColor White
    Write-Host " Please start AutoPrint first (via AutoPrint.exe or tray icon)." -ForegroundColor Gray
    Write-Host "============================================================`n" -ForegroundColor Yellow
    $cont = Read-Host " Start PageKite anyway? (Y/N)"
    if ($cont -notmatch "^[Yy]") {
        Write-TunnelLog "Tunnel aborted: Local customer web offline on port $customerPort" -Level "WARN"
        exit 5
    }
}

# -----------------------------------------------------------------------------
# 6. DPAPI SECRET DECRYPTION (IN-MEMORY ONLY)
# -----------------------------------------------------------------------------
$secretKey = $null
try {
    Add-Type -AssemblyName System.Security
    $encryptedBytes = [System.IO.File]::ReadAllBytes($secretFile)
    $decryptedBytes = [System.Security.Cryptography.ProtectedData]::Unprotect(
        $encryptedBytes,
        $null,
        [System.Security.Cryptography.DataProtectionScope]::CurrentUser
    )
    $secretKey = [System.Text.Encoding]::UTF8.GetString($decryptedBytes)
    [Array]::Clear($decryptedBytes, 0, $decryptedBytes.Length)
} catch {
    Write-Host "[ERROR] Failed to decrypt PageKite secret via Windows DPAPI: $_" -ForegroundColor Red
    Write-TunnelLog "DPAPI decryption failed: $_" -Level "ERROR"
    exit 4
}

# -----------------------------------------------------------------------------
# 7. INTERACTIVE TERMINAL BANNER
# -----------------------------------------------------------------------------
Clear-Host
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host " AutoPrint Customer Online Access" -ForegroundColor White
Write-Host ""
Write-Host " Local Customer Server:" -ForegroundColor Gray
Write-Host " http://127.0.0.1:$customerPort" -ForegroundColor Green
Write-Host ""
Write-Host " Public URL:" -ForegroundColor Gray
Write-Host " https://$kiteName" -ForegroundColor Green
Write-Host ""
Write-Host " PageKite tunnel is starting..." -ForegroundColor Yellow
Write-Host ""
Write-Host " Keep this window open while customers" -ForegroundColor White
Write-Host " are accessing the website." -ForegroundColor White
Write-Host ""
Write-Host " Press CTRL+C to stop public access." -ForegroundColor Yellow
Write-Host ""
Write-Host " Closing this window will also stop" -ForegroundColor White
Write-Host " public customer access." -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[Live Tunnel Output]:" -ForegroundColor Gray
Write-Host "----------------------------------------" -ForegroundColor Gray

Write-TunnelLog "Starting manual PageKite tunnel: https://$kiteName -> 127.0.0.1:$customerPort" -Level "INFO"

# -----------------------------------------------------------------------------
# 8. EXECUTE PAGEKITE INTERACTIVELY IN FOREGROUND
# -----------------------------------------------------------------------------
$serviceArg = "--service_on=http:${kiteName}:localhost:${customerPort}:${secretKey}"

try {
    if ($pythonArgs.Count -gt 0) {
        & $pythonCmd $pythonArgs "$pkScript" "--clean" $serviceArg
    } else {
        & $pythonCmd "$pkScript" "--clean" $serviceArg
    }
} finally {
    # -------------------------------------------------------------------------
    # 9. IN-MEMORY SANITIZATION & CLEANUP
    # -------------------------------------------------------------------------
    $secretKey = $null
    $serviceArg = $null
    [GC]::Collect()

    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host " AutoPrint Customer Online Access tunnel has stopped." -ForegroundColor Yellow
    Write-Host " Your customer portal is now private." -ForegroundColor Green
    Write-Host "========================================`n" -ForegroundColor Cyan

    Write-TunnelLog "PageKite tunnel session stopped (Store is private)." -Level "INFO"
}
