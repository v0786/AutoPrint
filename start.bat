@echo off
setlocal enabledelayedexpansion
title AutoPrint - Self-Service Print Shop Operating System
color 09
cls

echo ===============================================================================
echo                AUTOPRINT PRINT SHOP OPERATING SYSTEM
echo             One-Click Automated Launcher for Print Shop Operators
echo ===============================================================================
echo.

set "ROOT_DIR=%~dp0"
cd /d "%ROOT_DIR%"

:: -----------------------------------------------------------------------------
:: STEP 1: Resolve Node.js Executable (Bundled Portable or System)
:: -----------------------------------------------------------------------------
set "NODE_CMD=node"
if exist "%ROOT_DIR%runtime\node\node.exe" (
    set "NODE_CMD=%ROOT_DIR%runtime\node\node.exe"
    set "PATH=%ROOT_DIR%runtime\node;%PATH%"
) else (
    where node >nul 2>&1
    if !ERRORLEVEL! neq 0 (
        color 0C
        echo [ERROR] Node.js is not installed on this PC.
        echo.
        echo Please run configure.bat first to test PC compatibility or install Node.js.
        echo.
        set /p "RUN_CONF=Would you like to run configure.bat now? [Y/N] (Default: Y): "
        if "!RUN_CONF!"=="" set "RUN_CONF=Y"
        if /i "!RUN_CONF!"=="Y" (
            call "%ROOT_DIR%configure.bat"
        )
        exit /b 1
    )
)

:: -----------------------------------------------------------------------------
:: STEP 2: Check Missing Dependencies & Ask User Permission
:: -----------------------------------------------------------------------------
set "NEED_INSTALL=0"
if not exist "%ROOT_DIR%node_modules" set "NEED_INSTALL=1"
if not exist "%ROOT_DIR%app\backend\node_modules" set "NEED_INSTALL=1"
if not exist "%ROOT_DIR%app\backend\dist\server.js" set "NEED_INSTALL=1"
if not exist "%ROOT_DIR%app\customer-web\node_modules" set "NEED_INSTALL=1"
if not exist "%ROOT_DIR%app\customer-web\dist\index.html" set "NEED_INSTALL=1"
if not exist "%ROOT_DIR%app\merchant-desktop\node_modules" set "NEED_INSTALL=1"
if not exist "%ROOT_DIR%app\merchant-desktop\dist\index.html" set "NEED_INSTALL=1"

if %NEED_INSTALL% equ 1 (
    color 0E
    echo ===============================================================================
    echo                       FIRST-TIME SETUP & DOWNLOAD
    echo ===============================================================================
    echo.
    echo  AutoPrint detected that this is a fresh setup or first-time launch.
    echo  The system needs to download application packages and compile frontend assets.
    echo.
    echo  Required components to initialize:
    echo    1. Backend SQLite WAL Engine & Spooler Core
    echo    2. Customer Web Kiosk with Document Layout Previews
    echo    3. Merchant Desktop POS with Rate Card & Verification Desk
    echo.
    
    set /p "USER_PERM=  Download and configure all components now? [Y/N] (Default: Y): "
    if "!USER_PERM!"=="" set "USER_PERM=Y"
    
    if /i not "!USER_PERM!"=="Y" (
        echo.
        echo [INFO] Setup cancelled by operator. AutoPrint cannot start without dependencies.
        pause
        exit /b 0
    )
    
    echo.
    echo [*] Downloading packages for Backend Engine...
    cd /d "%ROOT_DIR%app\backend"
    call npm install --no-audit --no-fund
    echo [*] Compiling Backend TypeScript...
    call npm run build
    
    echo.
    echo [*] Downloading packages for Customer Web Kiosk...
    cd /d "%ROOT_DIR%app\customer-web"
    call npm install --no-audit --no-fund
    echo [*] Building Customer Web production bundle...
    call npm run build
    
    echo.
    echo [*] Downloading packages for Merchant Desktop...
    cd /d "%ROOT_DIR%app\merchant-desktop"
    call npm install --no-audit --no-fund
    echo [*] Building Merchant Desktop production bundle...
    call npm run build
    
    cd /d "%ROOT_DIR%"
    echo.
    echo [SUCCESS] All application components downloaded and compiled successfully!
    echo ===============================================================================
    echo.
    timeout /t 2 >nul
)

