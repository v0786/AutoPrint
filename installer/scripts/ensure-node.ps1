<#
.SYNOPSIS
    AutoPrint — Global Node.js Runtime & Dependency Management Engine
    File: installer/scripts/ensure-node.ps1

.DESCRIPTION
    1. Detects existing global Node.js installations via PATH, Registry (HKLM/WOW6432Node), and standard paths.
    2. Performs semantic version comparison against configured minimum requirements.
    3. Securely downloads official Node.js MSI from nodejs.org over HTTPS (TLS 1.2/1.3).
    4. Cryptographically verifies SHA-256 checksum and Authenticode digital signatures.
    5. Silently installs Node.js globally using msiexec (/qn /norestart).
    6. Refreshes current and child process environment PATH without duplication.
    7. Validates node and npm execution.
    8. Deterministically bootstraps production dependencies via `npm ci --omit=dev`.

.DEFINED EXIT CODES
    0  = Success
    1  = General Node.js detection failure
    2  = Node.js download failure
    3  = SHA256 checksum validation failure
    4  = Authenticode signature validation failure
    5  = Node.js MSI installation failure
    6  = Node.js/npm verification failure
    7  = npm dependency installation failure
    8  = Network/proxy/firewall failure
    9  = Missing package-lock.json or invalid dependency configuration
    10 = Administrator/elevation failure
#>

[CmdletBinding()]
param(
    [string]$AppDir = "",
    [string]$LogPath = "",
    [switch]$SkipDependencies = $false,
    [switch]$NonInteractive = $false
)

# -----------------------------------------------------------------------------
# 1. CENTRAL CONFIGURATION & DEFINED EXIT CODES
# -----------------------------------------------------------------------------
$Global:TargetNodeVersion   = "20.18.0"              # Target Node.js LTS Release to download
$Global:MinNodeVersion      = "18.0.0"               # Minimum supported Node.js version
$Global:NodeArchitecture    = "x64"                  # Architecture: x64
$Global:NodeDownloadBaseUrl = "https://nodejs.org/dist"
$Global:ExpectedSigners     = @("OpenJS Foundation", "Node.js Foundation")

$Global:ExitCodes = @{
    Success               = 0
    GeneralDetectionFail  = 1
    DownloadFail          = 2
    Sha256Mismatch        = 3
    SignatureFail         = 4
    MsiInstallFail        = 5
    VerifyRuntimeFail     = 6
    NpmDependencyFail     = 7
    NetworkOrProxyFail    = 8
    MissingPackageLock    = 9
    AdminElevationFail    = 10
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
        $commonAppData = [Environment]::GetFolderPath([Environment+SpecialFolder]::CommonApplicationData)
        $logDir = Join-Path $commonAppData "AutoPrint\logs"
        if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }
        $LogPath = Join-Path $logDir "node-bootstrap.log"
    }
}

function Write-NodeLog {
    param(
        [string]$Message,
        [ValidateSet("INFO", "SUCCESS", "WARN", "ERROR", "STEP", "PROGRESS")]
        [string]$Level = "INFO"
    )

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logLine = "[$timestamp] [$Level] $Message"

    try {
        Add-Content -Path $LogPath -Value $logLine -ErrorAction SilentlyContinue
    } catch { }

    switch ($Level) {
        "STEP"     { Write-Host "`n[*] $Message" -ForegroundColor Cyan }
        "PROGRESS" { Write-Host "    >>> $Message" -ForegroundColor Yellow }
        "SUCCESS"  { Write-Host "    [PASS] $Message" -ForegroundColor Green }
        "WARN"     { Write-Host "    [WARN] $Message" -ForegroundColor Yellow }
        "ERROR"    { Write-Host "    [ERROR] $Message" -ForegroundColor Red }
        Default    { Write-Host "    $Message" -ForegroundColor Gray }
    }
}

