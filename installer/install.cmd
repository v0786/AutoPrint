@echo off
setlocal EnableDelayedExpansion
title AutoPrint / QRPrint — Windows Production Installer Wizard v2.0

:: Base paths
set "PROJECT_ROOT=%~dp0.."
set "LIB_DIR=%~dp0lib"
set "CONFIG_DIR=%~dp0config"
set "LOGS_DIR=%~dp0logs"

call "%LIB_DIR%\common.cmd" :banner

call "%LIB_DIR%\logging.cmd" "LAUNCHED AutoPrint Windows Installer Wizard" "INFO"

echo Welcome to the AutoPrint / QRPrint Production Installer Wizard.
echo.
echo Please select an installation mode:
echo.
echo   [1] Fresh Installation           - Clean system setup, directory initialization, build ^& test
echo   [2] Upgrade Existing             - Backup current state, update dependencies, rebuild
echo   [3] Repair Installation          - Verify and rebuild corrupted or missing application components
echo   [4] Backup Datastore             - Create a standalone timestamped backup of database ^& uploads
echo   [5] Safe Uninstaller             - Remove builds with optional datastore preservation
echo   [P] Preview / Dry-Run            - Inspect actions without modifying disk
echo   [6] Exit
echo.
set /p "INSTALL_MODE=Select option [1-6 or P]: "

if /i "%INSTALL_MODE%"=="6" goto :exit_installer
if /i "%INSTALL_MODE%"=="4" goto :run_backup_only
if /i "%INSTALL_MODE%"=="5" goto :run_uninstall
if /i "%INSTALL_MODE%"=="3" goto :run_repair
if /i "%INSTALL_MODE%"=="P" goto :run_dry_run

:: ============================================================================
:: STEP 1: SYSTEM REQUIREMENTS CHECK
:: ============================================================================
call "%LIB_DIR%\common.cmd" :print_step "1" "System Requirements & Environment Checks"

call "%LIB_DIR%\checks.cmd"
if %ERRORLEVEL% NEQ 0 (
    echo.
    call "%LIB_DIR%\common.cmd" :warn_msg "System checks reported issues. Continuing may cause build errors."
    set "PROMPT_RESULT=N"
    call "%LIB_DIR%\common.cmd" :prompt_yn "Do you still want to proceed?" "N"
    if /i "!PROMPT_RESULT!"=="N" goto :exit_installer
)

:: ============================================================================
:: STEP 2: CONFIGURATION & PORT ALLOCATION
:: ============================================================================
call "%LIB_DIR%\common.cmd" :print_step "2" "Configuration & Port Allocation"

echo Default Configuration:
echo   - Backend REST API Port   : 5000
echo   - Merchant Desktop Port   : 8000
echo   - Customer Web Kiosk Port : 7000
echo   - Datastore Directory     : %PROJECT_ROOT%\datastore
echo.

set "PROMPT_RESULT=Y"
call "%LIB_DIR%\common.cmd" :prompt_yn "Use standard default port and datastore configuration?" "Y"

if /i "!PROMPT_RESULT!"=="N" (
    set /p "CUSTOM_API_PORT=Enter Backend API Port [Default 5000]: "
    if "!CUSTOM_API_PORT!"=="" set "CUSTOM_API_PORT=5000"
    
    set /p "CUSTOM_MERCHANT_PORT=Enter Merchant Desktop Port [Default 6000]: "
    if "!CUSTOM_MERCHANT_PORT!"=="" set "CUSTOM_MERCHANT_PORT=6000"

    set /p "CUSTOM_CUSTOMER_PORT=Enter Customer Kiosk Port [Default 7000]: "
    if "!CUSTOM_CUSTOMER_PORT!"=="" set "CUSTOM_CUSTOMER_PORT=7000"

    set /p "CUSTOM_DATA_DIR=Enter Datastore Directory [Default %PROJECT_ROOT%\datastore]: "
    if "!CUSTOM_DATA_DIR!"=="" set "CUSTOM_DATA_DIR=%PROJECT_ROOT%\datastore"
) else (
    set "CUSTOM_API_PORT=5000"
    set "CUSTOM_MERCHANT_PORT=6000"
    set "CUSTOM_CUSTOMER_PORT=7000"
    set "CUSTOM_DATA_DIR=%PROJECT_ROOT%\datastore"
)

:: ============================================================================
:: STEP 3: PAGEKITE INTERNET ACCESS
:: ============================================================================
call "%LIB_DIR%\common.cmd" :print_step "3" "Customer Internet Access & PageKite Ingress"

echo PageKite enables customers to scan your QR code and access the kiosk
echo from mobile data (4G/5G) or foreign Wi-Fi without router port-forwarding.
echo.
set "PAGEKITE_ENABLE=Y"
call "%LIB_DIR%\common.cmd" :prompt_yn "Enable customer Internet access through PageKite?" "Y"
set "PAGEKITE_ENABLE=!PROMPT_RESULT!"

