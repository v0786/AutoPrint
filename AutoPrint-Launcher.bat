@echo off
setlocal
cd /d "%~dp0"

:: If native AutoPrint.exe is compiled, launch it directly in the background
if exist "%~dp0AutoPrint.exe" (
    start "" "%~dp0AutoPrint.exe" %*
    exit /b 0
)

:: Otherwise fallback to compiling on the fly
if exist "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe" (
    C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /target:winexe /out:AutoPrint.exe /win32icon:assets\icon\autoprint.ico /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.dll src-launcher\AutoPrintManager.cs > nul 2>&1
    if exist "%~dp0AutoPrint.exe" (
        start "" "%~dp0AutoPrint.exe" %*
        exit /b 0
    )
)

:: Fallback headless background starter
start /B node app\backend\dist\server.js > runtime\logs\backend.log 2>&1
start /B node app\customer-web\server.js > runtime\logs\customer.log 2>&1
start /B node app\merchant-desktop\server.js > runtime\logs\merchant.log 2>&1
timeout /t 2 /nobreak > nul
start http://localhost:8000
exit /b 0
