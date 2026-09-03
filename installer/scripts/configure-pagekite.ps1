<#
.SYNOPSIS
    AutoPrint — Secure Manual PageKite CLI Configuration Engine (Windows DPAPI)
    File: installer/scripts/configure-pagekite.ps1

.DESCRIPTION
    1. Detects Python 3 runtime (via `py -3` and `python`).
    2. Validates and sanitizes PageKite Kite Name (preventing command injection).
    3. Encrypts the PageKite Secret Key using Windows DPAPI (CurrentUser scope).
    4. Stores non-secret settings in %LOCALAPPDATA%\AutoPrint\pagekite\settings.json.
    5. Stores encrypted secret in %LOCALAPPDATA%\AutoPrint\pagekite\secret.dat.
    6. Restricts file permissions to the current Windows user and Administrators.
    7. Optionally runs momentary connection verification probe.
    8. Guarantees zero background persistence or automatic startup.

.DEFINED EXIT CODES
    0 = Success
    1 = General Configuration Error
    2 = Python 3 Missing or Unsupported
    3 = Invalid Kite Name (Format or Injection Detected)
    4 = Missing Secret Key
    5 = Local Customer Web Server Offline (for connection test)
    6 = PageKite Probe Connection Failed
#>

[CmdletBinding()]
param(
    [string]$AppDir = "",
    [string]$KiteName = "",
    [string]$SecretKey = "",
    [int]$CustomerPort = 7000,
    [switch]$SkipTest = $false,
    [switch]$TestConnection = $false,
    [switch]$NonInteractive = $false,
    [string]$LogPath = ""
)

$Global:ExitCodes = @{
    Success               = 0
    GeneralError          = 1
    PythonMissing         = 2
    InvalidKiteName       = 3
    MissingSecretKey      = 4
    CustomerServerOffline = 5
    ProbeConnectionFail   = 6
}

# -----------------------------------------------------------------------------
# 1. INITIALIZATION & LOGGING
# -----------------------------------------------------------------------------
if (-not $AppDir) {
    $AppDir = Resolve-Path (Join-Path $PSScriptRoot "..\..")
}

$localAppData = [Environment]::GetFolderPath([Environment+SpecialFolder]::LocalApplicationData)
if (-not $localAppData) { $localAppData = Join-Path $env:USERPROFILE "AppData\Local" }

$pagekiteDir = Join-Path $localAppData "AutoPrint\pagekite"
$logsDir     = Join-Path $localAppData "AutoPrint\logs"

if (-not (Test-Path $pagekiteDir)) { New-Item -ItemType Directory -Path $pagekiteDir -Force | Out-Null }
if (-not (Test-Path $logsDir))     { New-Item -ItemType Directory -Path $logsDir -Force | Out-Null }

if (-not $LogPath) {
    $LogPath = Join-Path $logsDir "pagekite.log"
}

# Secret Redaction Filter
function Redact-Secret {
    param([string]$Text)
    if (-not $Text) { return $Text }
    if ($SecretKey -and $SecretKey.Length -ge 3) {
        $Text = $Text.Replace($SecretKey, "[REDACTED]")
    }
    return $Text
}

function Write-PageKiteLog {
    param(
        [string]$Message,
        [ValidateSet("INFO", "SUCCESS", "WARN", "ERROR", "STEP", "PROGRESS")]
        [string]$Level = "INFO"
    )

    $safeMsg = Redact-Secret -Text $Message
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logLine = "[$timestamp] [$Level] $safeMsg"

    try {
        Add-Content -Path $LogPath -Value $logLine -ErrorAction SilentlyContinue
    } catch { }

    switch ($Level) {
        "STEP"     { Write-Host "`n[*] $safeMsg" -ForegroundColor Cyan }
        "PROGRESS" { Write-Host "    >>> $safeMsg" -ForegroundColor Yellow }
        "SUCCESS"  { Write-Host "    [PASS] $safeMsg" -ForegroundColor Green }
        "WARN"     { Write-Host "    [WARN] $safeMsg" -ForegroundColor Yellow }
        "ERROR"    { Write-Host "    [ERROR] $safeMsg" -ForegroundColor Red }
        Default    { Write-Host "    $safeMsg" -ForegroundColor Gray }
    }
}

