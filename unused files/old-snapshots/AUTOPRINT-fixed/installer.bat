@echo off
:: AutoPrint Production Automated Windows Installer Launcher
:: Requires Administrator Privileges

:: Check Administrator Elevation
NET FILE >nul 2>&1
if '%errorlevel%' == '0' ( goto gotAdmin ) else ( goto getAdmin )

:getAdmin
    echo Requesting Administrator privileges to install AutoPrint...
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    echo UAC.ShellExecute "%~s0", "", "", "runas", 1 >> "%temp%\getadmin.vbs"
    "%temp%\getadmin.vbs"
    exit /B

:gotAdmin
    if exist "%temp%\getadmin.vbs" ( del "%temp%\getadmin.vbs" )
    pushd "%~dp0"

echo ====================================================
echo      AUTOPRINT FRESH PC WINDOWS INSTALLER           
echo ====================================================
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" -TargetDir "C:\AutoPrint"

echo.
echo Setup process finished.
pause
