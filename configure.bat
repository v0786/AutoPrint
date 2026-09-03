@echo off
setlocal enabledelayedexpansion
title AutoPrint - PC Compatibility and System Requirements Checker
color 0B
cls

echo ===============================================================================
echo                AUTOPRINT PRINT SHOP OPERATING SYSTEM
echo             PC Compatibility and System Requirements Diagnostics
echo ===============================================================================
echo.
echo  This tool verifies if this Windows computer meets all prerequisites to run
echo  AutoPrint [Backend API, Merchant Desktop POS, and Customer Kiosk].
echo.
echo ===============================================================================
echo.

set "TOTAL_PASS=0"
set "TOTAL_WARN=0"
set "TOTAL_FAIL=0"

:: -----------------------------------------------------------------------------
:: CHECK 1: Operating System and Architecture
:: -----------------------------------------------------------------------------
echo  [1/6] Checking Operating System and Architecture...
if "%PROCESSOR_ARCHITECTURE%"=="AMD64" (
    echo        [PASS] 64-bit Windows Architecture [x64] detected.
    set /a TOTAL_PASS+=1
) else if "%PROCESSOR_ARCHITEW6432%"=="AMD64" (
    echo        [PASS] 64-bit Windows Architecture [x64] detected.
    set /a TOTAL_PASS+=1
) else (
    echo        [FAIL] 32-bit Windows detected. AutoPrint requires 64-bit Windows 10 or 11.
    set /a TOTAL_FAIL+=1
)

:: -----------------------------------------------------------------------------
:: CHECK 2: Node.js Runtime and npm
:: -----------------------------------------------------------------------------
echo.
echo  [2/6] Checking Node.js Runtime and Package Manager...
where node >nul 2>&1
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%i in ('node -v') do set "NODE_VER=%%i"
    echo        [PASS] Node.js is installed: !NODE_VER!
    set /a TOTAL_PASS+=1
) else (
    echo        [FAIL] Node.js is NOT installed or not found in system PATH.
    set /a TOTAL_FAIL+=1
    echo.
    echo        Would you like to install Node.js [LTS] automatically via Windows Winget?
    set /p "INSTALL_NODE=       Install Node.js now? [Y/N] [Default: Y]: "
    if "!INSTALL_NODE!"=="" set "INSTALL_NODE=Y"
    if /i "!INSTALL_NODE!"=="Y" (
        echo        Downloading and installing Node.js LTS via winget...
        winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
        if !ERRORLEVEL% equ 0 (
            echo        [SUCCESS] Node.js installed successfully! Please restart this window after setup.
        ) else (
            echo        [ERROR] Automatic install failed. Please manually download Node.js from https://nodejs.org
        )
    )
)

where npm >nul 2>&1
if %ERRORLEVEL% equ 0 (
    for /f "tokens=*" %%i in ('npm -v') do set "NPM_VER=%%i"
    echo        [PASS] npm package manager is installed: v!NPM_VER!
    set /a TOTAL_PASS+=1
) else (
    echo        [WARN] npm not detected in PATH.
    set /a TOTAL_WARN+=1
)

:: -----------------------------------------------------------------------------
:: CHECK 3: Windows Print Spooler Service
:: -----------------------------------------------------------------------------
echo.
echo  [3/6] Checking Windows Print Spooler Service...
sc query Spooler | findstr /i "STATE" | findstr /i "RUNNING" >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo        [PASS] Windows Print Spooler Service is RUNNING.
    set /a TOTAL_PASS+=1
) else (
    echo        [WARN] Windows Print Spooler is stopped or disabled.
    set /a TOTAL_WARN+=1
    echo        Attempting to start Windows Print Spooler...
    net start Spooler >nul 2>&1
    if !ERRORLEVEL! equ 0 (
        echo        [PASS] Windows Print Spooler started successfully.
    ) else (
        echo        [WARN] Could not start Print Spooler [May require Administrator rights].
    )
)

