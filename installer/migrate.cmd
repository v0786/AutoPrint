@echo off
setlocal
title AutoPrint — Project Migration ^& Data Reorganization Utility

call "%~dp0lib\common.cmd" :banner
echo ===============================================================================
echo   AUTOPRINT PROJECT MIGRATION ^& DATA REORGANIZATION
echo ===============================================================================
echo.

echo Creating datastore folders if missing...
if not exist "%~dp0..\datastore\customer\uploads" mkdir "%~dp0..\datastore\customer\uploads" >nul 2>&1
if not exist "%~dp0..\datastore\customer\documents" mkdir "%~dp0..\datastore\customer\documents" >nul 2>&1
if not exist "%~dp0..\datastore\merchant\jobs" mkdir "%~dp0..\datastore\merchant\jobs" >nul 2>&1
if not exist "%~dp0..\datastore\backend\database" mkdir "%~dp0..\datastore\backend\database" >nul 2>&1
if not exist "%~dp0..\datastore\backend\logs" mkdir "%~dp0..\datastore\backend\logs" >nul 2>&1
if not exist "%~dp0..\datastore\backend\audit" mkdir "%~dp0..\datastore\backend\audit" >nul 2>&1
if not exist "%~dp0..\datastore\backups" mkdir "%~dp0..\datastore\backups" >nul 2>&1

call "%~dp0lib\common.cmd" :success_msg "Project structure verified."
echo.
pause
