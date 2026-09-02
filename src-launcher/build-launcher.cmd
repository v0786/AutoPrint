@echo off
setlocal
cd /d "%~dp0\.."

echo [AutoPrint] Compiling native Windows System Tray Launcher (AutoPrint.exe)...
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /target:winexe /out:AutoPrint.exe /win32icon:assets\icon\autoprint.ico /r:System.Windows.Forms.dll /r:System.Drawing.dll /r:System.dll src-launcher\AutoPrintManager.cs

if %errorlevel% equ 0 (
    echo [AutoPrint] Successfully compiled AutoPrint.exe!
) else (
    echo [ERROR] Compilation failed with exit code %errorlevel%.
)
