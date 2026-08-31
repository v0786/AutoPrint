@echo off
setlocal enabledelayedexpansion

whoami /user >nul 2>&1
if errorlevel 1 (
  echo [QRPrint] This installer requires Administrator privileges.
  echo Please run this file as Administrator and try again.
  exit /b 1
)

cd /d "%~dp0"

echo [QRPrint] Checking prerequisites...
where node >nul 2>nul
if errorlevel 1 (
  echo [QRPrint] Node.js is required. Install Node.js 20+ and rerun this installer.
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [QRPrint] npm was not found. Install Node.js 20+ and rerun this installer.
  exit /b 1
)

if not exist "%~dp0package.json" (
  echo [QRPrint] Merchant package.json not found.
  exit /b 1
)

if not exist "%~dp0node_modules" (
  echo [QRPrint] Installing merchant dependencies...
  call npm install
)

if not exist "%~dp0data\merchant.db" (
  echo [QRPrint] Initializing local merchant database...
  if not exist "%~dp0data" mkdir "%~dp0data"
  type nul > "%~dp0data\merchant.db"
)

echo [QRPrint] Starting merchant app...
start "QRPrint Merchant" cmd /k "npm run dev"

for /f "tokens=*" %%i in ('hostname') do set HOSTNAME=%%i

echo.
echo [QRPrint] Setup complete.

echo Merchant dashboard URL: http://localhost:3000

echo Local database: %~dp0data\merchant.db

echo Store tunnel URL: set CLAUDEFLAIR_URL in your merchant environment file.
echo.
exit /b 0
