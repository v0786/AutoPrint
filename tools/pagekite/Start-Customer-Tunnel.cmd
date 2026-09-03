@echo off
setlocal enabledelayedexpansion
title AutoPrint — Customer Online Access (PageKite Tunnel)

:: ============================================================================
:: AutoPrint Customer Online Access — Manual PageKite Tunnel Launcher
:: ============================================================================

set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%~dp0"
if exist "%SCRIPT_DIR%..\..\AutoPrint.exe" (
    set "ROOT_DIR=%SCRIPT_DIR%..\..\"
)

set "PAGEKITE_PY=%ROOT_DIR%tools\pagekite\pagekite.py"
if not exist "%PAGEKITE_PY%" (
    set "PAGEKITE_PY=%ROOT_DIR%scripts\pagekite.py"
)

set "CONFIG_DIR=%ProgramData%\AutoPrint\pagekite"
set "CONFIG_FILE=%CONFIG_DIR%\pagekite.cfg"
set "SETTINGS_FILE=%CONFIG_DIR%\pagekite-settings.json"

if not exist "%CONFIG_FILE%" (
    if exist "%ROOT_DIR%datastore\config\pagekite.cfg" (
        set "CONFIG_FILE=%ROOT_DIR%datastore\config\pagekite.cfg"
    )
)

:: 1. Read Customer Port (default: 7000)
set "CUSTOMER_PORT=7000"
if exist "%ROOT_DIR%.env" (
    for /f "tokens=1,2 delims==" %%A in ('type "%ROOT_DIR%.env" 2^>nul') do (
        if /i "%%A"=="CUSTOMER_PORT" set "CUSTOMER_PORT=%%B"
    )
)

:: 2. Check if Python 3 is available
set "PY_CMD="
py -3 --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "PY_CMD=py -3"
) else (
    python --version >nul 2>&1
    if %ERRORLEVEL% EQU 0 (
        set "PY_CMD=python"
    )
)

if "%PY_CMD%"=="" (
    echo.
    echo ============================================================
    echo  [ERROR] Python 3 Runtime Not Found!
    echo ============================================================
    echo  PageKite requires Python 3.x to establish the customer tunnel.
    echo  Please install Python 3 from https://python.org/
    echo  or run installer\scripts\configure-pagekite.ps1.
    echo ============================================================
    echo.
    pause
    exit /b 2
)

:: 3. Check if PageKite is configured
if not exist "%CONFIG_FILE%" (
    echo.
    echo ============================================================
    echo  [NOTICE] PageKite is Not Configured Yet!
    echo ============================================================
    echo  No PageKite configuration was found for AutoPrint.
    echo.
    set /p "DO_SETUP=Would you like to configure PageKite now? (Y/N): "
    if /i "!DO_SETUP!"=="Y" (
        set /p "USER_KITE=Enter your Kite Name (e.g. myprintshop.pagekite.me): "
        set /p "USER_SECRET=Enter your PageKite Secret Key: "
        if not "!USER_KITE!"=="" if not "!USER_SECRET!"=="" (
            powershell -NoProfile -ExecutionPolicy Bypass -File "%ROOT_DIR%installer\scripts\configure-pagekite.ps1" -AppDir "%ROOT_DIR%" -KiteName "!USER_KITE!" -SecretKey "!USER_SECRET!" -CustomerPort %CUSTOMER_PORT%
            set "CONFIG_FILE=%CONFIG_DIR%\pagekite.cfg"
        )
    )
    if not exist "%CONFIG_FILE%" (
        echo.
        echo PageKite setup skipped. Exiting.
        pause
        exit /b 1
    )
)

:: 4. Extract Kite Name for display
set "KITE_DISPLAY=autoprint.pagekite.me"
if exist "%CONFIG_FILE%" (
    for /f "tokens=2 delims=:" %%K in ('findstr /i "service_on" "%CONFIG_FILE%" 2^>nul') do (
        set "KITE_DISPLAY=%%K"
    )
)

:: 5. Verify that Local Customer Web Server is Running
echo.
echo [*] Checking AutoPrint customer web server on local port %CUSTOMER_PORT%...
powershell -NoProfile -Command "$tcp = New-Object System.Net.Sockets.TcpClient; try { $iar = $tcp.BeginConnect('127.0.0.1', %CUSTOMER_PORT%, $null, $null); if ($iar.AsyncWaitHandle.WaitOne(1200, $false) -and $tcp.Connected) { exit 0 } else { exit 1 } } catch { exit 1 } finally { $tcp.Close() }" >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ============================================================
    echo  [WARNING] AutoPrint Customer Web Server is Offline!
    echo ============================================================
    echo  The local customer kiosk web portal is not responding on
    echo  http://127.0.0.1:%CUSTOMER_PORT%.
    echo.
    echo  Please start AutoPrint first (via AutoPrint.exe or tray icon),
    echo  then launch this tunnel script again.
    echo ============================================================
    echo.
    set /p "IGNORE_WARN=Do you want to start PageKite anyway? (Y/N): "
    if /i not "!IGNORE_WARN!"=="Y" (
        exit /b 5
    )
)

:: 6. Display Interactive Banner
cls
echo ======================================================================
echo    AUTOPRINT CUSTOMER ONLINE ACCESS (PAGEKITE TUNNEL)                
echo ======================================================================
echo.
echo    [Local Customer Server] : http://127.0.0.1:%CUSTOMER_PORT%
echo    [Public Customer URL]   : https://%KITE_DISPLAY%
echo.
echo    ------------------------------------------------------------------
echo    STATUS: Tunnel is running interactively.
echo    Customers can now upload documents via https://%KITE_DISPLAY%
echo.
echo    TO STOP PUBLIC ACCESS:
echo    Press CTRL+C in this window or close this terminal.
echo    ------------------------------------------------------------------
echo.
echo [PageKite Live Log]:
echo ----------------------------------------------------------------------

:: 7. Launch PageKite Interactively
%PY_CMD% "%PAGEKITE_PY%" --clean --optfile="%CONFIG_FILE%"

echo.
echo ======================================================================
echo  AutoPrint Customer Online Access tunnel has stopped.
echo  Your customer portal is now private (offline from the internet).
echo ======================================================================
echo.
pause
