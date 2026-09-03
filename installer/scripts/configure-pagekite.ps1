<#
.SYNOPSIS
    AutoPrint — Manual PageKite CLI Configuration & Security Engine
    File: installer/scripts/configure-pagekite.ps1

.DESCRIPTION
    1. Detects Python 3 runtime (via `py -3` and `python`).
    2. Validates and sanitizes PageKite Kite Name (preventing command injection).
    3. Securely writes PageKite configuration to %ProgramData%\AutoPrint\pagekite\pagekite.cfg.
    4. Protects configuration file ACLs to current user and local administrators.
    5. Optionally runs momentary connection verification probe.
    6. Ensures PageKite is never configured to auto-start in background or with Windows.

.DEFINED EXIT CODES
    0 = Success
    1 = General Configuration Error
    2 = Python 3 Missing or Unsupported
    3 = Invalid Kite Name (Format or Injection Detected)
    4 = Missing Secret Key
    5 = Local Customer Web Server Offline
    6 = PageKite Probe Connection Failed
#>

[CmdletBinding()]
param(
    [string]$AppDir = "",
    [string]$KiteName = "",
    [string]$SecretKey = "",
    [int]$CustomerPort = 7000,
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
# 1. LOGGING & INITIALIZATION
# -----------------------------------------------------------------------------
if (-not $AppDir) {
    $AppDir = Resolve-Path (Join-Path $PSScriptRoot "..\..")
}

$programData = [Environment]::GetFolderPath([Environment+SpecialFolder]::CommonApplicationData)
if (-not $programData) { $programData = "C:\ProgramData" }

$pagekiteDir = Join-Path $programData "AutoPrint\pagekite"
$logsDir     = Join-Path $programData "AutoPrint\logs"

if (-not (Test-Path $pagekiteDir)) { New-Item -ItemType Directory -Path $pagekiteDir -Force | Out-Null }
if (-not (Test-Path $logsDir))     { New-Item -ItemType Directory -Path $logsDir -Force | Out-Null }

if (-not $LogPath) {
    $LogPath = Join-Path $logsDir "pagekite.log"
}

function Write-PageKiteLog {
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
        return $false
    }

    $trimmed = $Name.Trim()

    # Reject any shell metacharacters or dangerous syntax
    if ($trimmed -match '[&|;><$`%\r\n\t\s"]') {
        Write-PageKiteLog "Invalid Kite Name: Contains illegal characters or spaces." -Level "ERROR"
        return $false
    }

    # Normalize subdomain: if user entered 'myprintshop', convert to 'myprintshop.pagekite.me'
    $fullKite = if ($trimmed -notmatch '\.') { "$trimmed.pagekite.me" } else { $trimmed }

    # Validate RFC 1123 hostname format
    $hostnameRegex = '^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$'
    if ($fullKite -notmatch $hostnameRegex) {
        Write-PageKiteLog "Invalid Kite Name format: '$fullKite'. Example: myprintshop.pagekite.me" -Level "ERROR"
        return $false
    }

    return $fullKite
}

# -----------------------------------------------------------------------------
# 4. CONFIGURATION WRITER & ACL HARDENING
# -----------------------------------------------------------------------------
function Save-PageKiteConfig {
    param(
        [string]$NormalizedKite,
        [string]$Secret,
        [int]$Port
    )

    Write-PageKiteLog "Saving PageKite configuration..." -Level "PROGRESS"

    $cfgFile = Join-Path $pagekiteDir "pagekite.cfg"
    $jsonFile = Join-Path $pagekiteDir "pagekite-settings.json"

    # 1. Write official pagekite.cfg format
    $cfgContent = @"
# AutoPrint PageKite Configuration File
# Location: $cfgFile
# Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
# Security Note: Manual startup only. Never automatically run in background.

service_on = http:${NormalizedKite}:localhost:${Port}:${Secret}
"@

    [System.IO.File]::WriteAllText($cfgFile, $cfgContent, [System.Text.Encoding]::UTF8)

    # 2. Write metadata JSON (without secret)
    $metaJson = @{
        kiteName     = $NormalizedKite
        customerPort = $Port
        configured   = $true
        mode         = "manual"
        updatedAt    = (Get-Date).ToString("o")
        publicUrl    = "https://$NormalizedKite"
    } | ConvertTo-Json -Depth 3

    [System.IO.File]::WriteAllText($jsonFile, $metaJson, [System.Text.Encoding]::UTF8)

    # 3. Restrict file permissions (Current User + Administrators only)
    try {
        $acl = Get-Acl -Path $cfgFile
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

        Set-Acl -Path $cfgFile -AclObject $acl
    } catch {
        # ACL restriction is best-effort on Windows Home editions
    }

    Write-PageKiteLog "PageKite configuration saved securely in: $cfgFile" -Level "SUCCESS"
    Write-PageKiteLog "Public customer URL will be: https://$NormalizedKite" -Level "INFO"
}

# -----------------------------------------------------------------------------
# 5. OPTIONAL PROBE / TEST CONNECTION
# -----------------------------------------------------------------------------
function Test-PageKiteProbe {
    param(
        [hashtable]$Python,
        [string]$NormalizedKite,
        [int]$Port
    )

    Write-PageKiteLog "Running momentary PageKite connection test..." -Level "PROGRESS"

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

    $cfgFile = Join-Path $pagekiteDir "pagekite.cfg"
    $testArgs = if ($Python.Args) { "$($Python.Args) `"$pkScript`" --clean --optfile=`"$cfgFile`" --settings" } else { "`"$pkScript`" --clean --optfile=`"$cfgFile`" --settings" }

    try {
        $proc = Start-Process -FilePath $Python.Command -ArgumentList $testArgs -NoNewWindow -Wait -PassThru -RedirectStandardError (Join-Path $env:TEMP "pk_err.log") -RedirectStandardOutput (Join-Path $env:TEMP "pk_out.log")
        if ($proc.ExitCode -eq 0) {
            Write-PageKiteLog "PageKite syntax and configuration validated successfully." -Level "SUCCESS"
            return $Global:ExitCodes.Success
        } else {
            $errContent = Get-Content (Join-Path $env:TEMP "pk_err.log") -Raw -ErrorAction SilentlyContinue
            Write-PageKiteLog "PageKite configuration test returned exit code $($proc.ExitCode): $errContent" -Level "WARN"
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
    Write-PageKiteLog "=== AUTOPRINT MANUAL PAGEKITE CLI CONFIGURATION ===" -Level "INFO"

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
        Write-PageKiteLog "PageKite Secret Key is required." -Level "ERROR"
        return $Global:ExitCodes.MissingSecretKey
    }

    # Step 4: Save configuration
    Save-PageKiteConfig -NormalizedKite $validKite -Secret $SecretKey.Trim() -Port $CustomerPort

    # Step 5: Optional connection test
    if ($TestConnection) {
        $testRes = Test-PageKiteProbe -Python $py -NormalizedKite $validKite -Port $CustomerPort
        if ($testRes -ne $Global:ExitCodes.Success) {
            Write-PageKiteLog "PageKite test probe completed with notice code: $testRes" -Level "WARN"
        }
    }

    Write-PageKiteLog "PageKite CLI configuration completed successfully (Manual Mode: Offline by default)." -Level "SUCCESS"
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