# -----------------------------------------------------------------------------
# 3. SEMANTIC VERSION PARSING & COMPARISON
# -----------------------------------------------------------------------------
function Parse-SemVer {
    param([string]$VersionStr)
    if ([string]::IsNullOrWhiteSpace($VersionStr)) { return $null }

    # Strip leading 'v' or 'V' and any pre-release / build metadata tags
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

    # Split, deduplicate while preserving priority order, remove empty entries
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
    Write-NodeLog "Checking existing Node.js installation..." -Level "PROGRESS"

    $detectedNode = $null
    $detectedVersion = $null
    $detectedSource = $null

    # Step 1: Check Command Availability in PATH
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

    # Step 2: Check Standard Windows Registry Keys
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
    }

    # Step 3: Check Windows Uninstall Registry Catalogs
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

    # Step 4: Check Standard Installation Directories
    if (-not $detectedNode) {
        $standardLocations = @(
            "${env:ProgramFiles}\nodejs",
            "${env:ProgramFiles(x86)}\nodejs",
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
                        $detectedSource = "Standard Filesystem Path ($loc)"
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
        [string]$TargetVersion = $Global:TargetNodeVersion
    )

    Write-NodeLog "Downloading required Node.js runtime (v$TargetVersion LTS)..." -Level "PROGRESS"

    # Step A: Admin Privilege Check
    if (-not (Test-IsAdmin)) {
        Write-NodeLog "Administrator privileges are required to install Node.js globally." -Level "ERROR"
        return $Global:ExitCodes.AdminElevationFail
    }

    # Step B: Internet Connectivity Check
    $msiUrl = "$($Global:NodeDownloadBaseUrl)/v$TargetVersion/node-v$TargetVersion-$($Global:NodeArchitecture).msi"
    $shasumsUrl = "$($Global:NodeDownloadBaseUrl)/v$TargetVersion/SHASUMS256.txt"

    Write-NodeLog "Testing HTTPS connectivity to nodejs.org..." -Level "INFO"
    try {
        $ping = Invoke-WebRequest -Uri $shasumsUrl -UseBasicParsing -TimeoutSec 10 -Method Head
    } catch {
        Write-NodeLog "Unable to reach official Node.js distribution servers at nodejs.org: $_" -Level "ERROR"
        Write-NodeLog "An internet connection is required to download Node.js during the initial installation." -Level "ERROR"
        return $Global:ExitCodes.NetworkOrProxyFail
    }

    # Step C: Temporary Workspace Setup
    $tempDir = Join-Path $env:TEMP "AutoPrint_Node_Setup_$(Get-Random)"
    New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
    $downloadMsiPath = Join-Path $tempDir "node-v$TargetVersion-$($Global:NodeArchitecture).msi"
    $downloadShaPath = Join-Path $tempDir "SHASUMS256.txt"

    try {
        # Step D: Download MSI & Official Checksums
        Write-NodeLog "Downloading official Node.js MSI installer from: $msiUrl" -Level "INFO"
        try {
            Invoke-WebRequest -Uri $msiUrl -OutFile $downloadMsiPath -UseBasicParsing
        } catch {
            Write-NodeLog "Failed to download Node.js MSI from ${msiUrl}: $_" -Level "ERROR"
            return $Global:ExitCodes.DownloadFail
        }

        $msiSizeMb = [Math]::Round((Get-Item $downloadMsiPath).Length / 1MB, 2)
        Write-NodeLog "Downloaded installer ($msiSizeMb MB)." -Level "SUCCESS"

        try {
            Invoke-WebRequest -Uri $shasumsUrl -OutFile $downloadShaPath -UseBasicParsing
        } catch {
            Write-NodeLog "Failed to download official SHA256 checksums file: $_" -Level "ERROR"
            return $Global:ExitCodes.DownloadFail
        }

        # Step E: Cryptographic SHA-256 Validation
        Write-NodeLog "Verifying Node.js installer security (SHA-256 & Authenticode)..." -Level "PROGRESS"
        $calculatedHash = (Get-FileHash -Path $downloadMsiPath -Algorithm SHA256).Hash.ToLower()
        Write-NodeLog "Calculated SHA-256 : $calculatedHash" -Level "INFO"

        $shaContent = Get-Content -Path $downloadShaPath -Raw
        $expectedHash = $null
        if ($shaContent -match "([a-fA-F0-9]{64})\s+node-v$TargetVersion-$($Global:NodeArchitecture)\.msi") {
            $expectedHash = $matches[1].ToLower()
            Write-NodeLog "Expected SHA-256   : $expectedHash" -Level "INFO"
        }

        if ($expectedHash) {
            if ($calculatedHash -ne $expectedHash) {
                Write-NodeLog "SHA-256 checksum mismatch! Downloaded MSI: $calculatedHash != Expected: $expectedHash" -Level "ERROR"
                return $Global:ExitCodes.Sha256Mismatch
            }
            Write-NodeLog "SHA-256 checksum verified successfully." -Level "SUCCESS"
        } else {
            Write-NodeLog "Could not find hash entry in SHASUMS256.txt; proceeding with Authenticode digital signature check." -Level "WARN"
        }

        # Step F: Authenticode Digital Signature Validation
        Write-NodeLog "Validating Authenticode digital signature..." -Level "INFO"
        $sig = Get-AuthenticodeSignature -FilePath $downloadMsiPath
        Write-NodeLog "Digital Signature Status: $($sig.Status)" -Level "INFO"
        
        if ($sig.Status -ne "Valid") {
            Write-NodeLog "Authenticode digital signature is invalid ($($sig.StatusMessage)). MSI cannot be trusted." -Level "ERROR"
            return $Global:ExitCodes.SignatureFail
        }

        $signerSubject = $sig.SignerCertificate.Subject
        Write-NodeLog "Signer Certificate Subject: $signerSubject" -Level "INFO"
        
        $isRecognizedSigner = $false
        foreach ($expected in $Global:ExpectedSigners) {
            if ($signerSubject -like "*$expected*") {
                $isRecognizedSigner = $true
                break
            }
        }

        if (-not $isRecognizedSigner) {
            Write-NodeLog "Signer '$signerSubject' does not match official Node.js / OpenJS Foundation identity." -Level "ERROR"
            return $Global:ExitCodes.SignatureFail
        }
        Write-NodeLog "Authenticode digital signature verified (Publisher: OpenJS Foundation)." -Level "SUCCESS"

        # Step G: Silent MSI Installation via msiexec
        Write-NodeLog "Installing Node.js..." -Level "PROGRESS"
        $msiArgs = "/i `"$downloadMsiPath`" /qn /norestart"
        
        $proc = Start-Process -FilePath "msiexec.exe" -ArgumentList $msiArgs -Wait -PassThru
        Write-NodeLog "msiexec completed with exit code: $($proc.ExitCode)" -Level "INFO"

        if ($proc.ExitCode -eq 0 -or $proc.ExitCode -eq 3010) {
            Write-NodeLog "Node.js v$TargetVersion installed globally successfully." -Level "SUCCESS"
            return $Global:ExitCodes.Success
        } else {
            Write-NodeLog "msiexec installation failed with exit code: $($proc.ExitCode)" -Level "ERROR"
            return $Global:ExitCodes.MsiInstallFail
        }
    }
    finally {
        # Secure Cleanup
        Remove-Item $tempDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}

# -----------------------------------------------------------------------------
# 8. POST-INSTALL VERIFICATION & DEPENDENCY BOOTSTRAP
# -----------------------------------------------------------------------------
function Test-NodeAndNpm {
    Write-NodeLog "Configuring Node.js environment..." -Level "PROGRESS"
    
    # Refresh PATH first
    Update-SessionPath "${env:ProgramFiles}\nodejs" | Out-Null

    $nodeCmd = Get-Command node.exe -ErrorAction SilentlyContinue
    if (-not $nodeCmd) { $nodeCmd = Get-Command node -ErrorAction SilentlyContinue }

    $npmCmd = Get-Command npm.cmd -ErrorAction SilentlyContinue
    if (-not $npmCmd) { $npmCmd = Get-Command npm -ErrorAction SilentlyContinue }

    if (-not $nodeCmd -or -not $npmCmd) {
        Write-NodeLog "Node.js or npm executable not found in PATH after refresh." -Level "ERROR"
        return $false
    }

    try {
        $nodeV = (& node --version 2>&1).ToString().Trim()
        $npmV  = (& npm --version 2>&1).ToString().Trim()
        Write-NodeLog "Verified global runtime: Node.js $nodeV | npm v$npmV" -Level "SUCCESS"
        return $true
    } catch {
        Write-NodeLog "Execution test for node or npm failed: $_" -Level "ERROR"
        return $false
    }
}

function Install-AppDependencies {
    param([string]$TargetAppDir)

    if (-not $TargetAppDir -or -not (Test-Path $TargetAppDir)) {
        Write-NodeLog "Application directory not found: $TargetAppDir" -Level "WARN"
        return $Global:ExitCodes.Success
    }

    Write-NodeLog "Installing AutoPrint dependencies..." -Level "PROGRESS"

    # Enumerate actual AutoPrint independent package workspaces
    $workspaces = @(
        (Join-Path $TargetAppDir "app\backend"),
        (Join-Path $TargetAppDir "app\customer-web"),
        (Join-Path $TargetAppDir "app\merchant-desktop")
    )

    # Check root workspace if package-lock exists
    if (Test-Path (Join-Path $TargetAppDir "package.json")) {
        if (Test-Path (Join-Path $TargetAppDir "package-lock.json")) {
            $workspaces = @($TargetAppDir) + $workspaces
        }
    }

    $origEAP = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        foreach ($ws in $workspaces) {
            $pkgJson = Join-Path $ws "package.json"
            $pkgLock = Join-Path $ws "package-lock.json"

            if (Test-Path $pkgJson) {
                $wsName = if ($ws -eq $TargetAppDir) { "Root Workspace" } else { Split-Path $ws -Leaf }

                if (-not (Test-Path $pkgLock)) {
                    Write-NodeLog "package-lock.json is missing in $wsName. Deterministic 'npm ci' requires a lock file." -Level "ERROR"
                    return $Global:ExitCodes.MissingPackageLock
                }

                Write-NodeLog "Executing 'npm ci --omit=dev' in $wsName..." -Level "INFO"

                Push-Location $ws
                try {
                    $output = cmd.exe /c "npm ci --omit=dev 2>&1"
                    if ($LASTEXITCODE -ne 0) {
                        # If failed due to node-gyp on non-LTS node releases while prebuilds are present, retry with --ignore-scripts
                        if ($output -match "node-gyp|Visual Studio") {
                            Write-NodeLog "Native build toolchain not found; attempting installation with precompiled binaries in $wsName..." -Level "WARN"
                            $retryOutput = cmd.exe /c "npm ci --omit=dev --ignore-scripts 2>&1"
                            if ($LASTEXITCODE -eq 0) {
                                $output = $retryOutput
                            }
                        }
                    }

                    if ($LASTEXITCODE -ne 0) {
                        Write-NodeLog "Dependency installation failed in $wsName (Exit Code: $LASTEXITCODE)." -Level "ERROR"
                        Write-NodeLog "npm error output: $output" -Level "ERROR"
                        
                        # Detect potential network / proxy blocking
                        if ($output -match "ECONNREFUSED|ETIMEDOUT|self signed certificate|proxy|fetch failed") {
                            return $Global:ExitCodes.NetworkOrProxyFail
                        }
                        return $Global:ExitCodes.NpmDependencyFail
                    }
                    Write-NodeLog "Dependencies successfully installed in ${wsName}." -Level "SUCCESS"
                }
                finally {
                    Pop-Location
                }
            }
        }
    }
    finally {
        $ErrorActionPreference = $origEAP
    }

    return $Global:ExitCodes.Success
}

# -----------------------------------------------------------------------------
# 9. MAIN EXECUTION WORKFLOW
# -----------------------------------------------------------------------------
function Invoke-NodeBootstrap {
    Write-NodeLog "=== AUTOPRINT GLOBAL NODE.JS & DEPENDENCY BOOTSTRAP ===" -Level "INFO"
    Write-NodeLog "Target Release Version   : v$Global:TargetNodeVersion" -Level "INFO"
    Write-NodeLog "Minimum Required Version : v$Global:MinNodeVersion" -Level "INFO"
    Write-NodeLog "Target Architecture      : $Global:NodeArchitecture" -Level "INFO"
    Write-NodeLog "Target Application Root  : $(if ($AppDir) { $AppDir } else { 'Not specified' })" -Level "INFO"

    # Step 1: Detect existing Node.js
    $detection = Find-GlobalNodeJs
    $needsInstall = $false

    if ($detection.Found) {
        Write-NodeLog "Detected installed Node.js: $($detection.Version) via $($detection.Source)" -Level "INFO"
        
        # Step 2: Validate version
        $cmp = Compare-SemVer $detection.Version $Global:MinNodeVersion
        if ($cmp -ge 0) {
            Write-NodeLog "Installed Node.js ($($detection.Version)) satisfies requirement (>= v$Global:MinNodeVersion). Skipping reinstall/downgrade." -Level "SUCCESS"
            
            # Ensure session PATH is refreshed
            Update-SessionPath $detection.Directory | Out-Null
        } else {
            Write-NodeLog "Installed Node.js ($($detection.Version)) is older than minimum requirement (v$Global:MinNodeVersion). Upgrade required." -Level "WARN"
            $needsInstall = $true
        }
    } else {
        Write-NodeLog "No compatible global Node.js runtime detected on this system." -Level "WARN"
        $needsInstall = $true
    }

    # Step 3: Install or upgrade if missing or incompatible
    if ($needsInstall) {
        $installResult = Install-GlobalNodeJs -TargetVersion $Global:TargetNodeVersion
        if ($installResult -ne $Global:ExitCodes.Success) {
            return $installResult
        }
    }

    # Step 4: Refresh environment and verify runtime
    $verified = Test-NodeAndNpm
    if (-not $verified) {
        return $Global:ExitCodes.VerifyRuntimeFail
    }

    # Step 5: Install application dependencies
    if (-not $SkipDependencies -and $AppDir) {
        $depResult = Install-AppDependencies -TargetAppDir $AppDir
        if ($depResult -ne $Global:ExitCodes.Success) {
            return $depResult
        }
    }

    Write-NodeLog "Finalizing AutoPrint installation..." -Level "PROGRESS"
    Write-NodeLog "AutoPrint runtime and dependency bootstrap completed successfully!" -Level "SUCCESS"
    return $Global:ExitCodes.Success
}

# -----------------------------------------------------------------------------
# 10. ENTRYPOINT
# -----------------------------------------------------------------------------
if ($MyInvocation.InvocationName -ne '.' -and $MyInvocation.Line -notmatch '^\s*\.\s+') {
    try {
        $exitCode = Invoke-NodeBootstrap
        if ($exitCode -ne 0) {
            Write-NodeLog "Bootstrap terminated with error code: $exitCode" -Level "ERROR"
            if (-not $NonInteractive) {
                Write-Host "`n[FATAL ERROR] Node.js runtime bootstrap failed (Exit Code: $exitCode)." -ForegroundColor Red
            }
        }
        exit $exitCode
    } catch {
        Write-NodeLog "Unhandled Exception: $_" -Level "ERROR"
        exit $Global:ExitCodes.GeneralDetectionFail
    }
}