# -----------------------------------------------------------------------------
# 2. PYTHON 3 DETECTION
# -----------------------------------------------------------------------------
function Find-Python3 {
    Write-PageKiteLog "Probing Python 3 runtime availability..." -Level "PROGRESS"

    # 1. Test `py -3`
    try {
        $pyVer = (& py -3 --version 2>&1).ToString().Trim()
        if ($pyVer -match "Python 3\.(\d+)") {
            Write-PageKiteLog "Detected Python 3 via py launcher: $pyVer" -Level "SUCCESS"
            return @{
                Found = $true
                Command = "py"
                Args = "-3"
                Version = $pyVer
            }
        }
    } catch { }

    # 2. Test `python`
    try {
        $pythonVer = (& python --version 2>&1).ToString().Trim()
        if ($pythonVer -match "Python 3\.(\d+)") {
            Write-PageKiteLog "Detected Python 3 via system python: $pythonVer" -Level "SUCCESS"
            return @{
                Found = $true
                Command = "python"
                Args = ""
                Version = $pythonVer
            }
        } elseif ($pythonVer -match "Python 2\.(\d+)") {
            Write-PageKiteLog "Python 2 detected ($pythonVer), but Python 3 is required." -Level "WARN"
        }
    } catch { }

    # 3. Check standard local AppData Python paths
    $localPy = Join-Path $env:LOCALAPPDATA "Programs\Python"
    if (Test-Path $localPy) {
        $pyExes = Get-ChildItem -Path $localPy -Filter "python.exe" -Recurse -ErrorAction SilentlyContinue
        foreach ($exe in $pyExes) {
            try {
                $ver = (& $exe.FullName --version 2>&1).ToString().Trim()
                if ($ver -match "Python 3\.(\d+)") {
                    Write-PageKiteLog "Detected Python 3 at: $($exe.FullName) ($ver)" -Level "SUCCESS"
                    return @{
                        Found = $true
                        Command = $exe.FullName
                        Args = ""
                        Version = $ver
                    }
                }
            } catch { }
        }
    }

    Write-PageKiteLog "Python 3 was not found on this system. PageKite requires Python 3.x." -Level "ERROR"
    return @{
        Found = $false
        Command = $null
        Args = ""
        Version = $null
    }
}

# -----------------------------------------------------------------------------
# 3. KITE NAME SANITIZATION & VALIDATION
# -----------------------------------------------------------------------------
function Validate-KiteName {
    param([string]$Name)

    if ([string]::IsNullOrWhiteSpace($Name)) {
        Write-PageKiteLog "PageKite Kite Name cannot be empty." -Level "ERROR"
        return $null
    }

    $trimmed = $Name.Trim()

    # Reject any shell metacharacters, spaces, or dangerous injection syntax
    if ($trimmed -match '[&|;><$`%\(\)\{\}\[\]"''\r\n\t\s]') {
        Write-PageKiteLog "Invalid Kite Name: Contains illegal characters, spaces, or shell metacharacters." -Level "ERROR"
        return $null
    }

    # Normalize subdomain: if user entered 'myprintshop', convert to 'myprintshop.pagekite.me'
    $fullKite = if ($trimmed -notmatch '\.') { "$trimmed.pagekite.me" } else { $trimmed }

    # Validate RFC 1123 hostname format
    $hostnameRegex = '^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$'
    if ($fullKite -notmatch $hostnameRegex) {
        Write-PageKiteLog "Invalid Kite Name format: '$fullKite'. Example: myprintshop.pagekite.me" -Level "ERROR"
        return $null
    }

    return $fullKite
}

