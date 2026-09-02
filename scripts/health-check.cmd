@echo off
setlocal
title AutoPrint — Backend Health Check

echo ===============================================================================
echo   AUTOPRINT BACKEND HEALTH CHECK
echo ===============================================================================
echo.
echo Querying http://localhost:4100/health ...
echo.

powershell -NoProfile -Command "try { $res = Invoke-RestMethod -Uri 'http://localhost:4100/health' -TimeoutSec 5; Write-Host '[HEALTH STATUS] OK' -ForegroundColor Green; $res | ConvertTo-Json -Depth 4 } catch { Write-Host '[HEALTH STATUS] FAILED - Backend not responding on http://localhost:4100/health' -ForegroundColor Red; Write-Host $_.Exception.Message }"

echo.
pause
