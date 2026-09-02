@echo off
:: ============================================================================
:: AutoPrint Installer — Backup Subsystem
:: Creates timestamped backup of datastore and configuration before operations
:: ============================================================================

setlocal
set "BACKUP_ROOT=%~dp0..\..\datastore\backups"
if not exist "%BACKUP_ROOT%" mkdir "%BACKUP_ROOT%" >nul 2>&1

:: Generate timestamp
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do set "DATE_STR=%%c%%a%%b"
set "TIME_CLEAN=%TIME::=%"
set "TIME_CLEAN=%TIME_CLEAN: =0%"
set "TIMESTAMP=%DATE_STR%-%TIME_CLEAN:~0,6%"

set "TARGET_BACKUP_DIR=%BACKUP_ROOT%\backup-%TIMESTAMP%"
mkdir "%TARGET_BACKUP_DIR%" >nul 2>&1

echo   Creating timestamped backup at: %TARGET_BACKUP_DIR%...
call "%~dp0logging.cmd" "START BACKUP to %TARGET_BACKUP_DIR%" "INFO"

:: 1. Backup SQLite Database & Audit logs if present
if exist "%~dp0..\..\datastore\backend" (
    xcopy "%~dp0..\..\datastore\backend" "%TARGET_BACKUP_DIR%\backend\" /E /I /Q /Y >nul 2>&1
)

:: 2. Backup configuration files
if exist "%~dp0..\..\.env" (
    copy "%~dp0..\..\.env" "%TARGET_BACKUP_DIR%\.env" >nul 2>&1
)
if exist "%~dp0..\..\apps\backend\.env" (
    copy "%~dp0..\..\apps\backend\.env" "%TARGET_BACKUP_DIR%\backend.env" >nul 2>&1
)

echo   [SUCCESS] Backup completed successfully. Target: %TARGET_BACKUP_DIR%
call "%~dp0logging.cmd" "BACKUP COMPLETED: %TARGET_BACKUP_DIR%" "INFO"

endlocal
exit /b 0
