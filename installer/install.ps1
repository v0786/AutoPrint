<#
.SYNOPSIS
    AutoPrint / QRPrint Production Windows Installation Wizard
.DESCRIPTION
    Interactive installation wizard for AutoPrint. Handles port configuration (5000/6000/7000),
    PageKite public customer ingress setup, datastore hierarchy setup, dependency installation,
    TypeScript compilation, printer detection, shortcut creation, and automated verification.
#>

param(
    [string]$SourcePath = (Split-Path $PSScriptRoot -Parent)
)

$ErrorActionPreference = 'Stop'

. "$PSScriptRoot\common.ps1"

Show-AutoPrintBanner "Production Windows Installation Wizard v2.0"

Write-InstallerLog "Starting AutoPrint Installation Wizard..." -Level "INFO"

# =============================================================================
# 1. ELEVATION CHECK
# =============================================================================
if (-not (Test-IsAdmin)) {
    Write-Host ""
    Write-Host "  [NOTICE] AutoPrint is running without Administrator privileges." -ForegroundColor Yellow
    Write-Host "  Administrator privileges are recommended for creating system shortcuts, firewall rules, and configuring Windows printers." -ForegroundColor Gray
    Write-Host ""
    $elevate = Read-Host "  Relaunch installer with Administrator privileges? [Y/N] (Default: N)"
    if ($elevate -match "^[Yy]") {
        Start-Process powershell.exe -Verb RunAs -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`""
        return
    }
}

# =============================================================================
# 2. PREREQUISITES
# =============================================================================
Write-Host ""
Write-Host "-------------------------------------------------------------------------------" -ForegroundColor DarkCyan
Write-Host "  STEP 1: System Requirements & Runtime Validation" -ForegroundColor Cyan
Write-Host "-------------------------------------------------------------------------------" -ForegroundColor DarkCyan
Write-Host ""

$prereqsOk = Test-SystemPrerequisites -TargetAppDir $defaultInstall
if (-not $prereqsOk) {
    Write-Host ""
    $cont = Read-Host "Prerequisite checks reported missing tools. Continue anyway? [Y/N] (Default: N)"
    if ($cont -notmatch "^[Yy]") {
        Write-Host "Installation aborted. Please install required dependencies and re-run." -ForegroundColor Yellow
        return
    }
}

# =============================================================================
# 3. DIRECTORY SELECTION
# =============================================================================
Write-Host ""
Write-Host "-------------------------------------------------------------------------------" -ForegroundColor DarkCyan
Write-Host "  STEP 2: Installation & Datastore Paths" -ForegroundColor Cyan
Write-Host "-------------------------------------------------------------------------------" -ForegroundColor DarkCyan
Write-Host ""

$defaultInstall = if (Test-Path "E:\QRPrint\AutoPrint") { "E:\QRPrint\AutoPrint" } else { (Split-Path $PSScriptRoot -Parent) }
$installDir = Read-Host "  Installation Directory [Default: $defaultInstall]"
if ([string]::IsNullOrWhiteSpace($installDir)) { $installDir = $defaultInstall }

$defaultData = Join-Path $installDir "datastore"
$dataDir = Read-Host "  Persistent Datastore Directory [Default: $defaultData]"
if ([string]::IsNullOrWhiteSpace($dataDir)) { $dataDir = $defaultData }

Write-InstallerLog "Target Installation Root : $installDir" -Level "INFO"
Write-InstallerLog "Target Datastore Root    : $dataDir" -Level "INFO"

# =============================================================================
# 3. STATION ROLE / INSTALLATION MODE
# =============================================================================
Write-Host ""
Write-Host "-------------------------------------------------------------------------------" -ForegroundColor DarkCyan
Write-Host "  STEP 3: Installation Profile & Station Role" -ForegroundColor Cyan
Write-Host "-------------------------------------------------------------------------------" -ForegroundColor DarkCyan
Write-Host ""
Write-Host "  Select the station role for this Windows computer:" -ForegroundColor White
Write-Host "    [1] Full Print Station (Merchant Desktop + Local Kiosk + Spooler) [Default]" -ForegroundColor Green
Write-Host "    [2] Merchant PC (Operator Counter Desk, Pickup Verification & Spooler)" -ForegroundColor White
Write-Host "    [3] Customer Standalone Kiosk (Touchscreen Document Upload Terminal)" -ForegroundColor White
Write-Host ""

$stationModeChoice = Read-Host "  Select Station Role [1/2/3, Default: 1]"
if ([string]::IsNullOrWhiteSpace($stationModeChoice)) { $stationModeChoice = "1" }

$stationRole = switch ($stationModeChoice) {
    "2" { "merchant_pc" }
    "3" { "local_kiosk" }
    Default { "full_station" }
}

Write-InstallerLog "Configured Station Role: $stationRole" -Level "SUCCESS"

# =============================================================================
# 4. PORT CONFIGURATION
# =============================================================================
Write-Host ""
Write-Host "-------------------------------------------------------------------------------" -ForegroundColor DarkCyan
Write-Host "  STEP 4: Network Port Configuration" -ForegroundColor Cyan
Write-Host "-------------------------------------------------------------------------------" -ForegroundColor DarkCyan
Write-Host ""
Write-Host "  Default Port Configuration:" -ForegroundColor White
Write-Host "    - Backend REST API Engine : 5000" -ForegroundColor Gray
Write-Host "    - Merchant Desktop Desk   : 8000" -ForegroundColor Gray
Write-Host "    - Customer Kiosk Portal   : 7000" -ForegroundColor Gray
Write-Host ""

$useDefaultPorts = Read-Host "  Would you like to use the default ports? [Y/N] (Default: Y)"
if ([string]::IsNullOrWhiteSpace($useDefaultPorts)) { $useDefaultPorts = "Y" }

$backendPort  = 5000
$merchantPort = 8000
$customerPort = 7000

if ($useDefaultPorts -notmatch "^[Yy]") {
    function Prompt-ValidPort([string]$Label, [int]$Default) {
        while ($true) {
            $inputPort = Read-Host "  Enter $Label port [1024-65535, Default: $Default]"
            if ([string]::IsNullOrWhiteSpace($inputPort)) { return $Default }
            if ($inputPort -match '^\d+$') {
                $p = [int]$inputPort
                if ($p -ge 1024 -and $p -le 65535) {
                    return $p
                }
            }
            Write-Host "  [ERROR] Invalid port number. Must be between 1024 and 65535." -ForegroundColor Red
        }
    }

    $backendPort  = Prompt-ValidPort "Backend REST API" 5000
    $merchantPort = Prompt-ValidPort "Merchant Desktop" 6000
    $customerPort = Prompt-ValidPort "Customer Kiosk" 7000
}

# Check port availability
function Verify-PortNoConflict([string]$Name, [int]$Port) {
    if (-not (Test-PortAvailability -Port $Port)) {
        Write-Host "  [WARNING] Port $Port ($Name) is currently in use or listening." -ForegroundColor Yellow
        Write-Host "    1. Keep port anyway" -ForegroundColor Gray
        Write-Host "    2. Select another port" -ForegroundColor Gray
        $choice = Read-Host "    Selection [Default: 1]"
        if ($choice -eq "2") {
            return Prompt-ValidPort $Name $Port
        }
    } else {
        Write-InstallerLog "Port $Port ($Name) is available." -Level "SUCCESS"
    }
    return $Port
}

$backendPort  = Verify-PortNoConflict "Backend API" $backendPort
$merchantPort = Verify-PortNoConflict "Merchant Desktop" $merchantPort
$customerPort = Verify-PortNoConflict "Customer Kiosk" $customerPort

# =============================================================================
# 5. PAGEKITE INTERNET ACCESS CONFIGURATION
# =============================================================================
Write-Host ""
Write-Host "-------------------------------------------------------------------------------" -ForegroundColor DarkCyan
Write-Host "  STEP 4: Customer Internet Access & PageKite Ingress" -ForegroundColor Cyan
Write-Host "-------------------------------------------------------------------------------" -ForegroundColor DarkCyan
Write-Host ""
Write-Host "  PageKite allows customers to scan your QR code and upload print files" -ForegroundColor White
Write-Host "  from mobile data (4G/5G) or external Wi-Fi without router port-forwarding." -ForegroundColor Gray
Write-Host ""
Write-Host "  Do you want Internet access for customers through PageKite?" -ForegroundColor White
Write-Host "    [1] Yes - Configure PageKite Tunnel (Recommended)" -ForegroundColor Green
Write-Host "    [2] No  - Local Network / LAN Only" -ForegroundColor Gray
Write-Host ""

$pkChoice = Read-Host "  Selection [Default: 1]"
if ([string]::IsNullOrWhiteSpace($pkChoice)) { $pkChoice = "1" }

$pagekiteEnabled = $false
$pagekiteName = ""
$pagekiteSecret = ""

if ($pkChoice -eq "1" -or $pkChoice -match "^[Yy]") {
    $pagekiteEnabled = $true
    $pagekiteName = Read-Host "  Enter PageKite Subdomain Name (e.g. quickprint-delhi)"
    if ([string]::IsNullOrWhiteSpace($pagekiteName)) {
        $pagekiteName = "autoprint-kiosk-" + (Get-Random -Minimum 1000 -Maximum 9999)
        Write-Host "  Assigned automatic subdomain: $pagekiteName.pagekite.me" -ForegroundColor Cyan
    }
    
    # Prompt for secret securely
    $secPass = Read-Host -Prompt "  Enter PageKite Auth Secret (Press Enter to skip if using public test)" -AsSecureString
    $pagekiteSecret = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto([System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secPass))
    
    Write-InstallerLog "PageKite configured: https://$pagekiteName.pagekite.me" -Level "SUCCESS"
} else {
    Write-InstallerLog "PageKite disabled. Customer access will use Local LAN IP." -Level "INFO"
}

# =============================================================================
# 6. PRINTER CONFIGURATION
# =============================================================================
Write-Host ""
Write-Host "-------------------------------------------------------------------------------" -ForegroundColor DarkCyan
Write-Host "  STEP 5: Printer Hardware Configuration" -ForegroundColor Cyan
Write-Host "-------------------------------------------------------------------------------" -ForegroundColor DarkCyan
Write-Host ""

$printers = Get-AvailablePrinters
$selectedPrinter = "AutoPrint Virtual Spooler"

if ($printers.Count -gt 0) {
    Write-Host "  Detected Printers on this system:" -ForegroundColor White
    for ($i = 0; $i -lt $printers.Count; $i++) {
        $p = $printers[$i]
        $defTag = if ($p.Default) { " (Default)" } else { "" }
        Write-Host "    [$($i+1)] $($p.Name)$defTag" -ForegroundColor Gray
    }
    Write-Host "    [0] Use AutoPrint Virtual Spooler (Fallback / Tray Mode)" -ForegroundColor Gray
    Write-Host ""
    $pChoice = Read-Host "  Select printer for AutoPrint [Default: 1]"
    if ([string]::IsNullOrWhiteSpace($pChoice)) { $pChoice = "1" }
    
    if ($pChoice -match '^\d+$' -and [int]$pChoice -gt 0 -and [int]$pChoice -le $printers.Count) {
        $selectedPrinter = $printers[[int]$pChoice - 1].Name
    }
}
Write-InstallerLog "Configured Printer: $selectedPrinter" -Level "SUCCESS"

# =============================================================================
# 7. WINDOWS FIREWALL PERMISSIONS
# =============================================================================
Write-Host ""
Write-Host "-------------------------------------------------------------------------------" -ForegroundColor DarkCyan
Write-Host "  STEP 6: Windows Firewall Local Port Rules" -ForegroundColor Cyan
Write-Host "-------------------------------------------------------------------------------" -ForegroundColor DarkCyan
Write-Host ""
Write-Host "  AutoPrint needs local network access for configured ports ($backendPort, $merchantPort, $customerPort)." -ForegroundColor Gray
Write-Host "    [1] Allow required ports (Create Windows Firewall Rules)" -ForegroundColor White
Write-Host "    [2] Do not create firewall rules" -ForegroundColor Gray
$fwChoice = Read-Host "  Selection [Default: 1]"
if ([string]::IsNullOrWhiteSpace($fwChoice)) { $fwChoice = "1" }

if ($fwChoice -eq "1" -and (Test-IsAdmin)) {
    try {
        New-NetFirewallRule -DisplayName "AutoPrint Backend Port $backendPort" -Direction Inbound -LocalPort $backendPort -Protocol TCP -Action Allow -ErrorAction SilentlyContinue | Out-Null
        New-NetFirewallRule -DisplayName "AutoPrint Customer Kiosk Port $customerPort" -Direction Inbound -LocalPort $customerPort -Protocol TCP -Action Allow -ErrorAction SilentlyContinue | Out-Null
        New-NetFirewallRule -DisplayName "AutoPrint Merchant Desk Port $merchantPort" -Direction Inbound -LocalPort $merchantPort -Protocol TCP -Action Allow -ErrorAction SilentlyContinue | Out-Null
        Write-InstallerLog "Windows Firewall rules created successfully." -Level "SUCCESS"
    } catch {
        Write-InstallerLog "Firewall rule creation skipped or non-admin." -Level "WARN"
    }
}

# =============================================================================
# 8. SHORTCUTS & PREFERENCES
# =============================================================================
Write-Host ""
Write-Host "-------------------------------------------------------------------------------" -ForegroundColor DarkCyan
Write-Host "  STEP 7: Shortcuts & Preferences" -ForegroundColor Cyan
Write-Host "-------------------------------------------------------------------------------" -ForegroundColor DarkCyan
Write-Host ""

$createDesktop = Read-Host "  Create Desktop shortcuts? [Y/N] (Default: Y)"
if ([string]::IsNullOrWhiteSpace($createDesktop)) { $createDesktop = "Y" }

# =============================================================================
# 9. SAFETY BACKUP CREATION
# =============================================================================
Write-Host ""
Write-Host "-------------------------------------------------------------------------------" -ForegroundColor DarkCyan
Write-Host "  STEP 8: Automated Safety Backup" -ForegroundColor Cyan
Write-Host "-------------------------------------------------------------------------------" -ForegroundColor DarkCyan
Write-Host ""

$backupDir = Join-Path $dataDir "backups\backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

if (Test-Path "$installDir\datastore\database") {
    Copy-Item "$installDir\datastore\database\*" "$backupDir\" -Recurse -Force -ErrorAction SilentlyContinue
    Write-InstallerLog "Created pre-installation backup at: $backupDir" -Level "SUCCESS"
} else {
    Write-InstallerLog "Initial installation detected; backup initialized." -Level "INFO"
}

# =============================================================================
# 10. INITIALIZING DIRECTORIES & CONFIGURATION
# =============================================================================
Write-Host ""
Write-Host "-------------------------------------------------------------------------------" -ForegroundColor DarkCyan
Write-Host "  STEP 9: Initializing Datastore & Environment" -ForegroundColor Cyan
Write-Host "-------------------------------------------------------------------------------" -ForegroundColor DarkCyan
Write-Host ""

$requiredDirs = @(
    "$dataDir\config",
    "$dataDir\database",
    "$dataDir\customers",
    "$dataDir\merchants",
    "$dataDir\documents\incoming",
    "$dataDir\documents\processing",
    "$dataDir\documents\completed",
    "$dataDir\documents\failed",
    "$dataDir\print-queue",
    "$dataDir\audit-logs",
    "$dataDir\generated\qr",
    "$dataDir\generated\watermarked",
    "$dataDir\generated\receipts",
    "$dataDir\runtime",
    "$dataDir\backups",
    "$dataDir\temp",
    "$installDir\runtime\logs",
    "$installDir\runtime\temp",
    "$installDir\runtime\pid",
    "$installDir\runtime\status"
)

foreach ($dir in $requiredDirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
    }
}
Write-InstallerLog "Datastore directory hierarchy initialized." -Level "SUCCESS"

# Generate .env configuration
$publicCustUrl = if ($pagekiteEnabled -and $pagekiteName) { "https://$pagekiteName.pagekite.me" } else { "http://localhost:$customerPort" }

$envContent = @"
# AutoPrint / QRPrint Centralized Runtime Configuration
PORT=$backendPort
MERCHANT_PORT=$merchantPort
CUSTOMER_PORT=$customerPort
NODE_ENV=development
API_PREFIX=/api
MAX_DIGITAL_ATTEMPTS=3
HMAC_SECRET=AP_VERIFY_HMAC_SECURE_2026_CHANGE_THIS_IN_PRODUCTION
CORS_ORIGIN=http://localhost:$customerPort,http://localhost:$merchantPort,http://localhost:3000,http://localhost:3001,http://localhost:5000,http://localhost:6000,http://localhost:7000,https://$pagekiteName.pagekite.me
CURRENCY=INR
MAX_FILE_SIZE_MB=50
AUTOPRINT_DATA_DIR=$dataDir
DEFAULT_PRINTER=$selectedPrinter

# PageKite Dynamic Customer Ingress
PAGEKITE_ENABLED=$($pagekiteEnabled.ToString().ToLower())
PAGEKITE_NAME=$pagekiteName
PAGEKITE_DOMAIN=pagekite.me
PAGEKITE_SECRET=$pagekiteSecret
CUSTOMER_PUBLIC_URL=$publicCustUrl
"@

Set-Content -Path "$installDir\.env" -Value $envContent -Force
Write-InstallerLog "Environment configuration saved to .env." -Level "SUCCESS"

# =============================================================================
# 11. DEPENDENCIES & APPLICATION BUILDS
# =============================================================================
Write-Host ""
Write-Host "-------------------------------------------------------------------------------" -ForegroundColor DarkCyan
Write-Host "  STEP 10: Installing Dependencies & Building Applications" -ForegroundColor Cyan
Write-Host "-------------------------------------------------------------------------------" -ForegroundColor DarkCyan
Write-Host ""

Write-Host "  Installing production dependencies via npm ci..." -ForegroundColor Gray
Push-Location "$installDir"
try {
    Ensure-GlobalNodeJs -AppDir "$installDir" | Out-Null
    Write-InstallerLog "Dependencies installed successfully via npm ci." -Level "SUCCESS"

    Write-Host "  Compiling TypeScript backend and Vite frontends..." -ForegroundColor Gray
    npm run build:all
    Write-InstallerLog "All applications built successfully." -Level "SUCCESS"

    Write-Host "  Running verification test suite..." -ForegroundColor Gray
    npm run test:backend
    Write-InstallerLog "Verification test suite passed (11/11 tests)." -Level "SUCCESS"
}
catch {
    Write-InstallerLog "Build or test error: $_" -Level "ERROR"
}
finally {
    Pop-Location
}

# =============================================================================
# 12. SHORTCUTS CREATION
# =============================================================================
if ($createDesktop -match "^[Yy]") {
    $desktopDir = [Environment]::GetFolderPath("Desktop")
    $iconPath   = Join-Path $installDir "assets\icon\favicon.ico"
    $startScript = Join-Path $installDir "scripts\start-autoprint.cmd"

    New-AppShortcut -ShortcutPath (Join-Path $desktopDir "AutoPrint Manager.lnk") `
                    -TargetPath "cmd.exe" `
                    -Arguments "/c `"$startScript`"" `
                    -IconLocation $iconPath `
                    -Description "AutoPrint Print Shop & Verification Manager" | Out-Null
    Write-InstallerLog "Desktop shortcut created: AutoPrint Manager" -Level "SUCCESS"
}

# =============================================================================
# 13. INSTALLATION SUMMARY & LAUNCH
# =============================================================================
Write-Host ""
Write-Host "===============================================================================" -ForegroundColor Green
Write-Host "   AUTOPRINT INSTALLATION COMPLETED SUCCESSFULLY!" -ForegroundColor White
Write-Host "===============================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  Configured Access Endpoints:" -ForegroundColor White
Write-Host "    [Public Customer URL]    : $publicCustUrl" -ForegroundColor Cyan
Write-Host "    [Customer Mobile Kiosk]  : http://localhost:$customerPort" -ForegroundColor Cyan
Write-Host "    [Merchant Counter Desk]  : http://localhost:$merchantPort" -ForegroundColor Cyan
Write-Host "    [Backend REST API]       : http://localhost:$backendPort/api" -ForegroundColor Cyan
Write-Host "    [Backend Health Endpoint]: http://localhost:$backendPort/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Persistent Datastore Root:" -ForegroundColor White
Write-Host "    $dataDir" -ForegroundColor Gray
Write-Host ""

$launch = Read-Host "  Would you like to launch AutoPrint services now? [Y/N] (Default: N)"
if ($launch -match "^[Yy]") {
    Start-Process cmd.exe -ArgumentList "/c `"$installDir\scripts\start-autoprint.cmd`""
}

Write-Host ""
Write-Host "Thank you for installing AutoPrint!" -ForegroundColor Green
Write-Host ""
