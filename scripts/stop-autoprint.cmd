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

echo [OK] All AutoPrint processes stopped safely.
echo.
