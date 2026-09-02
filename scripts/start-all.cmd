@echo off
setlocal
title AutoPrint — Starting Application Services

echo ===============================================================================
echo   AUTOPRINT / QRPRINT — STARTING SERVICES
echo ===============================================================================
echo.

set "PROJECT_ROOT=%~dp0.."

echo [1/3] Starting Backend REST API Server (Port 4100)...
start "AutoPrint Backend Engine" cmd /k "cd /d %PROJECT_ROOT%\apps\backend && npm run dev"

timeout /t 3 /nobreak >nul

echo [2/3] Starting Merchant Desktop Print Manager...
start "AutoPrint Merchant Desktop" cmd /k "cd /d %PROJECT_ROOT%\apps\merchant-desktop && npm run dev"

echo [3/3] Starting Customer Kiosk Interface...
start "AutoPrint Customer Kiosk" cmd /k "cd /d %PROJECT_ROOT%\apps\customer-web && npm run dev"

echo.
echo ===============================================================================
echo   All AutoPrint services launched in separate windows:
echo     - Backend REST API Engine : http://localhost:4100/api
echo     - Merchant Desktop Manager: http://localhost:5000 (or port in window)
echo     - Customer Kiosk Portal   : http://localhost:8085 (or port in window)
echo ===============================================================================
echo.
pause
