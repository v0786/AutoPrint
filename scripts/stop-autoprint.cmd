@echo off
setlocal

title AutoPrint Service Manager - Shutdown
cls

echo ===============================================================================
echo    AUTOPRINT / QRPRINT -- SERVICE SHUTDOWN UTILITY
echo ===============================================================================
echo.

echo Stopping all AutoPrint background Node and Vite processes...
taskkill /F /IM node.exe /T > nul 2>&1
taskkill /F /IM pagekite.exe /T > nul 2>&1

:: Clean up any running PageKite python instances
powershell -NoProfile -Command "Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.CommandLine -match 'pagekite\.py' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }" > nul 2>&1

echo [OK] All AutoPrint processes stopped safely.
echo.