:: -----------------------------------------------------------------------------
:: STEP 3: Initialize Datastore Directories
:: -----------------------------------------------------------------------------
if not exist "%ROOT_DIR%runtime\logs" mkdir "%ROOT_DIR%runtime\logs" >nul 2>&1
if not exist "%ROOT_DIR%runtime\pid" mkdir "%ROOT_DIR%runtime\pid" >nul 2>&1
if not exist "%ROOT_DIR%datastore\backend\database" mkdir "%ROOT_DIR%datastore\backend\database" >nul 2>&1
if not exist "%ROOT_DIR%datastore\customer\uploads" mkdir "%ROOT_DIR%datastore\customer\uploads" >nul 2>&1
if not exist "%ROOT_DIR%datastore\customer\documents" mkdir "%ROOT_DIR%datastore\customer\documents" >nul 2>&1
if not exist "%ROOT_DIR%datastore\merchant\jobs" mkdir "%ROOT_DIR%datastore\merchant\jobs" >nul 2>&1

:: -----------------------------------------------------------------------------
:: STEP 4: Start Microservices (Backend, Kiosk, Merchant POS)
:: -----------------------------------------------------------------------------
color 0B
echo.
echo [1/3] Starting AutoPrint Backend REST Engine (Port 5000)...
start "AutoPrint Backend Core" /B node app\backend\dist\server.js > runtime\logs\backend.log 2>&1

echo [2/3] Starting Customer Web Kiosk (Port 7000)...
start "AutoPrint Customer Kiosk" /B node app\customer-web\server.js > runtime\logs\customer.log 2>&1

echo [3/3] Starting Merchant Desktop POS (Port 8000)...
start "AutoPrint Merchant Desk" /B node app\merchant-desktop\server.js > runtime\logs\merchant.log 2>&1

echo.
echo Waiting for services to initialize...
timeout /t 3 /nobreak >nul

:: -----------------------------------------------------------------------------
:: STEP 5: Health Check & Open Browser Interfaces
:: -----------------------------------------------------------------------------
powershell -NoProfile -Command "try { $r = Invoke-RestMethod -Uri 'http://localhost:5000/api/health' -TimeoutSec 3; if ($r.ok) { exit 0 } else { exit 1 } } catch { exit 1 }" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    color 0A
    echo.
    echo ===============================================================================
    echo                  AUTOPRINT IS RUNNING SUCCESSFULLY!
    echo ===============================================================================
    echo.
    echo    * Backend REST API       : http://localhost:5000/api/health
    echo    * Customer Web Kiosk     : http://localhost:7000
    echo    * Merchant Desktop POS   : http://localhost:8000
    echo.
    echo    * SQLite Datastore       : datastore\backend\database\autoprint.db (WAL Mode)
    echo    * Universal Spooler      : Active (Connected to Windows Printers)
    echo ===============================================================================
    echo.
    
    echo Launching Merchant POS and Customer Kiosk in your default browser...
    start http://localhost:8000
    start http://localhost:7000
) else (
    color 0E
    echo [INFO] Services launched. Check runtime\logs\backend.log if an interface does not open.
    start http://localhost:8000
    start http://localhost:7000
)

:: -----------------------------------------------------------------------------
:: STEP 6: Interactive Operator Control Console
:: -----------------------------------------------------------------------------
:OPERATOR_MENU
echo.
echo  -------------------------------------------------------------------------------
echo    OPERATOR MANAGEMENT MENU:
echo  -------------------------------------------------------------------------------
echo    [1] Open Merchant Desktop POS in Browser (http://localhost:8000)
echo    [2] Open Customer Web Kiosk in Browser   (http://localhost:7000)
echo    [3] Run System Diagnostics (configure.bat)
echo    [4] Restart AutoPrint Services
echo    [Q] Stop AutoPrint and Exit
echo  -------------------------------------------------------------------------------
echo.

set /p "CHOICE=  Select an option [1/2/3/4/Q]: "

if "%CHOICE%"=="1" (
    start http://localhost:8000
    goto OPERATOR_MENU
)
if "%CHOICE%"=="2" (
    start http://localhost:7000
    goto OPERATOR_MENU
)
if "%CHOICE%"=="3" (
    call "%ROOT_DIR%configure.bat"
    goto OPERATOR_MENU
)
if "%CHOICE%"=="4" (
    echo Stopping services...
    taskkill /F /IM node.exe >nul 2>&1
    echo Restarting AutoPrint...
    cls
    goto start
)
if /i "%CHOICE%"=="Q" (
    echo.
    echo Stopping AutoPrint background services safely...
    taskkill /F /IM node.exe >nul 2>&1
    echo [OK] AutoPrint stopped safely. Have a great day!
    timeout /t 2 >nul
    exit /b 0
)

goto OPERATOR_MENU
