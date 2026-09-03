@echo off
:: ============================================================================
:: AutoPrint Installer — System Requirement & Health Checks
:: ============================================================================

set "CHECKS_FAILED=0"

echo   [CHECK 1/5] Verifying Windows Environment...
if not "%OS%"=="Windows_NT" (
    call "%~dp0common.cmd" :error_msg "AutoPrint Windows Installer requires Windows NT/10/11/Server."
    set "CHECKS_FAILED=1"
) else (
    call "%~dp0common.cmd" :success_msg "Windows OS verified (%OS%)."
)

echo.
echo   [CHECK 2/5] Checking Global Node.js Runtime...
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo   Node.js not in active PATH. Invoking automated global runtime detection...
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0..\scripts\ensure-node.ps1" -SkipDependencies
    if %ERRORLEVEL% NEQ 0 (
        call "%~dp0common.cmd" :error_msg "Node.js (v18.0.0 or higher) is missing or could not be configured automatically."
        set "CHECKS_FAILED=1"
    ) else (
        call "%~dp0common.cmd" :success_msg "Node.js runtime configured successfully."
    )
) else (
    for /f "tokens=*" %%v in ('node -v 2^>nul') do set "NODE_VER=%%v"
    call "%~dp0common.cmd" :success_msg "Node.js detected: %NODE_VER%"
)

echo.
echo   [CHECK 3/5] Checking npm Package Manager...
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    call "%~dp0common.cmd" :error_msg "npm is not found in system PATH."
    set "CHECKS_FAILED=1"
) else (
    for /f "tokens=*" %%v in ('npm -v 2^>nul') do set "NPM_VER=%%v"
    call "%~dp0common.cmd" :success_msg "npm detected: v%NPM_VER%"
)

echo.
echo   [CHECK 4/5] Checking Required Port Availability (4100, 3000, 3001)...
netstat -ano | findstr ":4100 " >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    call "%~dp0common.cmd" :warn_msg "Port 4100 (Backend API) is currently active or in use."
) else (
    call "%~dp0common.cmd" :success_msg "Port 4100 is available for Backend API."
)

netstat -ano | findstr ":3000 " >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    call "%~dp0common.cmd" :warn_msg "Port 3000 (Customer Web) is currently in use."
) else (
    call "%~dp0common.cmd" :success_msg "Port 3000 is available for Customer Web."
)

netstat -ano | findstr ":3001 " >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    call "%~dp0common.cmd" :warn_msg "Port 3001 (Merchant Desktop) is currently in use."
) else (
    call "%~dp0common.cmd" :success_msg "Port 3001 is available for Merchant Desktop."
)

echo.
echo   [CHECK 5/5] Checking Datastore Directory Permissions...
set "TEST_FILE=%~dp0..\..\datastore\.perm_test"
echo test > "%TEST_FILE%" 2>nul
if exist "%TEST_FILE%" (
    del "%TEST_FILE%" >nul 2>&1
    call "%~dp0common.cmd" :success_msg "Read/Write filesystem permissions verified."
) else (
    call "%~dp0common.cmd" :warn_msg "Could not write test file to datastore. Administrator privileges may be needed."
)

echo.
if "%CHECKS_FAILED%"=="1" (
    exit /b 1
) else (
    exit /b 0
)
