<#
.SYNOPSIS
    AutoPrint — Global Node.js Runtime & Dependency Management Engine
    File: installer/scripts/ensure-node.ps1

.DESCRIPTION
    1. Detects existing global Node.js installations via PATH, Registry (HKLM/WOW6432Node), and standard paths.
    2. Performs robust semantic version comparison against configured minimum requirements.
    3. Securely downloads official Node.js MSI from nodejs.org over HTTPS (TLS 1.2/1.3).
    4. Cryptographically verifies SHA-256 checksum and Authenticode digital signatures.
    5. Silently installs Node.js globally using msiexec (/qn /norestart).
    6. Refreshes current and child process environment PATH without duplication.
    7. Validates node and npm execution.
    8. Deterministically bootstraps production dependencies via `npm ci --omit=dev`.
#>

[CmdletBinding()]
param(
    [string]$AppDir = "",
    [string]$LogPath = "",
    [switch]$SkipDependencies = $false,
    [switch]$NonInteractive = $false
)

# -----------------------------------------------------------------------------
# 1. CENTRAL CONFIGURATION
# -----------------------------------------------------------------------------
$Global:NodeConfig = @{
    TargetVersion       = "20.18.0"              # Official Node.js LTS Release
    MinVersion          = "18.0.0"               # Minimum supported Node.js version
    DistributionBaseUrl = "https://nodejs.org/dist"
    InstallerName       = "node-v20.18.0-x64.msi"
    ExpectedSigners     = @("OpenJS Foundation", "Node.js Foundation")
    DefaultInstallDir   = "${env:ProgramFiles}\nodejs"
    DefaultInstallDirX86= "${env:ProgramFiles(x86)}\nodejs"
}

$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13

# -----------------------------------------------------------------------------
# 2. LOGGING FRAMEWORK
# -----------------------------------------------------------------------------
if (-not $LogPath) {
    if ($AppDir -and (Test-Path $AppDir)) {
        $logDir = Join-Path $AppDir "logs"
        if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
        $LogPath = Join-Path $logDir "node-bootstrap.log"
    } else {
        $LogPath = Join-Path $env:TEMP "autoprint-node-bootstrap.log"
    }
}

