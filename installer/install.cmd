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
echo   [4] Reorganize Project           - Establish clean apps/ vs datastore/ structure
echo   [5] Backup Datastore             - Create a standalone timestamped backup of database ^& uploads
echo   [6] Safe Uninstaller             - Remove builds with optional datastore preservation
echo   [P] Preview / Dry-Run            - Inspect actions without modifying disk
echo   [7] Exit
echo.
set /p "INSTALL_MODE=Select option [1-7 or P]: "

if /i "%INSTALL_MODE%"=="7" goto :exit_installer
if /i "%INSTALL_MODE%"=="5" goto :run_backup_only
if /i "%INSTALL_MODE%"=="6" goto :run_uninstall
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
:: STEP 2: CONFIGURATION PARAMETERS
:: ============================================================================
call "%LIB_DIR%\common.cmd" :print_step "2" "Configuration & Port Allocation"

echo Default Configuration:
echo   - Backend REST API Port   : 4100
echo   - Customer Web Kiosk Port : 3000
echo   - Merchant Desktop Port   : 3001
echo   - Datastore Directory     : %PROJECT_ROOT%\datastore
echo.

set "PROMPT_RESULT=Y"
call "%LIB_DIR%\common.cmd" :prompt_yn "Use standard default port and datastore configuration?" "Y"

if /i "!PROMPT_RESULT!"=="N" (
    set /p "CUSTOM_API_PORT=Enter Backend API Port [Default 4100]: "
    if "!CUSTOM_API_PORT!"=="" set "CUSTOM_API_PORT=4100"
    
    set /p "CUSTOM_DATA_DIR=Enter Datastore Directory [Default %PROJECT_ROOT%\datastore]: "
    if "!CUSTOM_DATA_DIR!"=="" set "CUSTOM_DATA_DIR=%PROJECT_ROOT%\datastore"
) else (
    set "CUSTOM_API_PORT=4100"
    set "CUSTOM_DATA_DIR=%PROJECT_ROOT%\datastore"
)

:: Generate .env if not present
if not exist "%PROJECT_ROOT%\.env" (
    copy "%PROJECT_ROOT%\.env.example" "%PROJECT_ROOT%\.env" >nul 2>&1
    call "%LIB_DIR%\common.cmd" :success_msg "Created production .env from .env.example."
)

:: ============================================================================
:: STEP 3: BACKUP BEFORE PROCEEDING
:: ============================================================================
call "%LIB_DIR%\common.cmd" :print_step "3" "Safety Backup Creation"

set "PROMPT_RESULT=Y"
call "%LIB_DIR%\common.cmd" :prompt_yn "Create automated timestamped backup before continuing?" "Y"
if /i "!PROMPT_RESULT!"=="Y" (
    call "%LIB_DIR%\backup.cmd"
)

:: ============================================================================
:: STEP 4: DATASTORE DIRECTORIES
:: ============================================================================
call "%LIB_DIR%\common.cmd" :print_step "4" "Datastore Directory Initialization"

set "PROMPT_RESULT=Y"
call "%LIB_DIR%\common.cmd" :prompt_yn "Initialize required datastore folders in !CUSTOM_DATA_DIR!?" "Y"

if /i "!PROMPT_RESULT!"=="Y" (
    if not exist "%PROJECT_ROOT%\datastore\customer\uploads" mkdir "%PROJECT_ROOT%\datastore\customer\uploads" >nul 2>&1
    if not exist "%PROJECT_ROOT%\datastore\customer\documents" mkdir "%PROJECT_ROOT%\datastore\customer\documents" >nul 2>&1
    if not exist "%PROJECT_ROOT%\datastore\merchant\jobs" mkdir "%PROJECT_ROOT%\datastore\merchant\jobs" >nul 2>&1
    if not exist "%PROJECT_ROOT%\datastore\backend\database" mkdir "%PROJECT_ROOT%\datastore\backend\database" >nul 2>&1
    if not exist "%PROJECT_ROOT%\datastore\backend\logs" mkdir "%PROJECT_ROOT%\datastore\backend\logs" >nul 2>&1
    if not exist "%PROJECT_ROOT%\datastore\backend\audit" mkdir "%PROJECT_ROOT%\datastore\backend\audit" >nul 2>&1
    if not exist "%PROJECT_ROOT%\datastore\backups" mkdir "%PROJECT_ROOT%\datastore\backups" >nul 2>&1
    call "%LIB_DIR%\common.cmd" :success_msg "Datastore directories initialized."
)

:: ============================================================================
:: STEP 5: DEPENDENCIES INSTALLATION
:: ============================================================================
call "%LIB_DIR%\common.cmd" :print_step "5" "Installing Dependencies"

set "PROMPT_RESULT=Y"
call "%LIB_DIR%\common.cmd" :prompt_yn "Run npm dependency installation across all components?" "Y"

