# Test Suite for PageKite Security & Validation

$ErrorActionPreference = "Stop"
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "   AUTOPRINT PAGEKITE CLI SECURITY TEST SUITE     " -ForegroundColor White
Write-Host "==================================================" -ForegroundColor Cyan

# Test 1: Invalid Kite Name rejections
$invalidNames = @("test shop", "shop;dir", "shop&calc", "shop|calc", "shop>file", "shop<file", "shop`$var", "shop(1)", "shop{2}", "shop[3]")

foreach ($name in $invalidNames) {
    $proc = Start-Process powershell -ArgumentList "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "installer\scripts\configure-pagekite.ps1", "-AppDir", "d:\AutoPrint", "-KiteName", "`"$name`"", "-SecretKey", "dummy123", "-SkipTest" -NoNewWindow -Wait -PassThru
    Write-Host "  Testing '$name' -> Exit Code: $($proc.ExitCode)" -ForegroundColor Gray
    if ($proc.ExitCode -ne 3) {
        Write-Error "Validation FAILED: Expected exit code 3 for '$name' but got $($proc.ExitCode)"
    }
}
Write-Host "[PASS] All 10 malicious/invalid Kite Names correctly rejected (Exit Code 3)" -ForegroundColor Green

# Test 2: Valid configuration and DPAPI encryption
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
if ($settingsText -match $testSecret) {
    Write-Error "SECURITY LEAK: Secret was found in settings.json!"
}
Write-Host "[PASS] settings.json contains zero plaintext secrets" -ForegroundColor Green

# Verify DPAPI decryption
Add-Type -AssemblyName System.Security
$encryptedBytes = [System.IO.File]::ReadAllBytes($secretFile)
$decryptedBytes = [System.Security.Cryptography.ProtectedData]::Unprotect($encryptedBytes, $null, [System.Security.Cryptography.DataProtectionScope]::CurrentUser)
$decryptedSecret = [System.Text.Encoding]::UTF8.GetString($decryptedBytes)

if ($decryptedSecret -ne $testSecret) {
    Write-Error "DPAPI decryption mismatch! Expected '$testSecret', Got '$decryptedSecret'"
}
Write-Host "[PASS] Windows DPAPI CurrentUser round-trip verified successfully" -ForegroundColor Green

# Test 3: Check SHA-256 Checksum of tools/pagekite/pagekite.py
$expectedHash = "5498F591F51F0E8721A7282C662950E57110BF1A0C092261F88C4CCADC981AE0"
$actualHash = (Get-FileHash -Path "tools\pagekite\pagekite.py" -Algorithm SHA256).Hash
if ($actualHash -ne $expectedHash) {
    Write-Error "SHA-256 hash mismatch! Expected $expectedHash, Got $actualHash"
}
Write-Host "[PASS] PageKite CLI SHA-256 integrity verified: $actualHash" -ForegroundColor Green

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host "   ALL PAGEKITE SECURITY TESTS PASSED (100%)      " -ForegroundColor Green
Write-Host "==================================================`n" -ForegroundColor Cyan
