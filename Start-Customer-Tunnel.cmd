@echo off
setlocal
title AutoPrint — Customer Online Access (PageKite)

:: ============================================================================
:: AutoPrint Customer Online Access — Manual PageKite Tunnel Launcher
:: ============================================================================

set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%~dp0"
if exist "%SCRIPT_DIR%..\..\AutoPrint.exe" (
    set "ROOT_DIR=%SCRIPT_DIR%..\..\"
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%ROOT_DIR%installer\scripts\start-pagekite.ps1" -AppDir "%ROOT_DIR%"

if %ERRORLEVEL% NEQ 0 (
    echo.
    pause
)
