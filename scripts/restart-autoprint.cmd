@echo off
setlocal

title AutoPrint Service Manager - Restart
cls

echo ===============================================================================
echo    AUTOPRINT / QRPRINT -- SERVICE RESTART UTILITY
echo ===============================================================================
echo.

set "SCRIPT_DIR=%~dp0"
call "%SCRIPT_DIR%stop-autoprint.cmd"
echo Waiting 2 seconds before restart...
timeout /t 2 /nobreak > nul
call "%SCRIPT_DIR%start-autoprint.cmd"
