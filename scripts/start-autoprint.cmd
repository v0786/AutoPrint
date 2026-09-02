@echo off
setlocal enabledelayedexpansion

title AutoPrint Service Manager - Startup
cls

echo ===============================================================================
echo    AUTOPRINT / QRPRINT -- PRODUCTION SERVICE LAUNCHER v2.0
echo    Automated Print Shop Management, Dynamic Ingress ^& Verification
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

if exist ".env" (
    for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
        if "%%A"=="PORT" set "BACKEND_PORT=%%B"
        if "%%A"=="MERCHANT_PORT" set "MERCHANT_PORT=%%B"
        if "%%A"=="CUSTOMER_PORT" set "CUSTOMER_PORT=%%B"
    )
)

echo [1/4] Starting AutoPrint Backend REST API Engine (Port %BACKEND_PORT%)...
start "AutoPrint Backend (:5000)" /B node app\backend\dist\server.js > runtime\logs\backend.log 2>&1

echo [2/4] Starting Customer Web Kiosk & API Reverse Proxy (Port %CUSTOMER_PORT%)...
start "AutoPrint Customer Kiosk (:7000)" /B node app\customer-web\server.js > runtime\logs\customer.log 2>&1

echo [3/4] Starting Merchant Desktop Desk Server (Port %MERCHANT_PORT%)...
start "AutoPrint Merchant Desk (:6000)" /B npx vite preview --port %MERCHANT_PORT% --host 0.0.0.0 --outDir app\merchant-desktop\dist > runtime\logs\merchant.log 2>&1

echo [4/4] Waiting for services to initialize...
timeout /t 3 /nobreak > nul

cls
echo ===============================================================================
echo    AUTOPRINT PRINT MANAGEMENT SYSTEM -- ALL SERVICES ONLINE
echo ===============================================================================
echo.
echo    [Customer Mobile Portal] : http://localhost:%CUSTOMER_PORT%
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
