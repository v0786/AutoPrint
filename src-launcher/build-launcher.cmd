@echo off
setlocal
cd /d "%~dp0\.."

echo [AutoPrint] Compiling native Windows System Tray Launcher (AutoPrint.exe)...

:: Clean up previous executables
if exist "AutoPrint.old.exe" del /f /q "AutoPrint.old.exe" > nul 2>&1
if exist "AutoPrint.exe" (
    del /f /q "AutoPrint.exe" > nul 2>&1
    if exist "AutoPrint.exe" (
        move /y "AutoPrint.exe" "AutoPrint.old.exe" > nul 2>&1
    )
)

C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /target:winexe /out:AutoPrint.exe /win32icon:assets\icon\autoprint.ico /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.dll src-launcher\AutoPrintManager.cs

if %errorlevel% equ 0 (
    if exist "AutoPrint.old.exe" del /f /q "AutoPrint.old.exe" > nul 2>&1
    echo [AutoPrint] Successfully compiled AutoPrint.exe!
) else (
    echo [ERROR] Compilation failed with exit code %errorlevel%.
)
