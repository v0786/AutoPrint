<#
.SYNOPSIS
    AutoPrint Installer — Shared Helper Library
.DESCRIPTION
    Common routines for UI, logging, administrative elevation, port validation,
    printer detection, and shortcut management.
#>

function Show-AutoPrintBanner {
    param([string]$Subtitle = "Production Windows Installation Wizard v2.0")
    Clear-Host
    Write-Host "===============================================================================" -ForegroundColor Cyan
    Write-Host "   AUTOPRINT / QRPRINT — SECURE PRINT MANAGEMENT & VERIFICATION" -ForegroundColor White
    Write-Host "   $Subtitle" -ForegroundColor Gray
    Write-Host "===============================================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Write-InstallerLog {
    param(
        [string]$Message,
        [ValidateSet("INFO", "WARN", "ERROR", "SUCCESS")]
        [string]$Level = "INFO"
    )

    $logDir = Join-Path (Split-Path $PSScriptRoot -Parent) "runtime\logs"
    if (-not (Test-Path $logDir)) {
        $logDir = Join-Path $PSScriptRoot "logs"
        if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
    }

    $logFile = Join-Path $logDir "installer-$(Get-Date -Format 'yyyy-MM-dd').log"
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logLine = "[$timestamp] [$Level] $Message"

    Add-Content -Path $logFile -Value $logLine -ErrorAction SilentlyContinue

    switch ($Level) {
        "SUCCESS" { Write-Host "  [SUCCESS] $Message" -ForegroundColor Green }
        "WARN"    { Write-Host "  [WARNING] $Message" -ForegroundColor Yellow }
        "ERROR"   { Write-Host "  [ERROR]   $Message" -ForegroundColor Red }
        Default   { Write-Host "  [INFO]    $Message" -ForegroundColor Gray }
    }
}

function Test-IsAdmin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Test-PortAvailability {
    param([int]$Port)
    try {
        $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        return ($null -eq $connection)
    } catch {
        # Fallback check
        $socket = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
        try {
            $socket.Start()
            $socket.Stop()
            return $true
        } catch {
            return $false
        }
    }
}

function Get-AvailablePrinters {
    try {
        $printers = Get-CimInstance Win32_Printer | Select-Object Name, Default, PrinterStatus, DriverName, PortName
        return @($printers)
    } catch {
        return @()
    }
}

function New-AppShortcut {
    param(
        [string]$ShortcutPath,
        [string]$TargetPath,
        [string]$Arguments = "",
        [string]$IconLocation = "",
        [string]$Description = "AutoPrint Print Management System"
    )
    try {
        $wshShell = New-Object -ComObject WScript.Shell
        $shortcut = $wshShell.CreateShortcut($ShortcutPath)
        $shortcut.TargetPath = $TargetPath
        $shortcut.Arguments = $Arguments
        $shortcut.Description = $Description
        if ($IconLocation -and (Test-Path $IconLocation)) {
            $shortcut.IconLocation = $IconLocation
        }
        $shortcut.Save()
        return $true
    } catch {
        Write-InstallerLog "Failed to create shortcut at $ShortcutPath: $_" -Level "WARN"
        return $false
    }
}

function Ensure-GlobalNodeJs {
    param(
        [string]$AppDir = "",
        [switch]$SkipDependencies = $false
    )

    $ensureScript = Join-Path $PSScriptRoot "scripts\ensure-node.ps1"
    if (-not (Test-Path $ensureScript)) {
        $ensureScript = Join-Path (Split-Path $PSScriptRoot -Parent) "installer\scripts\ensure-node.ps1"
    }

    if (Test-Path $ensureScript) {
        $argsList = @("-ExecutionPolicy", "Bypass", "-File", "`"$ensureScript`"")
        if ($AppDir) { $argsList += @("-AppDir", "`"$AppDir`"") }
        if ($SkipDependencies) { $argsList += "-SkipDependencies" }

        & powershell.exe $argsList
        return ($LASTEXITCODE -eq 0)
    } else {
        Write-InstallerLog "Could not locate ensure-node.ps1 script." -Level "ERROR"
        return $false
    }
}

function Test-SystemPrerequisites {
    param([string]$TargetAppDir = "")
    $passed = $true

    Write-Host "Verifying System Prerequisites & Global Node.js Runtime:" -ForegroundColor White

    $nodeOk = Ensure-GlobalNodeJs -AppDir $TargetAppDir -SkipDependencies
    if (-not $nodeOk) {
        Write-InstallerLog "Global Node.js runtime validation failed." -Level "ERROR"
        $passed = $false
    }

    # Disk Space Check (>500MB)
    try {
        $drive = Get-PSDrive (Get-Location).Drive.Name -ErrorAction SilentlyContinue
        if ($drive -and $drive.Free -gt 500MB) {
            $freeGB = [math]::Round($drive.Free / 1GB, 2)
            Write-InstallerLog "Free disk space available: $freeGB GB" -Level "SUCCESS"
        }
    } catch { }

    return $passed
}

Export-ModuleMember -Function Show-AutoPrintBanner, Write-InstallerLog, Test-IsAdmin, Test-PortAvailability, Get-AvailablePrinters, New-AppShortcut, Ensure-GlobalNodeJs, Test-SystemPrerequisites -ErrorAction SilentlyContinue