# -----------------------------------------------------------------------------
# 4. SECURE DPAPI STORAGE & ACL RESTRICTION
# -----------------------------------------------------------------------------
function Save-PageKiteSecureConfig {
    param(
        [string]$NormalizedKite,
        [string]$Secret,
        [int]$Port
    )

    Write-PageKiteLog "Securing PageKite configuration with Windows DPAPI..." -Level "PROGRESS"

    $settingsFile = Join-Path $pagekiteDir "settings.json"
    $secretFile   = Join-Path $pagekiteDir "secret.dat"

    # 1. Write non-secret metadata settings.json
    $settingsObj = @{
        configured      = $true
        kiteName        = $NormalizedKite
        customerPort    = $Port
        pagekiteVersion = "1.5.2.260113"
        mode            = "manual"
        updatedAt       = (Get-Date).ToString("o")
        publicUrl       = "https://$NormalizedKite"
    }
    $jsonContent = $settingsObj | ConvertTo-Json -Depth 3
    [System.IO.File]::WriteAllText($settingsFile, $jsonContent, [System.Text.Encoding]::UTF8)

    # 2. Encrypt Secret Key using Windows DPAPI (CurrentUser Scope)
    Add-Type -AssemblyName System.Security
    $secretBytes = [System.Text.Encoding]::UTF8.GetBytes($Secret.Trim())
    $encryptedBytes = [System.Security.Cryptography.ProtectedData]::Protect(
        $secretBytes,
        $null,
        [System.Security.Cryptography.DataProtectionScope]::CurrentUser
    )
    [System.IO.File]::WriteAllBytes($secretFile, $encryptedBytes)

    # Clean up memory
    [Array]::Clear($secretBytes, 0, $secretBytes.Length)

    # 3. Restrict NTFS file permissions (DACL only, Current User and Administrators)
    try {
        foreach ($file in @($settingsFile, $secretFile)) {
            $fileInfo = New-Object System.IO.FileInfo($file)
            $acl = $fileInfo.GetAccessControl([System.Security.AccessControl.AccessControlSections]::Access)
            $acl.SetAccessRuleProtection($true, $false)
            
            $adminSid = New-Object Security.Principal.SecurityIdentifier([Security.Principal.WellKnownSidType]::BuiltinAdministratorsSid, $null)
            $systemSid = New-Object Security.Principal.SecurityIdentifier([Security.Principal.WellKnownSidType]::LocalSystemSid, $null)
            $userSid = [Security.Principal.WindowsIdentity]::GetCurrent().User

            $adminRule = New-Object Security.AccessControl.FileSystemAccessRule($adminSid, "FullControl", "Allow")
            $systemRule = New-Object Security.AccessControl.FileSystemAccessRule($systemSid, "FullControl", "Allow")
            $userRule = New-Object Security.AccessControl.FileSystemAccessRule($userSid, "FullControl", "Allow")

            $acl.AddAccessRule($adminRule)
            $acl.AddAccessRule($systemRule)
            $acl.AddAccessRule($userRule)

            $fileInfo.SetAccessControl($acl)
        }
    } catch {
        # Best effort ACL hardening (DPAPI is the primary cryptographic boundary)
    }

    # 4. Clean up legacy plaintext config files if present
    $legacyCfg = Join-Path $pagekiteDir "pagekite.cfg"
    if (Test-Path $legacyCfg) { Remove-Item $legacyCfg -Force -ErrorAction SilentlyContinue }

    $legacyProgData = Join-Path ([Environment]::GetFolderPath([Environment+SpecialFolder]::CommonApplicationData)) "AutoPrint\pagekite\pagekite.cfg"
    if (Test-Path $legacyProgData) { Remove-Item $legacyProgData -Force -ErrorAction SilentlyContinue }

    Write-PageKiteLog "PageKite secret encrypted with Windows DPAPI at: $secretFile" -Level "SUCCESS"
    Write-PageKiteLog "Non-secret settings stored at: $settingsFile" -Level "SUCCESS"
    Write-PageKiteLog "Public Customer Access URL: https://$NormalizedKite" -Level "INFO"
}

