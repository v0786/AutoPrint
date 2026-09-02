@echo off
title AutoPrint Background Server Stopper
echo ====================================================
echo      AUTOPRINT STOP BACKGROUND SERVERS              
echo ====================================================
echo.

echo Terminating running node and ts-node processes...
taskkill /F /IM node.exe >nul 2>&1

echo.
echo ====================================================
echo All AutoPrint background server processes stopped.
echo ====================================================
ping 127.0.0.1 -n 3 >nul
