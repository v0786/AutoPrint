@echo off
setlocal enabledelayedexpansion

title AutoPrint Service Manager - Startup
cls

echo ===============================================================================
echo    AUTOPRINT / QRPRINT -- PRODUCTION SERVICE LAUNCHER v2.0
echo    Automated Print Shop Management, PageKite Ingress and Verification
echo ===============================================================================
echo.

set "ROOT_DIR=%~dp0.."
pushd "%ROOT_DIR%"

:: Ensure datastore and runtime directories exist
if not exist "datastore\database" mkdir "datastore\database"
if not exist "datastore\generated\qr" mkdir "datastore\generated\qr"
if not exist "runtime\logs" mkdir "runtime\logs"
if not exist "runtime\pid" mkdir "runtime\pid"

:: Load configured ports from .env if present
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

echo [1/4] Starting AutoPrint Backend REST API Engine (Port %BACKEND_PORT%)...
start "AutoPrint Backend" /B node app\backend\dist\server.js > runtime\logs\backend.log 2>&1

echo [2/4] Starting Customer Web Kiosk (Port %CUSTOMER_PORT%)...
start "AutoPrint Customer Kiosk" /B node app\customer-web\server.js > runtime\logs\customer.log 2>&1

echo [3/4] Starting Merchant Desktop Desk (Port %MERCHANT_PORT%)...
start "AutoPrint Merchant Desk" /B node app\merchant-desktop\server.js > runtime\logs\merchant.log 2>&1

if /i "%PAGEKITE_ENABLED%"=="true" goto :start_pagekite
echo [4/4] PageKite Tunnel is disabled in .env.
goto :after_pagekite

:start_pagekite
echo [4/4] Starting PageKite Tunnel: https://%PAGEKITE_NAME%.pagekite.me to port %CUSTOMER_PORT%...
start "PageKite Tunnel" /B python scripts\pagekite.py --nossl --service_cfg=%PAGEKITE_NAME%.pagekite.me:%CUSTOMER_PORT%:%PAGEKITE_SECRET% %CUSTOMER_PORT% %PAGEKITE_NAME%.pagekite.me > runtime\logs\pagekite.log 2>&1

:after_pagekite
echo Waiting for services to initialize...
powershell -NoProfile -Command "Start-Sleep -Seconds 3" > nul 2>&1

cls
echo ===============================================================================
echo    AUTOPRINT PRINT MANAGEMENT SYSTEM -- ALL SERVICES ONLINE
echo ===============================================================================
echo.
echo    [Customer Public Portal] : https://%PAGEKITE_NAME%.pagekite.me
echo    [Customer Local Kiosk]   : http://localhost:%CUSTOMER_PORT%
echo    [Merchant Counter Desk]  : http://localhost:%MERCHANT_PORT%
echo    [Backend REST API]       : http://localhost:%BACKEND_PORT%/api
echo    [Backend Health]         : http://localhost:%BACKEND_PORT%/health
echo.
echo    Logs Directory           : %ROOT_DIR%\runtime\logs
echo    Persistent Datastore     : %ROOT_DIR%\datastore
echo.
echo    To inspect real-time status : scripts\status-autoprint.cmd
echo    To stop all services        : scripts\stop-autoprint.cmd
echo ===============================================================================
echo.

popd
