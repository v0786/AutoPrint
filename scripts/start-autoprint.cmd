@echo off
setlocal enabledelayedexpansion

title AutoPrint Service Manager - Startup
cls

echo ===============================================================================
echo    AUTOPRINT / QRPRINT -- PRODUCTION SERVICE LAUNCHER v2.0
echo    Automated Print Shop Management and Verification
echo ===============================================================================
echo.

set "ROOT_DIR=%~dp0.."
pushd "%ROOT_DIR%"

:: Ensure datastore and runtime directories exist
if not exist "datastore\database" mkdir "datastore\database"
if not exist "datastore\generated\qr" mkdir "datastore\generated\qr"
if not exist "runtime\logs" mkdir "runtime\logs"
if not exist "runtime\pid" mkdir "runtime\pid"

:: Load configured ports from central appsettings.json or .env
set "BACKEND_PORT=5000"
set "MERCHANT_PORT=8000"
set "CUSTOMER_PORT=7000"

set "CONFIG_FILE=C:\ProgramData\AutoPrint\config\appsettings.json"
if not exist "%CONFIG_FILE%" set "CONFIG_FILE=%ROOT_DIR%\config\appsettings.json"

if exist "%CONFIG_FILE%" (
    for /f "delims=" %%A in ('powershell -NoProfile -Command "$cfg = Get-Content -LiteralPath '%CONFIG_FILE%' -Raw | ConvertFrom-Json; if ($cfg.backendPort) {$cfg.backendPort} elseif ($cfg.ports -and $cfg.ports.backend) {$cfg.ports.backend} else {5000}"') do set "BACKEND_PORT=%%A"
    for /f "delims=" %%A in ('powershell -NoProfile -Command "$cfg = Get-Content -LiteralPath '%CONFIG_FILE%' -Raw | ConvertFrom-Json; if ($cfg.merchantDesktopPort) {$cfg.merchantDesktopPort} elseif ($cfg.ports -and $cfg.ports.merchant) {$cfg.ports.merchant} else {8000}"') do set "MERCHANT_PORT=%%A"
    for /f "delims=" %%A in ('powershell -NoProfile -Command "$cfg = Get-Content -LiteralPath '%CONFIG_FILE%' -Raw | ConvertFrom-Json; if ($cfg.customerWebPort) {$cfg.customerWebPort} elseif ($cfg.ports -and $cfg.ports.customer) {$cfg.ports.customer} else {7000}"') do set "CUSTOMER_PORT=%%A"
)

if exist ".env" (
    for /f "usebackq tokens=1,* delims==" %%A in (".env") do (
        if "%%A"=="PORT" set "BACKEND_PORT=%%B"
        if "%%A"=="MERCHANT_PORT" set "MERCHANT_PORT=%%B"
        if "%%A"=="CUSTOMER_PORT" set "CUSTOMER_PORT=%%B"
    )
)

:: Explicitly set environment variables for child processes
set "PORT=%BACKEND_PORT%"
set "BACKEND_PORT=%BACKEND_PORT%"
set "CUSTOMER_PORT=%CUSTOMER_PORT%"
set "MERCHANT_PORT=%MERCHANT_PORT%"

echo [1/4] Starting AutoPrint Backend REST API Engine (Port %BACKEND_PORT%)...
start "AutoPrint Backend" /B node app\backend\dist\server.js > runtime\logs\backend.log 2>&1

echo [2/4] Starting Customer Web Kiosk (Port %CUSTOMER_PORT%)...
start "AutoPrint Customer Kiosk" /B node app\customer-web\server.js > runtime\logs\customer.log 2>&1

echo [3/4] Starting Merchant Desktop Desk (Port %MERCHANT_PORT%)...
start "AutoPrint Merchant Desk" /B node app\merchant-desktop\server.js > runtime\logs\merchant.log 2>&1

echo Waiting for services to initialize...
powershell -NoProfile -Command "Start-Sleep -Seconds 3" > nul 2>&1

cls
echo ===============================================================================
echo    AUTOPRINT PRINT MANAGEMENT SYSTEM -- ALL SERVICES ONLINE
echo ===============================================================================
echo.
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
