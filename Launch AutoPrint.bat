@echo off
setlocal enabledelayedexpansion

title AutoPrint One-Click Launcher
cls

echo ===============================================================================
echo    AUTOPRINT / QRPRINT -- 1-CLICK SYSTEM LAUNCHER
echo    Starting Backend, Customer Web, Merchant Desk, and PageKite...
echo ===============================================================================
echo.

set "ROOT_DIR=%~dp0"
pushd "%ROOT_DIR%"

:: Stop any stale processes first to ensure clean startup
taskkill /F /IM node.exe /T > nul 2>&1
taskkill /F /IM python.exe /T > nul 2>&1

:: Ensure required directories exist
if not exist "datastore\database" mkdir "datastore\database"
if not exist "datastore\generated\qr" mkdir "datastore\generated\qr"
if not exist "runtime\logs" mkdir "runtime\logs"
if not exist "runtime\pid" mkdir "runtime\pid"

:: Default Ports & Config
set "BACKEND_PORT=5000"
set "MERCHANT_PORT=8000"
set "CUSTOMER_PORT=7000"
set "PAGEKITE_ENABLED=true"
set "PAGEKITE_NAME=autoprint"
set "PAGEKITE_SECRET=xakd4af2azx229x94effe9az79262cxz"

if exist ".env" (
    for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
        if "%%A"=="PORT" set "BACKEND_PORT=%%B"
        if "%%A"=="MERCHANT_PORT" set "MERCHANT_PORT=%%B"
        if "%%A"=="CUSTOMER_PORT" set "CUSTOMER_PORT=%%B"
        if "%%A"=="PAGEKITE_ENABLED" set "PAGEKITE_ENABLED=%%B"
        if "%%A"=="PAGEKITE_NAME" set "PAGEKITE_NAME=%%B"
        if "%%A"=="PAGEKITE_SECRET" set "PAGEKITE_SECRET=%%B"
    )
)

echo [1/4] Starting AutoPrint Backend Engine (Port %BACKEND_PORT%)...
start "AutoPrint Backend" /B node app\backend\dist\server.js > runtime\logs\backend.log 2>&1

echo [2/4] Starting Customer Web Kiosk (Port %CUSTOMER_PORT%)...
start "AutoPrint Customer Kiosk" /B node app\customer-web\server.js > runtime\logs\customer.log 2>&1

echo [3/4] Starting Merchant Desktop Desk (Port %MERCHANT_PORT%)...
start "AutoPrint Merchant Desk" /B node app\merchant-desktop\server.js > runtime\logs\merchant.log 2>&1

if /i "%PAGEKITE_ENABLED%"=="true" (
    echo [4/4] Starting PageKite Tunnel (https://%PAGEKITE_NAME%.pagekite.me)...
    start "PageKite Tunnel" /B python scripts\pagekite.py --nossl --service_cfg=%PAGEKITE_NAME%.pagekite.me:%CUSTOMER_PORT%:%PAGEKITE_SECRET% %CUSTOMER_PORT% %PAGEKITE_NAME%.pagekite.me > runtime\logs\pagekite.log 2>&1
)

echo.
echo Waiting for servers to initialize...
powershell -NoProfile -Command "Start-Sleep -Seconds 3" > nul 2>&1

echo.
echo [OK] Opening Web Browser with Customer and Merchant Interfaces...
start http://localhost:%MERCHANT_PORT%
start http://localhost:%CUSTOMER_PORT%

cls
echo ===============================================================================
echo    AUTOPRINT PRINT MANAGEMENT SYSTEM -- ALL SERVICES ONLINE!
echo ===============================================================================
echo.
echo    Browser Windows Opened:
echo      1. Merchant Counter Desk  : http://localhost:%MERCHANT_PORT%
echo      2. Customer Web Interface : http://localhost:%CUSTOMER_PORT%
echo.
echo    Public Internet Access:
echo      - Customer Mobile Portal  : https://%PAGEKITE_NAME%.pagekite.me
echo.
echo    Backend REST Engine:
echo      - API Endpoint            : http://localhost:%BACKEND_PORT%/api
echo      - Health Diagnostic       : http://localhost:%BACKEND_PORT%/health
echo.
echo    (You can close this window at any time. Services will run in the background.)
echo    To stop all services: double-click scripts\stop-autoprint.cmd
echo ===============================================================================
echo.

popd
timeout /t 5 > nul
