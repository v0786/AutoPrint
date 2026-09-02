@echo off
title AutoPrint 24x7 Startup Installer
echo ====================================================
echo      AUTOPRINT 24x7 WINDOWS STARTUP SERVICE         
echo ====================================================
echo.

set "SOURCE_VBS=%~dp0start_silent.vbs"
set "STARTUP_FOLDER=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "TARGET_LINK=%STARTUP_FOLDER%\AutoPrint_24x7_Server.lnk"

if not exist "%SOURCE_VBS%" (
    echo ERROR: Cannot find start_silent.vbs in current directory!
    pause
    exit /b 1
)

echo Creating Windows Startup Shortcut...
powershell -Command "$s=(New-Object -COM WScript.Shell).CreateShortcut('%TARGET_LINK%'); $s.TargetPath='%SOURCE_VBS%'; $s.WorkingDirectory='%~dp0'; $s.Save()"

if exist "%TARGET_LINK%" (
    echo.
    echo ====================================================
    echo SUCCESS! AutoPrint is now configured for 24x7 background execution.
    echo.
    echo The server will automatically start silently every time Windows boots.
    echo Location: %TARGET_LINK%
    echo ====================================================
) else (
    echo ERROR: Failed to create startup shortcut.
)

echo.
echo Launching 24x7 background server now...
wscript.exe "%SOURCE_VBS%"
echo Started AutoPrint silent background servers!
ping 127.0.0.1 -n 3 >nul