:: -----------------------------------------------------------------------------
:: CHECK 4: Installed Windows Hardware and Virtual Printers
:: -----------------------------------------------------------------------------
echo.
echo  [4/6] Inspecting Connected Printers...
powershell -NoProfile -Command "Get-Printer | Select-Object -ExpandProperty Name" > "%TEMP%\autoprint_printers.tmp" 2>nul
if %ERRORLEVEL% equ 0 (
    set /a P_COUNT=0
    for /f "usebackq delims=" %%p in ("%TEMP%\autoprint_printers.tmp") do (
        set /a P_COUNT+=1
        echo        - Found Printer: %%p
    )
    if !P_COUNT! gtr 0 (
        echo        [PASS] !P_COUNT! printer[s] detected on this Windows PC.
        set /a TOTAL_PASS+=1
    ) else (
        echo        [WARN] No physical or virtual printers detected. AutoPrint Virtual Spooler will be used.
        set /a TOTAL_WARN+=1
    )
    if exist "%TEMP%\autoprint_printers.tmp" del "%TEMP%\autoprint_printers.tmp"
) else (
    echo        [WARN] Could not enumerate printers via PowerShell.
    set /a TOTAL_WARN+=1
)

:: -----------------------------------------------------------------------------
:: CHECK 5: Network Port Availability [5000, 7000, 8000]
:: -----------------------------------------------------------------------------
echo.
echo  [5/6] Checking Network Port Availability...

set "PORT_5000_BUSY=0"
set "PORT_7000_BUSY=0"
set "PORT_8000_BUSY=0"

netstat -ano | findstr ":5000 " | findstr /i "LISTENING" >nul 2>&1
if %ERRORLEVEL% equ 0 set "PORT_5000_BUSY=1"

netstat -ano | findstr ":7000 " | findstr /i "LISTENING" >nul 2>&1
if %ERRORLEVEL% equ 0 set "PORT_7000_BUSY=1"

netstat -ano | findstr ":8000 " | findstr /i "LISTENING" >nul 2>&1
if %ERRORLEVEL% equ 0 set "PORT_8000_BUSY=1"

if %PORT_5000_BUSY% equ 0 (
    echo        [PASS] Port 5000 [Backend API Service] is FREE.
) else (
    echo        [INFO] Port 5000 is currently occupied [AutoPrint Backend may already be running].
)

if %PORT_7000_BUSY% equ 0 (
    echo        [PASS] Port 7000 [Customer Web Kiosk] is FREE.
) else (
    echo        [INFO] Port 7000 is currently occupied [AutoPrint Kiosk may already be running].
)

if %PORT_8000_BUSY% equ 0 (
    echo        [PASS] Port 8000 [Merchant Desktop POS] is FREE.
) else (
    echo        [INFO] Port 8000 is currently occupied [AutoPrint POS may already be running].
)
set /a TOTAL_PASS+=1

:: -----------------------------------------------------------------------------
:: CHECK 6: Persistent Datastore and Disk Write Access
:: -----------------------------------------------------------------------------
echo.
echo  [6/6] Checking Datastore and Storage Permissions...
set "DATASTORE_DIR=%~dp0datastore"
if not exist "%DATASTORE_DIR%" mkdir "%DATASTORE_DIR%" >nul 2>&1

echo test_write > "%DATASTORE_DIR%\.test_perm" 2>nul
if exist "%DATASTORE_DIR%\.test_perm" (
    del "%DATASTORE_DIR%\.test_perm" >nul 2>&1
    echo        [PASS] Storage directory is writable: %DATASTORE_DIR%
    set /a TOTAL_PASS+=1
) else (
    echo        [FAIL] Cannot write to storage directory. Please ensure read/write permissions.
    set /a TOTAL_FAIL+=1
)

:: -----------------------------------------------------------------------------
:: DIAGNOSTIC SUMMARY
:: -----------------------------------------------------------------------------
echo.
echo ===============================================================================
echo                           DIAGNOSTIC SUMMARY
echo ===============================================================================
echo.
echo    PASSED CHECKS  : %TOTAL_PASS%
echo    WARNINGS       : %TOTAL_WARN%
echo    CRITICAL FAILS : %TOTAL_FAIL%
echo.

if %TOTAL_FAIL% equ 0 (
    color 0A
    echo  [EXCELLENT] Your PC satisfies all compatibility requirements for AutoPrint!
    echo.
    echo  You can now start AutoPrint immediately by running:
    echo     start.bat
    echo.
) else (
    color 0C
    echo  [ACTION REQUIRED] Please resolve the critical failures listed above before starting.
    echo.
)
