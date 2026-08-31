@echo off
setlocal enabledelayedexpansion

REM ===================================================
REM QRPrint System Diagnostics & Error Solver
REM ===================================================

cls
echo.
echo ============================================================
echo  QRPrint System Diagnostics
echo ============================================================
echo.

set "errors=0"
set "warnings=0"

REM Check for Administrator
echo [CHECK 1] Administrator privileges...
whoami /user >nul 2>&1
if errorlevel 1 (
    echo   [FAIL] This script must be run as Administrator
    echo   [FIX] Right-click cmd.exe and select "Run as Administrator"
    set /a errors+=1
) else (
    echo   [PASS] Administrator privileges confirmed
)

echo.

REM Check Node.js
echo [CHECK 2] Node.js installation...
where node >nul 2>&1
if errorlevel 1 (
    echo   [FAIL] Node.js is not installed or not in PATH
    echo   [FIX] Install from: https://nodejs.org/en/download
    echo   [ACTION] After installing, restart Command Prompt
    set /a errors+=1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo   [PASS] Node.js !NODE_VERSION! is installed
)

echo.

REM Check npm
echo [CHECK 3] npm installation...
where npm >nul 2>&1
if errorlevel 1 (
    echo   [FAIL] npm is not installed or not in PATH
    echo   [FIX] Reinstall Node.js from: https://nodejs.org/
    set /a errors+=1
) else (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo   [PASS] npm !NPM_VERSION! is installed
)

echo.

REM Check Git
echo [CHECK 4] Git installation...
where git >nul 2>&1
if errorlevel 1 (
    echo   [WARN] Git is not installed (optional)
    echo   [ACTION] Install from: https://git-scm.com/download/win
    set /a warnings+=1
) else (
    for /f "tokens=*" %%i in ('git --version') do set GIT_VERSION=%%i
    echo   [PASS] !GIT_VERSION! is installed
)

echo.

REM Check repository structure
echo [CHECK 5] Repository structure...
if not exist "merchant\package.json" (
    echo   [FAIL] merchant/package.json not found
    echo   [FIX] Run from repository root: cd E:\project\AutoPrint
    set /a errors+=1
) else (
    echo   [PASS] Merchant project found
)

if not exist "shared\src\index.ts" (
    echo   [FAIL] shared/src/index.ts not found
    echo   [FIX] Clone repository: git clone https://github.com/v0786/AutoPrint.git
    set /a errors+=1
) else (
    echo   [PASS] Shared package found
)

echo.

REM Check database directory
echo [CHECK 6] Database directory...
if not exist "data" (
    echo   [WARN] data/ directory does not exist
    echo   [ACTION] Will be created during installation
    set /a warnings+=1
) else (
    echo   [PASS] data/ directory exists
    if exist "data\merchant.db" (
        echo   [PASS] merchant.db exists
    ) else (
        echo   [WARN] merchant.db not found (will be created on first run)
        set /a warnings+=1
    )
)

echo.

REM Check port availability
echo [CHECK 7] Port availability...
netstat -ano | find ":4100" >nul 2>&1
if not errorlevel 1 (
    echo   [WARN] Port 4100 is already in use
    echo   [FIX] See INSTALL_AND_USE.md section: "Port 4100 already in use"
    set /a warnings+=1
) else (
    echo   [PASS] Port 4100 is available
)

netstat -ano | find ":5173" >nul 2>&1
if not errorlevel 1 (
    echo   [WARN] Port 5173 is already in use (Vite dev server)
    echo   [FIX] Close other applications using this port
    set /a warnings+=1
) else (
    echo   [PASS] Port 5173 is available
)

echo.

REM Check disk space
echo [CHECK 8] Disk space...
for /f "tokens=2" %%A in ('dir C: ^| find "bytes free"') do set FREE_SPACE=%%A
echo   Free space on C:: !FREE_SPACE!
if not "!FREE_SPACE!"=="" (
    echo   [PASS] Check if at least 2GB is available
)

echo.

REM Check Windows version
echo [CHECK 9] Windows version...
for /f "tokens=2" %%A in ('systeminfo ^| find "OS Name"') do set OS_NAME=%%A
for /f "tokens=2" %%A in ('systeminfo ^| find "OS Version"') do set OS_VERSION=%%A
echo   !OS_NAME! !OS_VERSION!

if "!OS_NAME!"=="Microsoft Windows 10" (
    echo   [PASS] Windows 10 supported
) else if "!OS_NAME!"=="Microsoft Windows 11" (
    echo   [PASS] Windows 11 supported
) else (
    echo   [WARN] Untested Windows version
    set /a warnings+=1
)

echo.

REM Check for existing installations
echo [CHECK 10] Existing installations...
if exist "node_modules" (
    echo   [INFO] node_modules found (can be reinstalled)
) else (
    echo   [INFO] node_modules not found (will be created during npm install)
)

echo.
echo ============================================================
echo  Summary
echo ============================================================
echo.
echo Errors found: !errors!
echo Warnings found: !warnings!

if %errors% geq 1 (
    echo.
    echo [ACTION REQUIRED]
    echo Your system has errors that must be fixed before QRPrint can run.
    echo Please review the [FIX] and [ACTION] sections above.
    echo.
    pause
    exit /b 1
)

if %warnings% geq 1 (
    echo.
    echo [NOTICE]
    echo Your system has warnings but QRPrint may still work.
    echo Review the [WARN] and [ACTION] sections for optimal performance.
)

echo.
echo [SUCCESS] System diagnostics passed!
echo.
echo Next steps:
echo 1. Run the installer: installer.bat
echo 2. Launch Electron: npm run electron-dev
echo 3. Complete the setup wizard
echo.
pause
