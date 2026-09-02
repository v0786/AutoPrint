@echo off
setlocal
title AutoPrint — Stopping Application Services

echo ===============================================================================
echo   AUTOPRINT / QRPRINT — STOPPING BACKGROUND SERVICES
echo ===============================================================================
echo.

echo Terminating running AutoPrint node processes...
taskkill /F /IM node.exe /T >nul 2>&1

echo.
echo [SUCCESS] AutoPrint services stopped.
echo.
pause
