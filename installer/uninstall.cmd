@echo off
setlocal EnableDelayedExpansion
title AutoPrint — Safe Application Uninstaller

call "%~dp0lib\common.cmd" :banner
echo ===============================================================================
echo   AUTOPRINT SAFE UNINSTALLER
echo ===============================================================================
echo.
echo WARNING: This process will uninstall compiled builds and stop AutoPrint services.
echo.

set "PROMPT_RESULT=N"
call "%~dp0lib\common.cmd" :prompt_yn "Do you wish to proceed with uninstalling AutoPrint?" "N"

if /i "!PROMPT_RESULT!"=="N" (
    echo Uninstall cancelled.
    pause
    exit /b 0
)

echo.
echo [1/3] Creating safety backup of current datastore...
call "%~dp0lib\backup.cmd"

echo.
echo [2/3] Cleaning build directories (dist/)...
if exist "%~dp0..\apps\backend\dist" rmdir /S /Q "%~dp0..\apps\backend\dist" >nul 2>&1
if exist "%~dp0..\apps\customer-web\dist" rmdir /S /Q "%~dp0..\apps\customer-web\dist" >nul 2>&1
if exist "%~dp0..\apps\merchant-desktop\dist" rmdir /S /Q "%~dp0..\apps\merchant-desktop\dist" >nul 2>&1

echo.
echo [3/3] Datastore Retention
echo.
echo Your persistent application data (database, uploads, audit logs) resides in:
echo   %~dp0..\datastore\
echo.
set "PROMPT_RESULT=Y"
call "%~dp0lib\common.cmd" :prompt_yn "Preserve persistent datastore files? (RECOMMENDED)" "Y"

if /i "!PROMPT_RESULT!"=="N" (
    set "CONFIRM_DELETE=N"
    call "%~dp0lib\common.cmd" :prompt_yn "CONFIRM PERMANENT DELETION OF DATASTORE?" "N"
    if /i "!CONFIRM_DELETE!"=="Y" (
        rmdir /S /Q "%~dp0..\datastore\customer" >nul 2>&1
        rmdir /S /Q "%~dp0..\datastore\merchant" >nul 2>&1
        rmdir /S /Q "%~dp0..\datastore\backend" >nul 2>&1
        call "%~dp0lib\common.cmd" :warn_msg "Datastore contents removed."
    )
) else (
    call "%~dp0lib\common.cmd" :success_msg "Datastore preserved."
)

echo.
call "%~dp0lib\common.cmd" :success_msg "AutoPrint uninstallation complete."
echo.
pause
