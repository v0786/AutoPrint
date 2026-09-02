@echo off
if "%~1"==":banner" goto banner
if "%~1"==":print_step" goto print_step
if "%~1"==":prompt_yn" goto prompt_yn
if "%~1"==":success_msg" goto success_msg
if "%~1"==":warn_msg" goto warn_msg
if "%~1"==":error_msg" goto error_msg
goto :eof

:banner
echo ===============================================================================
echo   AUTOPRINT / QRPRINT — PRODUCTION WINDOWS INSTALLER WIZARD v2.0
echo   Automated Print Shop Management, Physical Verification ^& POS Spooler
echo ===============================================================================
echo.
goto :eof

:print_step
echo.
echo -------------------------------------------------------------------------------
echo   STEP %~2: %~3
echo -------------------------------------------------------------------------------
echo.
call "%~dp0logging.cmd" "ENTER STEP %~2: %~3" "INFO"
goto :eof

:prompt_yn
set "PROMPT_RESULT=N"
set /p "USER_INPUT=%~2 [Y/N] (Default: %~3): "
if "%USER_INPUT%"=="" set "USER_INPUT=%~3"
if /i "%USER_INPUT%"=="Y" set "PROMPT_RESULT=Y"
if /i "%USER_INPUT%"=="YES" set "PROMPT_RESULT=Y"
goto :eof

:success_msg
echo   [SUCCESS] %~2
call "%~dp0logging.cmd" "SUCCESS: %~2" "INFO"
goto :eof

:warn_msg
echo   [WARNING] %~2
call "%~dp0logging.cmd" "WARNING: %~2" "WARN"
goto :eof

:error_msg
echo.
echo   [ERROR] %~2
echo.
call "%~dp0logging.cmd" "ERROR: %~2" "ERROR"
goto :eof