if /i "!PROMPT_RESULT!"=="Y" (
    echo   Installing backend dependencies...
    cd /d "%PROJECT_ROOT%\apps\backend"
    call npm install
    
    echo   Installing customer kiosk dependencies...
    cd /d "%PROJECT_ROOT%\apps\customer-web"
    call npm install
    
    echo   Installing merchant desktop dependencies...
    cd /d "%PROJECT_ROOT%\apps\merchant-desktop"
    call npm install
    
    cd /d "%PROJECT_ROOT%"
    call "%LIB_DIR%\common.cmd" :success_msg "All dependencies installed."
)

:: ============================================================================
:: STEP 6: APPLICATION BUILDS
:: ============================================================================
call "%LIB_DIR%\common.cmd" :print_step "6" "Building Applications"

set "PROMPT_RESULT=Y"
call "%LIB_DIR%\common.cmd" :prompt_yn "Build backend, customer-web, and merchant-desktop for production?" "Y"

if /i "!PROMPT_RESULT!"=="Y" (
    echo   Compiling backend (TypeScript)...
    cd /d "%PROJECT_ROOT%\apps\backend"
    call npm run build
    if %ERRORLEVEL% NEQ 0 (
        call "%LIB_DIR%\common.cmd" :error_msg "Backend build failed."
        goto :installer_failed
    )

    echo   Building customer web interface (Vite)...
    cd /d "%PROJECT_ROOT%\apps\customer-web"
    call npm run build
    if %ERRORLEVEL% NEQ 0 (
        call "%LIB_DIR%\common.cmd" :error_msg "Customer Web build failed."
        goto :installer_failed
    )

    echo   Building merchant desktop interface (Vite)...
    cd /d "%PROJECT_ROOT%\apps\merchant-desktop"
    call npm run build
    if %ERRORLEVEL% NEQ 0 (
        call "%LIB_DIR%\common.cmd" :error_msg "Merchant Desktop build failed."
        goto :installer_failed
    )

    cd /d "%PROJECT_ROOT%"
    call "%LIB_DIR%\common.cmd" :success_msg "All applications built successfully."
)

:: ============================================================================
:: STEP 7: AUTOMATED TESTS VERIFICATION
:: ============================================================================
call "%LIB_DIR%\common.cmd" :print_step "7" "Running Verification Tests"

set "PROMPT_RESULT=Y"
call "%LIB_DIR%\common.cmd" :prompt_yn "Execute automated test suite to verify system integrity?" "Y"

if /i "!PROMPT_RESULT!"=="Y" (
    cd /d "%PROJECT_ROOT%\apps\backend"
    call npm test
    if %ERRORLEVEL% NEQ 0 (
        call "%LIB_DIR%\common.cmd" :error_msg "Automated tests reported failures."
        goto :installer_failed
    )
    cd /d "%PROJECT_ROOT%"
    call "%LIB_DIR%\common.cmd" :success_msg "All 11 automated test suites passed successfully."
)

:: ============================================================================
:: STEP 8: COMPLETION & LAUNCH
:: ============================================================================
call "%LIB_DIR%\common.cmd" :print_step "8" "Installation Complete"

echo ===============================================================================
echo   AUTOPRINT INSTALLATION COMPLETED SUCCESSFULLY!
echo ===============================================================================
echo.
echo   Application Components:
echo     [Backend REST API]       : http://localhost:4100/api
echo     [Customer Kiosk Web]     : http://localhost:3000
echo     [Merchant Desktop Desk]  : http://localhost:3001
echo     [Persistent Datastore]   : %PROJECT_ROOT%\datastore
echo.
echo   To start services manually:
echo     scripts\start-all.cmd
echo.

set "PROMPT_RESULT=N"
call "%LIB_DIR%\common.cmd" :prompt_yn "Would you like to launch AutoPrint services now?" "N"

if /i "!PROMPT_RESULT!"=="Y" (
    call "%PROJECT_ROOT%\scripts\start-all.cmd"
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
echo     Source Apps : %PROJECT_ROOT%\apps\ (backend, customer-web, merchant-desktop)
echo     Datastore   : %PROJECT_ROOT%\datastore\ (database, uploads, logs, audit)
echo     Connectors  : %PROJECT_ROOT%\connectors\ (printer, payment, storage)
echo     Assets      : %PROJECT_ROOT%\assets\ (app-icon.png, logo.png)
echo.
echo   [ACTIONS TO BE PERFORMED IN REAL RUN]
echo     1. Verify Node.js v18+ and npm in system PATH.
echo     2. Initialize persistent datastore directories.
echo     3. Copy configuration from .env.example to .env.
echo     4. Install npm dependencies across all 3 components.
echo     5. Compile backend TypeScript and build Vite frontends.
echo     6. Execute automated backend test suite (11 test cases).
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
call "%LIB_DIR%\common.cmd" :error_msg "Installer encountered an error. Check logs in installer\logs\."
pause
exit /b 1

:exit_installer
echo.
echo Thank you for using the AutoPrint / QRPrint Installer.
echo.
pause
exit /b 0
