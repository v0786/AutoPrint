@echo off
:: ============================================================================
:: AutoPrint Installer — Logging Subsystem
:: Appends timestamped log events to installer/logs/install-YYYY-MM-DD.log
:: ============================================================================

setlocal
set "LOG_MSG=%~1"
set "LOG_LEVEL=%~2"
if "%LOG_LEVEL%"=="" set "LOG_LEVEL=INFO"

set "LOG_DIR=%~dp0..\logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>&1

:: Get date string YYYY-MM-DD
for /f "tokens=2-4 delims=/ " %%a in ('date /t') do (
    set "LOG_DATE=%%c-%%a-%%b"
)
if "%LOG_DATE%"=="" set "LOG_DATE=current"

set "LOG_FILE=%LOG_DIR%\installer-%LOG_DATE%.log"

:: Timestamp
set "TIME_STAMP=%TIME%"

echo [%DATE% %TIME_STAMP%] [%LOG_LEVEL%] %LOG_MSG% >> "%LOG_FILE%" 2>&1

endlocal
exit /b 0
