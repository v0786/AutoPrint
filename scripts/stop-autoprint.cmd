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

:: Gracefully terminate AutoPrint-owned PageKite tunnel process using tracked PID
powershell -NoProfile -Command "& {
    `$pidFile = Join-Path `$env:LOCALAPPDATA 'AutoPrint\pagekite\pagekite.pid'
    if (Test-Path `$pidFile) {
        try {
            `$trackedPid = [int](Get-Content `$pidFile -Raw).Trim()
            `$proc = Get-Process -Id `$trackedPid -ErrorAction SilentlyContinue
            if (`$proc) {
                Stop-Process -Id `$trackedPid -Force -ErrorAction SilentlyContinue
            }
        } catch { }
        Remove-Item `$pidFile -Force -ErrorAction SilentlyContinue
    }
}" > nul 2>&1

echo [OK] All AutoPrint processes stopped safely.
echo.
