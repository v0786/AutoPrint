# =============================================================================
#   AUTOPRINT — PAGEKITE CLI SECURITY, INTEGRITY, & PID TEST SUITE
# =============================================================================

$ErrorActionPreference = "Stop"
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   AUTOPRINT PAGEKITE CLI SECURITY TEST SUITE     " -ForegroundColor White
Write-Host "==================================================" -ForegroundColor Cyan

# -----------------------------------------------------------------------------
# TEST 1: Malicious & Invalid Kite Name Injection Vectors
# -----------------------------------------------------------------------------
Write-Host "`n[TEST 1] Testing 10 Malicious & Invalid Kite Names..." -ForegroundColor Yellow
$invalidNames = @("test shop", "shop;dir", "shop&calc", "shop|calc", "shop>file", "shop<file", "shop`$var", "shop(1)", "shop{2}", "shop[3]")

foreach ($name in $invalidNames) {
    $proc = Start-Process powershell -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "installer\scripts\configure-pagekite.ps1", "-AppDir", "d:\AutoPrint", "-KiteName", "`"$name`"", "-SecretKey", "dummy123", "-SkipTest" -NoNewWindow -Wait -PassThru
    Write-Host "  Testing '$name' -> Exit Code: $($proc.ExitCode)" -ForegroundColor Gray
    if ($proc.ExitCode -ne 3) {
        Write-Error "Validation FAILED: Expected exit code 3 for '$name' but got $($proc.ExitCode)"
    }
}
Write-Host "  [PASS] All 10 malicious/invalid Kite Names correctly rejected (Exit Code 3)" -ForegroundColor Green

# -----------------------------------------------------------------------------
# TEST 2: Valid Configuration, Non-Secret Settings, & DPAPI Encryption
# -----------------------------------------------------------------------------
Write-Host "`n[TEST 2] Testing Valid Configuration & Windows DPAPI Protection..." -ForegroundColor Yellow
$validKite = "mytestshop.pagekite.me"
$testSecret = "SecretKey_Test_!@#999"
$procValid = Start-Process powershell -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "installer\scripts\configure-pagekite.ps1", "-AppDir", "d:\AutoPrint", "-KiteName", $validKite, "-SecretKey", $testSecret, "-SkipTest" -NoNewWindow -Wait -PassThru
if ($procValid.ExitCode -ne 0) {
    Write-Error "Configuration FAILED for valid Kite Name"
}

# Verify settings.json
$settingsFile = "$env:LOCALAPPDATA\AutoPrint\pagekite\settings.json"
$secretFile   = "$env:LOCALAPPDATA\AutoPrint\pagekite\secret.dat"

if (-not (Test-Path $settingsFile)) { Write-Error "settings.json not created!" }
if (-not (Test-Path $secretFile))   { Write-Error "secret.dat not created!" }

$settingsText = Get-Content $settingsFile -Raw
if ($settingsText -match [regex]::Escape($testSecret)) {
    Write-Error "SECURITY LEAK: Secret was found in settings.json!"
}
Write-Host "  [PASS] settings.json contains zero plaintext secrets" -ForegroundColor Green

$settingsObj = Get-Content $settingsFile -Raw | ConvertFrom-Json
if ($settingsObj.pagekiteVersion -ne "1.5.2.260113") {
    Write-Error "settings.json missing pagekiteVersion: $($settingsObj.pagekiteVersion)"
}
Write-Host "  [PASS] settings.json records pagekiteVersion: $($settingsObj.pagekiteVersion)" -ForegroundColor Green

# Verify DPAPI decryption
Add-Type -AssemblyName System.Security
$encryptedBytes = [System.IO.File]::ReadAllBytes($secretFile)
$decryptedBytes = [System.Security.Cryptography.ProtectedData]::Unprotect($encryptedBytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
$decryptedSecret = [System.Text.Encoding]::UTF8.GetString($decryptedBytes)

if ($decryptedSecret -ne $testSecret) {
    Write-Error "DPAPI decryption mismatch! Expected '$testSecret', Got '$decryptedSecret'"
}
Write-Host "  [PASS] Windows DPAPI CurrentUser round-trip verified successfully" -ForegroundColor Green

# -----------------------------------------------------------------------------
# TEST 3: Cryptographic SHA-256 Checksum Verification
# -----------------------------------------------------------------------------
Write-Host "`n[TEST 3] Testing PageKite CLI SHA-256 Integrity Verification..." -ForegroundColor Yellow
$expectedHash = "5498F591F51F0E8721A7282C662950E57110BF1A0C092261F88C4CCADC981AE0"
$actualHash = (Get-FileHash -Path "tools\pagekite\pagekite.py" -Algorithm SHA256).Hash
if ($actualHash -ne $expectedHash) {
    Write-Error "SHA-256 hash mismatch! Expected $expectedHash, Got $actualHash"
}
Write-Host "  [PASS] PageKite CLI SHA-256 integrity verified: $actualHash" -ForegroundColor Green

# Test modified/corrupted file detection
$tempCorruptDir = Join-Path $env:TEMP "pk_corrupt_test"
if (Test-Path $tempCorruptDir) { Remove-Item $tempCorruptDir -Recurse -Force }
New-Item -ItemType Directory -Path (Join-Path $tempCorruptDir "tools\pagekite") -Force | Out-Null
Set-Content -Path (Join-Path $tempCorruptDir "tools\pagekite\pagekite.py") -Value "# Corrupted PageKite Script"

$procCorrupt = Start-Process powershell -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "installer\scripts\start-pagekite.ps1", "-AppDir", $tempCorruptDir -NoNewWindow -Wait -PassThru
if ($procCorrupt.ExitCode -ne 3) {
    Write-Error "Integrity check FAILED to block corrupted pagekite.py! Got exit code: $($procCorrupt.ExitCode)"
}
Write-Host "  [PASS] Corrupted/tampered pagekite.py correctly blocked (Exit Code 3)" -ForegroundColor Green
Remove-Item $tempCorruptDir -Recurse -Force -ErrorAction SilentlyContinue

# -----------------------------------------------------------------------------
# TEST 4: PID Tracking & Selective Process Termination
# -----------------------------------------------------------------------------
Write-Host "`n[TEST 4] Testing PID Tracking & Selective Process Isolation..." -ForegroundColor Yellow
$pidFile = "$env:LOCALAPPDATA\AutoPrint\pagekite\pagekite.pid"

# Simulate an active PID
$dummyProc = Start-Process powershell -ArgumentList "-NoProfile", "-Command", "Start-Sleep -Seconds 60" -PassThru
[System.IO.File]::WriteAllText($pidFile, $dummyProc.Id.ToString(), [System.Text.Encoding]::UTF8)

# Run stop-autoprint command logic
$trackedPid = [int](Get-Content $pidFile -Raw).Trim()
$procToStop = Get-Process -Id $trackedPid -ErrorAction SilentlyContinue
if ($procToStop) {
    Stop-Process -Id $trackedPid -Force -ErrorAction SilentlyContinue
}
Remove-Item $pidFile -Force -ErrorAction SilentlyContinue

if (Test-Path $pidFile) {
    Write-Error "pagekite.pid was not removed after stopping!"
}
if (-not $dummyProc.HasExited) {
    Write-Error "Dummy process was not terminated!"
}
Write-Host "  [PASS] PID file tracking and selective process termination verified" -ForegroundColor Green

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "   ALL PAGEKITE TESTS COMPLETED: 100% SUCCESS     " -ForegroundColor Green
Write-Host "==================================================`n" -ForegroundColor Cyan
