@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================================
echo  QRPrint Installer
echo ============================================================
echo.

REM Check for administrator privileges
whoami /user >nul 2>&1
if errorlevel 1 (
  echo [QRPrint] This installer requires Administrator privileges.
  echo Please run this file as Administrator and try again.
  exit /b 1
)

cd /d "%~dp0"

REM Run diagnostics first
echo [QRPrint] Running system diagnostics...
call diagnose.bat >nul 2>&1
if errorlevel 1 (
  echo [QRPrint] System diagnostics failed. Please fix errors and try again.
  echo To attempt automatic repairs, run: powershell -ExecutionPolicy Bypass -File diagnose.ps1 -Repair
  exit /b 1
)

echo [QRPrint] Validating Node.js prerequisites...
where node >nul 2>nul
if errorlevel 1 (
  echo [QRPrint] Node.js 20+ is required. Install it and try again.
  echo Download: https://nodejs.org/en/download
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [QRPrint] npm is required. Install Node.js 20+ and try again.
  exit /b 1
)

if not exist "%~dp0merchant\package.json" (
  echo [QRPrint] Merchant project is missing.
  exit /b 1
)

REM Create data directory and database file
echo [QRPrint] Preparing local database...
if not exist "%~dp0data" mkdir "%~dp0data"
if not exist "%~dp0data\merchant.db" type nul > "%~dp0data\merchant.db"

REM Kill any processes on critical ports
echo [QRPrint] Checking for port conflicts...
netstat -ano | find ":4100" >nul 2>&1
if not errorlevel 1 (
  echo [QRPrint] Port 4100 is in use. Attempting to free it...
  for /f "tokens=5" %%A in ('netstat -ano ^| find ":4100"') do taskkill /PID %%A /F >nul 2>&1
)

REM Install root dependencies
echo [QRPrint] Installing root dependencies...
call npm install
if errorlevel 1 (
  echo [QRPrint] npm install failed. Attempting to repair...
  call npm cache clean --force
  call npm install
  if errorlevel 1 (
    echo [QRPrint] Could not install dependencies. Check internet connection.
    exit /b 1
  )
)

REM Install merchant dependencies
echo [QRPrint] Installing merchant dependencies...
cd "%~dp0merchant"
call npm install
if errorlevel 1 (
  echo [QRPrint] Merchant installation failed.
  cd "%~dp0"
  exit /b 1
)

REM Build merchant for Electron
echo [QRPrint] Building merchant application...
call npm run build:electron
if errorlevel 1 (
  echo [QRPrint] Build failed. Check TypeScript errors.
  cd "%~dp0"
  exit /b 1
)

REM Install customer dependencies
echo [QRPrint] Installing customer dependencies...
cd "%~dp0customer"
call npm install
if errorlevel 1 (
  echo [QRPrint] Customer installation failed.
  cd "%~dp0"
  exit /b 1
)

echo.
echo ============================================================
echo  Installation Complete!
echo ============================================================
echo.
echo [QRPrint] Merchant local setup is ready.
echo.
echo To start the application:
echo   cd merchant
echo   npm run electron-dev
echo.
echo For development (separate frontend/backend):
echo   Terminal 1: npm run server
echo   Terminal 2: npm run dev
echo.
echo To build installer for distribution:
echo   npm run package:win
echo.
echo Configure tunnel URL in merchant/.env and customer/.env.local
echo.
echo For help, see: INSTALL_AND_USE.md
echo.
cd "%~dp0"
exit /b 0
