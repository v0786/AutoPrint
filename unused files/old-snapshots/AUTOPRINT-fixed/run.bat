@echo off
title AutoPrint Launcher
echo ====================================================
echo             AUTOPRINT INSTANT LAUNCHER              
echo ====================================================
echo Ports configured:
echo   - Backend Server:   http://localhost:9000
echo   - Merchant Desktop: http://localhost:5000
echo   - Customer Web UI:  http://localhost:8085
echo ====================================================
echo.

set "BASE_DIR=%~dp0"

echo Starting Backend Service (Port 9000)...
pushd "%BASE_DIR%\backend"
start "AutoPrint Backend" cmd /k npm run dev
popd

echo Starting Merchant Desktop Manager (Port 5000)...
pushd "%BASE_DIR%\merchant-desktop"
start "AutoPrint Merchant" cmd /k npm run dev
popd

echo Starting Customer Web Interface (Port 8085)...
pushd "%BASE_DIR%\customer-web"
start "AutoPrint Customer" cmd /k npm run dev
popd

echo.
echo Waiting 5 seconds for services to initialize...
ping 127.0.0.1 -n 6 >nul

echo.
echo Opening Chrome / Default Web Browser...
start "" "http://localhost:5000"
start "" "http://localhost:8085"

echo.
echo ====================================================
echo AutoPrint is now running!
echo You can close this window anytime.
echo To run again later, simply double-click run.bat!
echo ====================================================
