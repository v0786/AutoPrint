@echo off
setlocal
cd /d "%~dp0\.."

echo [AutoPrint] Starting AutoPrint system services...

if exist "AutoPrint.exe" (
    start "" "AutoPrint.exe" %*
    echo [AutoPrint] AutoPrint launched in background.
    exit /b 0
)

if exist "AutoPrint-Launcher.bat" (
    start "" "AutoPrint-Launcher.bat" %*
    exit /b 0
)

start /B node app\backend\dist\server.js > runtime\logs\backend.log 2>&1
start /B node app\customer-web\server.js > runtime\logs\customer.log 2>&1
start /B node app\merchant-desktop\server.js > runtime\logs\merchant.log 2>&1
timeout /t 2 /nobreak > nul
start http://localhost:8000
exit /b 0