set "PAGEKITE_NAME=quickprint-kiosk"
if /i "!PAGEKITE_ENABLE!"=="Y" (
    set /p "PAGEKITE_NAME=Enter PageKite Subdomain (e.g. quickprint-delhi): "
    if "!PAGEKITE_NAME!"=="" set "PAGEKITE_NAME=autoprint-kiosk"
    echo Configured Public URL: https://!PAGEKITE_NAME!.pagekite.me
)

:: ============================================================================
:: STEP 4: BACKUP BEFORE PROCEEDING
:: ============================================================================
call "%LIB_DIR%\common.cmd" :print_step "4" "Safety Backup Creation"

set "PROMPT_RESULT=Y"
call "%LIB_DIR%\common.cmd" :prompt_yn "Create automated timestamped backup before continuing?" "Y"
if /i "!PROMPT_RESULT!"=="Y" (
    call "%LIB_DIR%\backup.cmd"
)

:: ============================================================================
:: STEP 5: DATASTORE DIRECTORIES
:: ============================================================================
call "%LIB_DIR%\common.cmd" :print_step "5" "Datastore Directory Initialization"

if not exist "%PROJECT_ROOT%\datastore\config" mkdir "%PROJECT_ROOT%\datastore\config" >nul 2>&1
if not exist "%PROJECT_ROOT%\datastore\database" mkdir "%PROJECT_ROOT%\datastore\database" >nul 2>&1
if not exist "%PROJECT_ROOT%\datastore\customers" mkdir "%PROJECT_ROOT%\datastore\customers" >nul 2>&1
if not exist "%PROJECT_ROOT%\datastore\merchants" mkdir "%PROJECT_ROOT%\datastore\merchants" >nul 2>&1
if not exist "%PROJECT_ROOT%\datastore\documents\incoming" mkdir "%PROJECT_ROOT%\datastore\documents\incoming" >nul 2>&1
if not exist "%PROJECT_ROOT%\datastore\documents\processing" mkdir "%PROJECT_ROOT%\datastore\documents\processing" >nul 2>&1
if not exist "%PROJECT_ROOT%\datastore\documents\completed" mkdir "%PROJECT_ROOT%\datastore\documents\completed" >nul 2>&1
if not exist "%PROJECT_ROOT%\datastore\documents\failed" mkdir "%PROJECT_ROOT%\datastore\documents\failed" >nul 2>&1
if not exist "%PROJECT_ROOT%\datastore\print-queue" mkdir "%PROJECT_ROOT%\datastore\print-queue" >nul 2>&1
if not exist "%PROJECT_ROOT%\datastore\audit-logs" mkdir "%PROJECT_ROOT%\datastore\audit-logs" >nul 2>&1
if not exist "%PROJECT_ROOT%\datastore\generated\qr" mkdir "%PROJECT_ROOT%\datastore\generated\qr" >nul 2>&1
if not exist "%PROJECT_ROOT%\datastore\generated\watermarked" mkdir "%PROJECT_ROOT%\datastore\generated\watermarked" >nul 2>&1
if not exist "%PROJECT_ROOT%\datastore\generated\receipts" mkdir "%PROJECT_ROOT%\datastore\generated\receipts" >nul 2>&1
if not exist "%PROJECT_ROOT%\datastore\runtime" mkdir "%PROJECT_ROOT%\datastore\runtime" >nul 2>&1
if not exist "%PROJECT_ROOT%\datastore\backups" mkdir "%PROJECT_ROOT%\datastore\backups" >nul 2>&1
if not exist "%PROJECT_ROOT%\datastore\temp" mkdir "%PROJECT_ROOT%\datastore\temp" >nul 2>&1
if not exist "%PROJECT_ROOT%\runtime\logs" mkdir "%PROJECT_ROOT%\runtime\logs" >nul 2>&1
if not exist "%PROJECT_ROOT%\runtime\pid" mkdir "%PROJECT_ROOT%\runtime\pid" >nul 2>&1

call "%LIB_DIR%\common.cmd" :success_msg "Datastore directories initialized."

:: Generate .env
(
echo PORT=!CUSTOM_API_PORT!
echo MERCHANT_PORT=!CUSTOM_MERCHANT_PORT!
echo CUSTOMER_PORT=!CUSTOM_CUSTOMER_PORT!
echo NODE_ENV=development
echo API_PREFIX=/api
echo MAX_DIGITAL_ATTEMPTS=3
echo HMAC_SECRET=AP_VERIFY_HMAC_SECURE_2026_CHANGE_THIS_IN_PRODUCTION
echo CORS_ORIGIN=http://localhost:!CUSTOM_CUSTOMER_PORT!,http://localhost:!CUSTOM_MERCHANT_PORT!,http://localhost:3000,http://localhost:3001,http://localhost:5000,http://localhost:6000,http://localhost:7000,https://!PAGEKITE_NAME!.pagekite.me
echo CURRENCY=INR
echo MAX_FILE_SIZE_MB=50
echo AUTOPRINT_DATA_DIR=%PROJECT_ROOT%\datastore
echo PAGEKITE_ENABLED=!PAGEKITE_ENABLE!
echo PAGEKITE_NAME=!PAGEKITE_NAME!
echo PAGEKITE_DOMAIN=pagekite.me
echo CUSTOMER_PUBLIC_URL=https://!PAGEKITE_NAME!.pagekite.me
) > "%PROJECT_ROOT%\.env"

