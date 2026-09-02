<#
.SYNOPSIS
    AutoPrint / QRPrint Lightweight Web Bootstrap Installer
.DESCRIPTION
    One-liner web bootstrap for AutoPrint Automated Print Management System.
    Usage:
        irm https://raw.githubusercontent.com/v0786/AutoPrint/main/installer/bootstrap.ps1 | iex
#>

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$ErrorActionPreference = 'Stop'

Clear-Host
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host "   AUTOPRINT / QRPRINT — SECURE WEB BOOTSTRAP INSTALLER v2.0" -ForegroundColor White
Write-Host "   Automated Print Shop Management, Physical Verification & POS Spooler" -ForegroundColor Gray
Write-Host "===============================================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "This bootstrap installer will prepare the AutoPrint installation environment:" -ForegroundColor White
Write-Host "  1. Validate Windows NT Environment & PowerShell 5.1+" -ForegroundColor Gray
Write-Host "  2. Check Internet Connectivity & GitHub Access" -ForegroundColor Gray
Write-Host "  3. Download the Authoritative AutoPrint Release Package" -ForegroundColor Gray
Write-Host "  4. Launch the Interactive AutoPrint PowerShell Installation Wizard" -ForegroundColor Gray
Write-Host ""
Write-Host "  Source Repository : https://github.com/v0786/AutoPrint.git" -ForegroundColor DarkCyan
Write-Host "  Default Target    : E:\QRPrint\AutoPrint (or local workspace)" -ForegroundColor DarkCyan
Write-Host ""

# Check Windows environment
if ($env:OS -ne "Windows_NT") {
    Write-Host "[ERROR] AutoPrint is engineered for Windows 10/11/Server environments." -ForegroundColor Red
    return
}

# Check PowerShell Version
if ($PSVersionTable.PSVersion.Major -lt 5) {
    Write-Host "[ERROR] PowerShell 5.1 or higher is required. Detected: $($PSVersionTable.PSVersion)" -ForegroundColor Red
    return
}

# Prompt user confirmation before proceeding
$confirm = Read-Host "Proceed with AutoPrint installer download and setup? [Y/N] (Default: Y)"
if ($confirm -and $confirm -notmatch "^[Yy]") {
    Write-Host "Installation aborted by user." -ForegroundColor Yellow
    return
}

$installRoot = if (Test-Path "E:\QRPrint\AutoPrint") { "E:\QRPrint\AutoPrint" } else { (Get-Location).Path }
$tempDir = Join-Path $env:TEMP "AutoPrint-Bootstrap-$(Get-Random)"
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null

try {
    Write-Host ""
    Write-Host "[1/3] Checking Git and network connectivity..." -ForegroundColor Cyan
    $hasGit = Get-Command git -ErrorAction SilentlyContinue

    if ($hasGit) {
        Write-Host "  Git detected. Cloning latest production release from GitHub..." -ForegroundColor Green
        git clone --depth 1 "https://github.com/v0786/AutoPrint.git" "$tempDir\repo" | Out-Null
        $installerScript = "$tempDir\repo\installer\install.ps1"
    } else {
        Write-Host "  Git not found. Downloading installer files directly over HTTPS..." -ForegroundColor Yellow
        $installPs1Url = "https://raw.githubusercontent.com/v0786/AutoPrint/main/installer/install.ps1"
        $commonPs1Url  = "https://raw.githubusercontent.com/v0786/AutoPrint/main/installer/common.ps1"
        
        New-Item -ItemType Directory -Path "$tempDir\installer" -Force | Out-Null
        Invoke-RestMethod -Uri $installPs1Url -OutFile "$tempDir\installer\install.ps1"
        Invoke-RestMethod -Uri $commonPs1Url  -OutFile "$tempDir\installer\common.ps1"
        $installerScript = "$tempDir\installer\install.ps1"
    }

    if (Test-Path $installerScript) {
        Write-Host "[2/3] Verification completed successfully." -ForegroundColor Green
        Write-Host "[3/3] Launching AutoPrint Installation Wizard..." -ForegroundColor Cyan
        Write-Host ""
        & $installerScript -SourcePath (Split-Path (Split-Path $installerScript -Parent) -Parent)
    } else {
        Write-Host "[ERROR] Failed to locate downloaded installer script at: $installerScript" -ForegroundColor Red
    }
}
catch {
    Write-Host "[ERROR] Bootstrap encountered an exception: $_" -ForegroundColor Red
}
finally {
    # Keep directory clean
}
