@echo off
:: ============================================================================
:: AutoPrint Installer — System Requirement & Health Checks
:: ============================================================================

set "CHECKS_FAILED=0"

echo   [CHECK 1/6] Verifying Windows Environment...
if not "%OS%"=="Windows_NT" (
    call "%~dp0common.cmd" :error_msg "AutoPrint Windows Installer requires Windows NT/10/11/Server."
    set "CHECKS_FAILED=1"
) else (
    call "%~dp0common.cmd" :success_msg "Windows OS verified (%OS%)."
)

echo.
echo   [CHECK 2/6] Checking Microsoft .NET Framework Runtime (CLR v4.0.30319)...
reg query "HKLM\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full" /v Install >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    for /f "tokens=3" %%a in ('reg query "HKLM\SOFTWARE\Microsoft\NET Framework Setup\NDP\v4\Full" /v Version 2^>nul') do set "DOTNET_VER=%%a"
    call "%~dp0common.cmd" :success_msg "Microsoft .NET Framework verified: v!DOTNET_VER!"
) else if exist "%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\clr.dll" (
    call "%~dp0common.cmd" :success_msg "Microsoft .NET CLR v4.0.30319 runtime engine verified."
) else (
    call "%~dp0common.cmd" :error_msg "Microsoft .NET Framework v4.0.30319 is missing. AutoPrint.exe requires .NET Framework 4.0 or higher."
    set "CHECKS_FAILED=1"
)

echo.
echo   [CHECK 3/6] Checking Global Node.js Runtime...
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
echo   [CHECK 4/6] Checking npm Package Manager...
where npm >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    call "%~dp0common.cmd" :error_msg "npm is not found in system PATH."
    set "CHECKS_FAILED=1"
) else (
    for /f "tokens=*" %%v in ('npm -v 2^>nul') do set "NPM_VER=%%v"
    call "%~dp0common.cmd" :success_msg "npm detected: v%NPM_VER%"
)

echo.
echo   [CHECK 5/6] Checking Required Port Availability (5000, 7000, 8000)...
netstat -ano | findstr ":5000 " >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    call "%~dp0common.cmd" :warn_msg "Port 5000 (Backend API) is currently active or in use."
) else (
    call "%~dp0common.cmd" :success_msg "Port 5000 is available for Backend API."
)

netstat -ano | findstr ":7000 " >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    call "%~dp0common.cmd" :warn_msg "Port 7000 (Customer Web) is currently in use."
) else (
    call "%~dp0common.cmd" :success_msg "Port 7000 is available for Customer Web."
)

netstat -ano | findstr ":8000 " >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    call "%~dp0common.cmd" :warn_msg "Port 8000 (Merchant Desktop) is currently in use."
) else (
    call "%~dp0common.cmd" :success_msg "Port 8000 is available for Merchant Desktop."
)

echo.
echo   [CHECK 6/6] Checking Datastore Directory Permissions...
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
