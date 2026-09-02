@echo off
setlocal EnableDelayedExpansion
title AutoPrint — Datastore Backup Restoration Utility

call "%~dp0lib\common.cmd" :banner
echo ===============================================================================
echo   AUTOPRINT DATASTORE RESTORE UTILITY
echo ===============================================================================
echo.

set "BACKUP_ROOT=%~dp0..\datastore\backups"
if not exist "%BACKUP_ROOT%" (
    call "%~dp0lib\common.cmd" :error_msg "No backups directory found at %BACKUP_ROOT%."
    pause
    exit /b 1
)

echo Available backups:
echo.
dir /b /ad "%BACKUP_ROOT%"
echo.

set /p "SELECTED_BACKUP=Enter the name of the backup folder to restore: "
if "!SELECTED_BACKUP!"=="" (
    call "%~dp0lib\common.cmd" :error_msg "No backup selected."
    pause
    exit /b 1
)

set "SOURCE_DIR=%BACKUP_ROOT%\!SELECTED_BACKUP!"
if not exist "!SOURCE_DIR!" (
    call "%~dp0lib\common.cmd" :error_msg "Backup '!SELECTED_BACKUP!' not found."
    pause
    exit /b 1
)

set "PROMPT_RESULT=N"
call "%~dp0lib\common.cmd" :prompt_yn "WARNING: This will restore database and configs from !SELECTED_BACKUP!. Continue?" "N"

if /i "!PROMPT_RESULT!"=="Y" (
    if exist "!SOURCE_DIR!\backend" (
        xcopy "!SOURCE_DIR!\backend" "%~dp0..\datastore\backend\" /E /I /Q /Y >nul 2>&1
    )
    if exist "!SOURCE_DIR!\.env" (
        copy "!SOURCE_DIR!\.env" "%~dp0..\.env" >nul 2>&1
    )
    call "%~dp0lib\common.cmd" :success_msg "Backup restored successfully."
)

echo.
pause
