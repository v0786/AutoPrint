@echo off
title AutoPrint 24x7 Background Launcher
set "BASE_DIR=%~dp0AUTOPRINT fixed"

if not exist "%BASE_DIR%" (
    set "BASE_DIR=%~dp0"
)

echo Starting AutoPrint 24x7 Background Services...

pushd "%BASE_DIR%\backend"
start "AutoPrint Backend (Port 9000)" /MIN cmd /k npm run dev
popd

pushd "%BASE_DIR%\merchant-desktop"
start "AutoPrint Merchant (Port 5000)" /MIN cmd /k npm run dev
popd

pushd "%BASE_DIR%\customer-web"
start "AutoPrint Customer (Port 8085)" /MIN cmd /k npm run dev
popd
