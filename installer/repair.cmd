@echo off
setlocal
title AutoPrint — System Repair ^& Rebuild Utility

call "%~dp0lib\common.cmd" :banner
echo ===============================================================================
echo   AUTOPRINT INSTALLATION REPAIR UTILITY
echo ===============================================================================
echo.

echo [1/3] Verifying system requirements...
call "%~dp0lib\checks.cmd"
if %ERRORLEVEL% NEQ 0 (
    call "%~dp0lib\common.cmd" :warn_msg "System checks flagged potential issues."
)

echo.
echo [2/3] Rebuilding applications...
cd /d "%~dp0..\apps\backend"
call npm run build

cd /d "%~dp0..\apps\customer-web"
call npm run build

cd /d "%~dp0..\apps\merchant-desktop"
call npm run build

cd /d "%~dp0.."

echo.
echo [3/3] Running validation tests...
cd /d "%~dp0..\apps\backend"
call npm test

cd /d "%~dp0.."
call "%~dp0lib\common.cmd" :success_msg "Repair routine completed."
echo.
pause