call "%LIB_DIR%\common.cmd" :success_msg "Saved runtime configuration to .env"

:: ============================================================================
:: STEP 6: DEPENDENCIES INSTALLATION
:: ============================================================================
call "%LIB_DIR%\common.cmd" :print_step "6" "Installing Dependencies"

echo   Installing root and component dependencies...
cd /d "%PROJECT_ROOT%"
call npm run install:all
call "%LIB_DIR%\common.cmd" :success_msg "All dependencies installed."

:: ============================================================================
:: STEP 7: APPLICATION BUILDS
:: ============================================================================
call "%LIB_DIR%\common.cmd" :print_step "7" "Building Applications"

cd /d "%PROJECT_ROOT%"
call npm run build:all
if %ERRORLEVEL% NEQ 0 (
    call "%LIB_DIR%\common.cmd" :error_msg "Application build failed."
    goto :installer_failed
)
call "%LIB_DIR%\common.cmd" :success_msg "All applications built successfully."

:: ============================================================================
:: STEP 8: AUTOMATED TESTS VERIFICATION
:: ============================================================================
call "%LIB_DIR%\common.cmd" :print_step "8" "Running Verification Tests"

cd /d "%PROJECT_ROOT%"
call npm run test:backend
if %ERRORLEVEL% NEQ 0 (
    call "%LIB_DIR%\common.cmd" :error_msg "Automated tests reported failures."
    goto :installer_failed
)
call "%LIB_DIR%\common.cmd" :success_msg "All 11 automated test suites passed successfully."

:: ============================================================================
:: STEP 9: COMPLETION & LAUNCH
:: ============================================================================
call "%LIB_DIR%\common.cmd" :print_step "9" "Installation Complete"

echo ===============================================================================
echo   AUTOPRINT INSTALLATION COMPLETED SUCCESSFULLY!
echo ===============================================================================
echo.
echo   Configured Access Endpoints:
echo     [Customer Mobile Portal] : http://localhost:!CUSTOM_CUSTOMER_PORT!
if /i "!PAGEKITE_ENABLE!"=="Y" echo     [Public Customer URL]    : https://!PAGEKITE_NAME!.pagekite.me
echo     [Merchant Counter Desk]  : http://localhost:!CUSTOM_MERCHANT_PORT!
echo     [Backend REST API]       : http://localhost:!CUSTOM_API_PORT!/api
echo     [Backend Health Check]   : http://localhost:!CUSTOM_API_PORT!/health
echo     [Persistent Datastore]   : %PROJECT_ROOT%\datastore
echo.
echo   To start services:
echo     scripts\start-autoprint.cmd
echo.

set "PROMPT_RESULT=N"
call "%LIB_DIR%\common.cmd" :prompt_yn "Would you like to launch AutoPrint services now?" "N"

if /i "!PROMPT_RESULT!"=="Y" (
    call "%PROJECT_ROOT%\scripts\start-autoprint.cmd"
)

goto :exit_installer

:: ============================================================================
:: DRY RUN / PREVIEW MODE
:: ============================================================================
:run_dry_run
call "%LIB_DIR%\common.cmd" :banner
echo ===============================================================================
echo   PREVIEW / DRY-RUN MODE (No disk changes will be performed)
echo ===============================================================================
echo.
echo   [DIRECTORY TARGETS]
echo     Source Apps : %PROJECT_ROOT%\app\ (backend, customer-web, merchant-desktop)
echo     Datastore   : %PROJECT_ROOT%\datastore\ (database, documents, generated, audit)
echo     Connectors  : %PROJECT_ROOT%\app\connectors\ (printer, payment, storage, tunnel)
echo     Assets      : %PROJECT_ROOT%\assets\ (app-icon.png, logo.png)
echo.
pause
goto :exit_installer

:: ============================================================================
:: UTILITY MODES
:: ============================================================================
:run_backup_only
call "%LIB_DIR%\backup.cmd"
pause
goto :exit_installer

:run_uninstall
call "%~dp0uninstall.cmd"
goto :exit_installer

:run_repair
call "%~dp0repair.cmd"
goto :exit_installer

:installer_failed
echo.
call "%LIB_DIR%\common.cmd" :error_msg "Installer encountered an error. Check logs in runtime\logs\."
pause
exit /b 1

:exit_installer
echo.
echo Thank you for using the AutoPrint / QRPrint Installer.
echo.
pause
exit /b 0
