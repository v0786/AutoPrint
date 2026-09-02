@echo off
setlocal
cd /d "%~dp0"

if exist "%~dp0AutoPrint.exe" (
    start "" "%~dp0AutoPrint.exe" %*
    exit /b 0
)

start "" "%~dp0AutoPrint-Launcher.bat" %*
exit /b 0