# -----------------------------------------------------------------------------
# 5. OPTIONAL PROBE / TEST CONNECTION
# -----------------------------------------------------------------------------
function Test-PageKiteProbe {
    param(
        [hashtable]$Python,
        [string]$NormalizedKite,
        [string]$Secret,
        [int]$Port
    )

    Write-PageKiteLog "Running momentary PageKite configuration test..." -Level "PROGRESS"

    # Step 1: Check local customer web port
    $isLocalPortOpen = $false
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $iar = $tcp.BeginConnect("127.0.0.1", $Port, $null, $null)
        $wait = $iar.AsyncWaitHandle.WaitOne(1500, $false)
        if ($wait -and $tcp.Connected) {
            $isLocalPortOpen = $true
            $tcp.EndConnect($iar)
        }
        $tcp.Close()
    } catch { }

    if (-not $isLocalPortOpen) {
        Write-PageKiteLog "Local customer web server is not running on port $Port." -Level "WARN"
        Write-PageKiteLog "Start AutoPrint before testing the public tunnel." -Level "WARN"
        return $Global:ExitCodes.CustomerServerOffline
    }

    # Step 2: Test PageKite executable probe
    $pkScript = Join-Path $AppDir "tools\pagekite\pagekite.py"
    if (-not (Test-Path $pkScript)) {
        $pkScript = Join-Path $AppDir "scripts\pagekite.py"
    }

    if (-not (Test-Path $pkScript)) {
        Write-PageKiteLog "pagekite.py script not found in tools directory." -Level "ERROR"
        return $Global:ExitCodes.GeneralError
    }

    $serviceArg = "--service_on=http:${NormalizedKite}:localhost:${Port}:${Secret}"
    $procArgs = if ($Python.Args) { @($Python.Args, $pkScript, "--clean", $serviceArg, "--settings") } else { @($pkScript, "--clean", $serviceArg, "--settings") }

    try {
        $psi = New-Object System.Diagnostics.ProcessStartInfo
        $psi.FileName = $Python.Command
        foreach ($arg in $procArgs) { $psi.ArgumentList.Add($arg) }
        $psi.RedirectStandardOutput = $true
        $psi.RedirectStandardError = $true
        $psi.UseShellExecute = $false
        $psi.CreateNoWindow = $true

        $proc = [System.Diagnostics.Process]::Start($psi)
        $stdout = $proc.StandardOutput.ReadToEnd()
        $stderr = $proc.StandardError.ReadToEnd()
        $proc.WaitForExit(5000)

        if ($proc.ExitCode -eq 0 -and $stdout -match "Current settings for pagekite") {
            Write-PageKiteLog "PageKite syntax and configuration validated successfully." -Level "SUCCESS"
            return $Global:ExitCodes.Success
        } else {
            Write-PageKiteLog "PageKite probe returned code $($proc.ExitCode)." -Level "WARN"
            return $Global:ExitCodes.ProbeConnectionFail
        }
    } catch {
        Write-PageKiteLog "Failed to execute PageKite test probe: $_" -Level "WARN"
        return $Global:ExitCodes.ProbeConnectionFail
    }
}

# -----------------------------------------------------------------------------
# 6. MAIN WORKFLOW
# -----------------------------------------------------------------------------
function Invoke-PageKiteSetup {
    Write-PageKiteLog "=== AUTOPRINT SECURE PAGEKITE CLI CONFIGURATION ===" -Level "INFO"

    # Step 1: Detect Python 3
    $py = Find-Python3
    if (-not $py.Found) {
        return $Global:ExitCodes.PythonMissing
    }

    # Step 2: Validate Kite Name
    $validKite = Validate-KiteName -Name $KiteName
    if (-not $validKite) {
        return $Global:ExitCodes.InvalidKiteName
    }

    # Step 3: Validate Secret Key
    if ([string]::IsNullOrWhiteSpace($SecretKey)) {
        if ($NonInteractive) {
            Write-PageKiteLog "PageKite Secret Key is required." -Level "ERROR"
            return $Global:ExitCodes.MissingSecretKey
        } else {
            $secureSecret = Read-Host -Prompt "Enter your PageKite Secret Key" -AsSecureString
            $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureSecret)
            $SecretKey = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
            [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
            if ([string]::IsNullOrWhiteSpace($SecretKey)) {
                Write-PageKiteLog "PageKite Secret Key cannot be empty." -Level "ERROR"
                return $Global:ExitCodes.MissingSecretKey
            }
        }
    }

    # Step 4: Save configuration with DPAPI protection
    Save-PageKiteSecureConfig -NormalizedKite $validKite -Secret $SecretKey.Trim() -Port $CustomerPort

    # Step 5: Optional connection test
    if ($TestConnection -and -not $SkipTest) {
        $testRes = Test-PageKiteProbe -Python $py -NormalizedKite $validKite -Secret $SecretKey.Trim() -Port $CustomerPort
        if ($testRes -ne $Global:ExitCodes.Success) {
            Write-PageKiteLog "PageKite test probe completed with code: $testRes" -Level "WARN"
        }
    }

    Write-PageKiteLog "PageKite configuration completed successfully (Manual Mode: Offline by default)." -Level "SUCCESS"
    return $Global:ExitCodes.Success
}

# -----------------------------------------------------------------------------
# 7. ENTRYPOINT
# -----------------------------------------------------------------------------
if ($MyInvocation.InvocationName -ne '.' -and $MyInvocation.Line -notmatch '^\s*\.\s+') {
    try {
        $code = Invoke-PageKiteSetup
        exit $code
    } catch {
        Write-PageKiteLog "Unhandled Exception during PageKite setup: $_" -Level "ERROR"
        exit $Global:ExitCodes.GeneralError
    }
}
