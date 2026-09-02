@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================================
echo  QRPrint Installer
echo ============================================================
echo.

REM Relaunch with Administrator privileges when needed.
REM "net session" succeeds only from an elevated Command Prompt.
net session >nul 2>&1
if errorlevel 1 (
  echo [QRPrint] Administrator permission is required. Requesting approval...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath $env:ComSpec -ArgumentList '/c ""%~f0"" --elevated' -Verb RunAs"
  if errorlevel 1 (
    echo [QRPrint] Administrator permission was not granted. Installation cancelled.
    goto :installer_failed
  )
  exit /b 0
)

cd /d "%~dp0"

REM Run the installer diagnostics directly so their result is visible here.
echo [QRPrint] Running system diagnostics...
call :run_diagnostics
if errorlevel 1 (
  echo [QRPrint] System diagnostics failed. Please fix errors and try again.
  goto :installer_failed
)

REM Install Python packages only when requirements.txt contains actual packages.
if defined REQUIREMENTS_HAS_PACKAGES (
  echo [QRPrint] Installing Python requirements...
  call :install_python_requirements
  if errorlevel 1 (
    echo [QRPrint] Python requirements installation failed.
    goto :installer_failed
  )
)

if not exist "%~dp0merchant\package.json" (
  echo [QRPrint] Merchant project is missing.
  goto :installer_failed
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
    goto :installer_failed
  )
)

REM Install merchant dependencies
echo [QRPrint] Installing merchant dependencies...
cd "%~dp0merchant"
call npm install
if errorlevel 1 (
  echo [QRPrint] Merchant installation failed.
  cd "%~dp0"
  goto :installer_failed
)

REM Build merchant for Electron
echo [QRPrint] Building merchant application...
call npm run build:electron
if errorlevel 1 (
  echo [QRPrint] Build failed. Check TypeScript errors.
  cd "%~dp0"
  goto :installer_failed
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
echo Configure tunnel URL in merchant/.env. The customer web app is maintained on the customer Git branch.
echo.
echo For help, see: INSTALL_AND_USE.md
echo.
cd "%~dp0"
echo Press any key to close this window.
pause >nul
exit /b 0

:installer_failed
set "INSTALL_EXIT_CODE=1"
echo.
echo ============================================================
echo  Installation Failed
echo ============================================================
echo [QRPrint] Exit code: %INSTALL_EXIT_CODE%
echo Press any key to close this window.
pause >nul
exit /b %INSTALL_EXIT_CODE%

:run_diagnostics
set "DIAGNOSTIC_ERRORS=0"
set "DIAGNOSTIC_WARNINGS=0"
set "REQUIREMENTS_HAS_PACKAGES="

echo.
echo ============================================================
echo  QRPrint System Diagnostics
echo ============================================================

echo [CHECK 1] Administrator privileges...
net session >nul 2>&1
if errorlevel 1 (
  echo   [FAIL] Administrator privileges are required.
  set /a DIAGNOSTIC_ERRORS+=1
) else (
  echo   [PASS] Administrator privileges confirmed.
)

echo [CHECK 2] Node.js installation...
node --version >nul 2>&1
if errorlevel 1 (
  echo   [FAIL] Node.js 20+ is required. Install it from https://nodejs.org/en/download
  set /a DIAGNOSTIC_ERRORS+=1
) else (
  for /f "tokens=*" %%V in ('node --version') do echo   [PASS] Node.js %%V
)

echo [CHECK 3] npm installation...
npm --version >nul 2>&1
if errorlevel 1 (
  echo   [FAIL] npm is required with Node.js.
  set /a DIAGNOSTIC_ERRORS+=1
) else (
  for /f "tokens=*" %%V in ('npm --version') do echo   [PASS] npm %%V
)

echo [CHECK 4] Repository structure...
if not exist "%~dp0merchant\package.json" (
  echo   [FAIL] merchant\package.json was not found.
  set /a DIAGNOSTIC_ERRORS+=1
) else (
  echo   [PASS] Merchant project found.
)
if not exist "%~dp0shared\src\index.ts" (
  echo   [FAIL] shared\src\index.ts was not found.
  set /a DIAGNOSTIC_ERRORS+=1
) else (
  echo   [PASS] Shared package found.
)

echo [CHECK 5] Python requirements...
if not exist "%~dp0requirements.txt" (
  echo   [FAIL] requirements.txt was not found.
  set /a DIAGNOSTIC_ERRORS+=1
) else (
  for /f "usebackq delims=" %%L in (`findstr /R /V "^[ ]*$" "%~dp0requirements.txt" ^| findstr /R /V "^[ ]*#"`) do set "REQUIREMENTS_HAS_PACKAGES=1"
  if defined REQUIREMENTS_HAS_PACKAGES (
    echo   [PASS] Python package requirements found.
  ) else (
    echo   [INFO] requirements.txt has no Python packages; Python setup is skipped.
  )
)

echo [CHECK 6] Port availability...
netstat -ano | find ":4100" >nul 2>&1
if errorlevel 1 (echo   [PASS] Port 4100 is available.) else (echo   [WARN] Port 4100 is already in use. & set /a DIAGNOSTIC_WARNINGS+=1)
netstat -ano | find ":5173" >nul 2>&1
if errorlevel 1 (echo   [PASS] Port 5173 is available.) else (echo   [WARN] Port 5173 is already in use. & set /a DIAGNOSTIC_WARNINGS+=1)

echo [CHECK 7] Optional Git installation...
git --version >nul 2>&1
if errorlevel 1 (echo   [WARN] Git is not installed.) else (echo   [PASS] Git is available.)

echo [CHECK 8] Windows version...
for /f "tokens=*" %%V in ('ver') do echo   [INFO] %%V

echo.
echo Diagnostics: !DIAGNOSTIC_ERRORS! error(s), !DIAGNOSTIC_WARNINGS! warning(s).
if not "!DIAGNOSTIC_ERRORS!"=="0" exit /b 1
exit /b 0

:install_python_requirements
python --version >nul 2>&1
if not errorlevel 1 (
  python -m pip install -r "%~dp0requirements.txt"
  exit /b !ERRORLEVEL!
)
py -3 --version >nul 2>&1
if not errorlevel 1 (
  py -3 -m pip install -r "%~dp0requirements.txt"
  exit /b !ERRORLEVEL!
)
echo [QRPrint] Python 3 is required for the packages in requirements.txt.
echo Install it from https://www.python.org/downloads/ and select "Add Python to PATH".
exit /b 1