function Write-NodeLog {
    param(
        [string]$Message,
        [ValidateSet("INFO", "SUCCESS", "WARN", "ERROR", "STEP")]
        [string]$Level = "INFO"
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logLine = "[$timestamp] [$Level] $Message"

    try {
        Add-Content -Path $LogPath -Value $logLine -ErrorAction SilentlyContinue
    } catch { }

    switch ($Level) {
        "STEP"    { Write-Host "`n[*] $Message" -ForegroundColor Cyan }
        "SUCCESS" { Write-Host "    [PASS] $Message" -ForegroundColor Green }
        "WARN"    { Write-Host "    [WARN] $Message" -ForegroundColor Yellow }
        "ERROR"   { Write-Host "    [ERROR] $Message" -ForegroundColor Red }
        Default   { Write-Host "    $Message" -ForegroundColor Gray }
    }
}

# -----------------------------------------------------------------------------
# 3. SEMANTIC VERSION PARSING & COMPARISON
# -----------------------------------------------------------------------------
function Parse-SemVer {
    param([string]$VersionStr)
    if ([string]::IsNullOrWhiteSpace($VersionStr)) { return $null }

    # Strip leading 'v' or 'V' and any build metadata / commit suffixes
    $clean = ($VersionStr.Trim() -replace '^[vV]', '').Split('-')[0].Split('+')[0]
    $parts = $clean.Split('.')

    $major = if ($parts.Length -gt 0 -and $parts[0] -match '^\d+$') { [int]$parts[0] } else { 0 }
    $minor = if ($parts.Length -gt 1 -and $parts[1] -match '^\d+$') { [int]$parts[1] } else { 0 }
    $patch = if ($parts.Length -gt 2 -and $parts[2] -match '^\d+$') { [int]$parts[2] } else { 0 }

    return [PSCustomObject]@{
        Major      = $major
        Minor      = $minor
        Patch      = $patch
        VersionObj = [System.Version]"$major.$minor.$patch"
        RawString  = $VersionStr.Trim()
    }
}

function Compare-SemVer {
    param(
        [string]$VersionA,
        [string]$VersionB
    )
    $objA = Parse-SemVer $VersionA
    $objB = Parse-SemVer $VersionB

    if (-not $objA -or -not $objB) { return $null }
    return $objA.VersionObj.CompareTo($objB.VersionObj)
}

# -----------------------------------------------------------------------------
# 4. ADMINISTRATOR PRIVILEGE VERIFICATION
# -----------------------------------------------------------------------------
function Test-IsAdmin {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = New-Object Security.Principal.WindowsPrincipal($identity)
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# -----------------------------------------------------------------------------
# 5. ENVIRONMENT & PATH REFRESH
# -----------------------------------------------------------------------------
function Update-SessionPath {
    param([string]$AdditionalPath = "")

    $machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $userPath    = [Environment]::GetEnvironmentVariable("Path", "User")
    $combinedPath = "$machinePath;$userPath"

    if ($AdditionalPath -and (Test-Path $AdditionalPath)) {
        $combinedPath = "$AdditionalPath;$combinedPath"
    }

    # Split, deduplicate while preserving order, remove empty entries
    $paths = $combinedPath.Split(';', [System.StringSplitOptions]::RemoveEmptyEntries)
    $uniquePaths = [System.Collections.Generic.List[string]]::new()
    $seen = [System.Collections.Generic.HashSet[string]]::new([System.StringComparer]::OrdinalIgnoreCase)

    foreach ($p in $paths) {
        $trimmed = $p.Trim()
        if ($trimmed -and -not $seen.Contains($trimmed)) {
            $seen.Add($trimmed) | Out-Null
            $uniquePaths.Add($trimmed)
        }
    }

    $newEnvPath = [string]::Join(";", $uniquePaths)
    $env:Path = $newEnvPath
    return $newEnvPath
}

# -----------------------------------------------------------------------------
# 6. GLOBAL NODE.JS DETECTION ENGINE
# -----------------------------------------------------------------------------
function Find-GlobalNodeJs {
    Write-NodeLog "Checking for existing global Node.js installation..." -Level "STEP"

    $detectedNode = $null
    $detectedVersion = $null
    $detectedSource = $null

    # 1. Check PATH
    $nodeInPath = Get-Command node.exe -ErrorAction SilentlyContinue
    if (-not $nodeInPath) {
        $nodeInPath = Get-Command node -ErrorAction SilentlyContinue
    }

    if ($nodeInPath) {
        try {
            $rawVer = (& $nodeInPath.Source --version 2>&1).ToString().Trim()
            $parsed = Parse-SemVer $rawVer
            if ($parsed) {
                $detectedNode = $nodeInPath.Source
                $detectedVersion = $parsed.RawString
                $detectedSource = "System PATH ($($nodeInPath.Source))"
                Write-NodeLog "Found Node.js in PATH: $detectedVersion at $($nodeInPath.Source)" -Level "INFO"
            }
        } catch { }
    }

    # 2. Check Windows Registry (if not in PATH or invalid)
    if (-not $detectedNode) {
        Write-NodeLog "Node.js not active in current PATH. Inspecting Windows Registry..." -Level "INFO"
        
        $registryKeys = @(
            "HKLM:\SOFTWARE\Node.js",
            "HKLM:\SOFTWARE\WOW6432Node\Node.js"
        )

        foreach ($regKey in $registryKeys) {
            if (Test-Path $regKey) {
                $installPath = (Get-ItemProperty -Path $regKey -Name "InstallPath" -ErrorAction SilentlyContinue).InstallPath
                if ($installPath) {
                    $candidate = Join-Path $installPath "node.exe"
                    if (Test-Path $candidate) {
                        try {
                            $rawVer = (& $candidate --version 2>&1).ToString().Trim()
                            $parsed = Parse-SemVer $rawVer
                            if ($parsed) {
                                $detectedNode = $candidate
                                $detectedVersion = $parsed.RawString
                                $detectedSource = "Windows Registry ($regKey)"
                                Write-NodeLog "Found Node.js in Registry ($regKey): $detectedVersion at $candidate" -Level "INFO"
                                break
                            }
                        } catch { }
                    }
                }
            }
        }

        # Also inspect Uninstall Keys for Node.js
        if (-not $detectedNode) {
            $uninstallKeys = @(
                "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
                "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
                "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*"
            )

            foreach ($keyPattern in $uninstallKeys) {
                $items = Get-ItemProperty -Path $keyPattern -ErrorAction SilentlyContinue | 
                    Where-Object { $_.DisplayName -like "*Node.js*" -and $_.InstallLocation }
                
                foreach ($item in $items) {
                    $candidate = Join-Path $item.InstallLocation "node.exe"
                    if (Test-Path $candidate) {
                        try {
                            $rawVer = (& $candidate --version 2>&1).ToString().Trim()
                            $parsed = Parse-SemVer $rawVer
                            if ($parsed) {
                                $detectedNode = $candidate
                                $detectedVersion = $parsed.RawString
                                $detectedSource = "Registry Uninstall Catalog ($($item.DisplayName))"
                                Write-NodeLog "Found Node.js in Uninstall catalog: $detectedVersion at $candidate" -Level "INFO"
                                break
                            }
                        } catch { }
                    }
                }
                if ($detectedNode) { break }
            }
        }
    }

    # 3. Check Standard Filesystem Locations
    if (-not $detectedNode) {
        $standardLocations = @(
            $Global:NodeConfig.DefaultInstallDir,
            $Global:NodeConfig.DefaultInstallDirX86,
            "$env:LOCALAPPDATA\Programs\nodejs"
        )

        foreach ($loc in $standardLocations) {
            $candidate = Join-Path $loc "node.exe"
            if (Test-Path $candidate) {
                try {
                    $rawVer = (& $candidate --version 2>&1).ToString().Trim()
                    $parsed = Parse-SemVer $rawVer
                    if ($parsed) {
                        $detectedNode = $candidate
                        $detectedVersion = $parsed.RawString
                        $detectedSource = "Standard Directory ($loc)"
                        Write-NodeLog "Found Node.js in Standard Directory: $detectedVersion at $candidate" -Level "INFO"
                        break
                    }
                } catch { }
            }
        }
    }

    if ($detectedNode) {
        return [PSCustomObject]@{
            Found      = $true
            Path       = $detectedNode
            Directory  = (Split-Path $detectedNode -Parent)
            Version    = $detectedVersion
            Source     = $detectedSource
        }
    }

    return [PSCustomObject]@{
        Found      = $false
        Path       = $null
        Directory  = $null
        Version    = $null
        Source     = $null
    }
}

# -----------------------------------------------------------------------------
# 7. SECURE NODE.JS DOWNLOAD & MSI INSTALLATION
# -----------------------------------------------------------------------------
function Install-GlobalNodeJs {
    param(
        [string]$TargetVersion = $Global:NodeConfig.TargetVersion
    )

    Write-NodeLog "Initiating global Node.js installation (Target: v$TargetVersion LTS)..." -Level "STEP"

    # Step A: Admin Privilege Check
    if (-not (Test-IsAdmin)) {
        Write-NodeLog "Administrator privileges are required to install Node.js globally." -Level "ERROR"
        throw "Node.js installation requires elevated Administrator privileges. Please run as Administrator."
    }

    # Step B: Internet & DNS Connectivity Check
    $msiUrl = "$($Global:NodeConfig.DistributionBaseUrl)/v$TargetVersion/node-v$TargetVersion-x64.msi"
    $shasumsUrl = "$($Global:NodeConfig.DistributionBaseUrl)/v$TargetVersion/SHASUMS256.txt"

    Write-NodeLog "Testing HTTPS connectivity to nodejs.org..." -Level "INFO"
    try {
        $ping = Invoke-WebRequest -Uri $shasumsUrl -UseBasicParsing -TimeoutSec 10 -Method Head
    } catch {
        Write-NodeLog "Unable to reach official Node.js distribution servers at nodejs.org: $_" -Level "ERROR"
        Write-NodeLog "Please ensure your internet connection, proxy, or corporate firewall allows access to https://nodejs.org." -Level "ERROR"
        throw "Internet connectivity failure: Could not reach https://nodejs.org to download Node.js installer."
    }

    # Step C: Temporary Workspace Setup
    $tempDir = Join-Path $env:TEMP "AutoPrint_Node_Setup_$(Get-Random)"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    $downloadMsiPath = Join-Path $tempDir "node-v$TargetVersion-x64.msi"
    $downloadShaPath = Join-Path $tempDir "SHASUMS256.txt"

    try {
        # Step D: Download MSI & Official Checksums
        Write-NodeLog "Downloading official Node.js MSI installer from: $msiUrl" -Level "INFO"
        Invoke-WebRequest -Uri $msiUrl -OutFile $downloadMsiPath -UseBasicParsing
        $msiSizeMb = [Math]::Round((Get-Item $downloadMsiPath).Length / 1MB, 2)
        Write-NodeLog "Downloaded installer ($msiSizeMb MB)." -Level "SUCCESS"

        Write-NodeLog "Fetching official SHA-256 checksums..." -Level "INFO"
        Invoke-WebRequest -Uri $shasumsUrl -OutFile $downloadShaPath -UseBasicParsing

        # Step E: Cryptographic SHA-256 Validation
        $calculatedHash = (Get-FileHash -Path $downloadMsiPath -Algorithm SHA256).Hash.ToLower()
        Write-NodeLog "Calculated SHA-256 : $calculatedHash" -Level "INFO"

        $shaContent = Get-Content -Path $downloadShaPath -Raw
        $expectedHash = $null
        if ($shaContent -match "([a-fA-F0-9]{64})\s+node-v$TargetVersion-x64\.msi") {
            $expectedHash = $matches[1].ToLower()
            Write-NodeLog "Expected SHA-256   : $expectedHash" -Level "INFO"
        }

        if ($expectedHash) {
            if ($calculatedHash -ne $expectedHash) {
                Write-NodeLog "SHA-256 checksum mismatch! The downloaded Node.js installer may be corrupted or intercepted." -Level "ERROR"
                throw "SHA-256 checksum verification failed for Node.js installer."
            }
            Write-NodeLog "SHA-256 checksum verification passed." -Level "SUCCESS"
        } else {
            Write-NodeLog "Could not locate expected hash entry in SHASUMS256.txt; proceeding with Authenticode digital signature validation." -Level "WARN"
        }

        # Step F: Authenticode Digital Signature Validation
        Write-NodeLog "Validating Microsoft Authenticode digital signature..." -Level "INFO"
        $sig = Get-AuthenticodeSignature -FilePath $downloadMsiPath
        Write-NodeLog "Digital Signature Status: $($sig.Status)" -Level "INFO"
        
        if ($sig.Status -ne "Valid") {
            Write-NodeLog "Authenticode digital signature is not valid ($($sig.StatusMessage)). Installation aborted for security." -Level "ERROR"
            throw "Authenticode signature validation failed for Node.js installer."
        }

        $signerSubject = $sig.SignerCertificate.Subject
        Write-NodeLog "Signer Certificate Subject: $signerSubject" -Level "INFO"
        
        $isRecognizedSigner = $false
        foreach ($expected in $Global:NodeConfig.ExpectedSigners) {
            if ($signerSubject -like "*$expected*") {
                $isRecognizedSigner = $true
                break
            }
        }

        if (-not $isRecognizedSigner) {
            Write-NodeLog "Signer '$signerSubject' is not recognized as an official Node.js / OpenJS Foundation publisher." -Level "WARN"
        } else {
            Write-NodeLog "Official Node.js / OpenJS Foundation digital signature verified." -Level "SUCCESS"
        }

        # Step G: Silent MSI Installation via msiexec
        Write-NodeLog "Executing silent global installation via msiexec..." -Level "INFO"
        $msiArgs = "/i `"$downloadMsiPath`" /qn /norestart"
        
        $proc = Start-Process -FilePath "msiexec.exe" -ArgumentList $msiArgs -Wait -PassThru
        Write-NodeLog "msiexec completed with exit code: $($proc.ExitCode)" -Level "INFO"

        if ($proc.ExitCode -eq 0 -or $proc.ExitCode -eq 3010) {
            Write-NodeLog "Node.js v$TargetVersion installed globally successfully." -Level "SUCCESS"
        } else {
            Write-NodeLog "msiexec failed with exit code: $($proc.ExitCode)" -Level "ERROR"
            throw "Node.js MSI installation failed with exit code $($proc.ExitCode)."
        }
    }
    finally {
        # Step H: Secure Workspace Cleanup
        Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# -----------------------------------------------------------------------------
# 8. POST-INSTALL VERIFICATION & DEPENDENCY BOOTSTRAP
# -----------------------------------------------------------------------------
function Test-NodeAndNpm {
    # Refresh PATH first
    Update-SessionPath $Global:NodeConfig.DefaultInstallDir | Out-Null

    $nodeCmd = Get-Command node.exe -ErrorAction SilentlyContinue
    if (-not $nodeCmd) { $nodeCmd = Get-Command node -ErrorAction SilentlyContinue }

    $npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if (-not $npmCmd) { $npmCmd = Get-Command npm -ErrorAction SilentlyContinue }

    if (-not $nodeCmd) {
        Write-NodeLog "node.exe is not available in PATH after environment refresh." -Level "ERROR"
        return $false
    }

    if (-not $npmCmd) {
        Write-NodeLog "npm is not available in PATH after environment refresh." -Level "ERROR"
        return $false
    }

    try {
        $nodeV = (& node --version 2>&1).ToString().Trim()
        $npmV  = (& npm --version 2>&1).ToString().Trim()
        Write-NodeLog "Verified global runtime: Node.js $nodeV | npm v$npmV" -Level "SUCCESS"
        return $true
    } catch {
        Write-NodeLog "Failed to execute node or npm: $_" -Level "ERROR"
        return $false
    }
}

function Install-AppDependencies {
    param([string]$TargetAppDir)

    if (-not $TargetAppDir -or -not (Test-Path $TargetAppDir)) {
        Write-NodeLog "Application directory not specified or does not exist: $TargetAppDir" -Level "WARN"
        return $true
    }

    Write-NodeLog "Installing production dependencies in application directory ($TargetAppDir)..." -Level "STEP"

    $workspaces = @(
        $TargetAppDir,
        (Join-Path $TargetAppDir "app\backend"),
        (Join-Path $TargetAppDir "app\customer-web"),
        (Join-Path $TargetAppDir "app\merchant-desktop")
    )

    foreach ($ws in $workspaces) {
        $pkgJson = Join-Path $ws "package.json"
        $pkgLock = Join-Path $ws "package-lock.json"

        if (Test-Path $pkgJson) {
            $wsName = if ($ws -eq $TargetAppDir) { "Root Workspace" } else { Split-Path $ws -Leaf }
            Write-NodeLog "Running deterministic 'npm ci --omit=dev' in $wsName..." -Level "INFO"

            Push-Location $ws
            try {
                if (Test-Path $pkgLock) {
                    $output = & npm ci --omit=dev 2>&1
                } else {
                    Write-NodeLog "No package-lock.json found in $wsName; falling back to 'npm install --omit=dev'..." -Level "WARN"
                    $output = & npm install --omit=dev 2>&1
                }

                if ($LASTEXITCODE -ne 0) {
                    Write-NodeLog "Dependency installation failed in $wsName (Exit Code: $LASTEXITCODE)." -Level "ERROR"
                    Write-NodeLog "npm output: $output" -Level "ERROR"
                    throw "Failed to install dependencies in ${wsName}: $output"
                }

                Write-NodeLog "Dependencies successfully installed in $wsName." -Level "SUCCESS"
            }
            finally {
                Pop-Location
            }
        }
    }

    return $true
}

# -----------------------------------------------------------------------------
# 9. MAIN EXECUTION WORKFLOW
# -----------------------------------------------------------------------------
function Invoke-NodeBootstrap {
    Write-NodeLog "=== AUTOPRINT GLOBAL NODE.JS & DEPENDENCY BOOTSTRAP ===" -Level "INFO"
    Write-NodeLog "Minimum Required Version : v$($Global:NodeConfig.MinVersion)" -Level "INFO"
    Write-NodeLog "Target Release Version   : v$($Global:NodeConfig.TargetVersion)" -Level "INFO"
    Write-NodeLog "Target Application Root  : $(if ($AppDir) { $AppDir } else { 'Not specified' })" -Level "INFO"

    # Step 1: Detect existing Node.js
    $detection = Find-GlobalNodeJs
    $needsInstall = $false

    if ($detection.Found) {
        Write-NodeLog "Detected installed Node.js version: $($detection.Version) via $($detection.Source)" -Level "INFO"
        
        # Step 2: Validate version
        $cmp = Compare-SemVer $detection.Version $Global:NodeConfig.MinVersion
        if ($cmp -ge 0) {
            Write-NodeLog "Installed Node.js ($($detection.Version)) satisfies minimum requirement (>= v$($Global:NodeConfig.MinVersion))." -Level "SUCCESS"
            
            # Ensure PATH is updated if found via registry
            Update-SessionPath $detection.Directory | Out-Null
        } else {
            Write-NodeLog "Installed Node.js ($($detection.Version)) is older than minimum requirement (v$($Global:NodeConfig.MinVersion)). Upgrade required." -Level "WARN"
            $needsInstall = $true
        }
    } else {
        Write-NodeLog "No compatible global Node.js runtime detected on this system." -Level "WARN"
        $needsInstall = $true
    }

    # Step 3: Install or upgrade if missing or incompatible
    if ($needsInstall) {
        Install-GlobalNodeJs -TargetVersion $Global:NodeConfig.TargetVersion
    }

    # Step 4: Refresh process environment PATH
    Update-SessionPath $Global:NodeConfig.DefaultInstallDir | Out-Null

    # Step 5: Verify runtime
    $verified = Test-NodeAndNpm
    if (-not $verified) {
        throw "Node.js or npm validation failed after installation. Please verify PATH configuration."
    }

    # Step 6: Install application dependencies
    if (-not $SkipDependencies -and $AppDir) {
        Install-AppDependencies -TargetAppDir $AppDir
    }

    Write-NodeLog "AutoPrint runtime and dependency bootstrap completed successfully!" -Level "SUCCESS"
    return 0
}

# Run entrypoint if executed directly as a script
if ($MyInvocation.InvocationName -ne '.' -and $MyInvocation.Line -notmatch '^\s*\.\s+') {
    try {
        $exitCode = Invoke-NodeBootstrap
        exit $exitCode
    } catch {
        Write-NodeLog "FATAL: $_" -Level "ERROR"
        if (-not $NonInteractive) {
            Write-Host "`n[FATAL ERROR] Node.js runtime bootstrap failed: $_" -ForegroundColor Red
        }
        exit 1
    }
}
