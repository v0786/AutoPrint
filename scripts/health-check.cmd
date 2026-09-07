@echo off
setlocal
title AutoPrint — Backend Health Check

echo ===============================================================================
echo   AUTOPRINT BACKEND HEALTH CHECK
echo ===============================================================================
echo.

powershell -NoProfile -Command "
$port = 5000;
$cfgFile = 'C:\ProgramData\AutoPrint\config\appsettings.json';
if (Test-Path $cfgFile) {
    try {
        $cfg = Get-Content $cfgFile -Raw | ConvertFrom-Json;
        if ($cfg.backendPort) { $port = [int]$cfg.backendPort }
        elseif ($cfg.ports.backend) { $port = [int]$cfg.ports.backend }
    } catch {}
} elseif (Test-Path '.env') {
    Get-Content '.env' | ForEach-Object {
        if ($_ -match '^PORT=(\d+)') { $port = [int]$matches[1] }
    }
}

Write-Host ('Querying http://localhost:' + $port + '/health ...') -ForegroundColor Cyan;
try {
    $res = Invoke-RestMethod -Uri ('http://localhost:' + $port + '/health') -TimeoutSec 5;
    Write-Host '[HEALTH STATUS] OK' -ForegroundColor Green;
    $res | ConvertTo-Json -Depth 4
} catch {
    Write-Host ('[HEALTH STATUS] FAILED - Backend not responding on http://localhost:' + $port + '/health') -ForegroundColor Red;
    Write-Host $_.Exception.Message
}
"

echo.
pause
