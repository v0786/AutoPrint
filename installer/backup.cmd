@echo off
setlocal
title AutoPrint — Standalone Datastore Backup Utility

call "%~dp0lib\common.cmd" :banner
echo ===============================================================================
echo   AUTOPRINT DATASTORE BACKUP UTILITY
echo ===============================================================================
echo.

call "%~dp0lib\backup.cmd"
echo.
pause
