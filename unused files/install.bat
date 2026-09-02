@echo off
setlocal EnableExtensions

REM Allows installer.bat to run this setup without an intermediate prompt.
set "NO_PAUSE="
if /I "%~1"=="--no-pause" set "NO_PAUSE=1"

REM Run from this script's directory, even when launched by double-click.
set "PROJECT_ROOT=%~dp0"
set "VENV_DIR=%PROJECT_ROOT%.venv"
set "REQUIREMENTS_FILE=%PROJECT_ROOT%requirements.txt"

echo.
echo ============================================================
echo  QRPrint Python Environment Setup
echo ============================================================
echo.

if not exist "%REQUIREMENTS_FILE%" (
    echo [ERROR] requirements.txt was not found in:
    echo         %PROJECT_ROOT%
    goto :python_setup_failed
)

echo [1/5] Checking for Python...
python --version >nul 2>&1
if not errorlevel 1 (
    set "PYTHON_CMD=python"
    goto :python_found
)

py -3 --version >nul 2>&1
if not errorlevel 1 (
    set "PYTHON_CMD=py -3"
    goto :python_found
)

echo [ERROR] Python 3 was not found.
echo         Install Python 3 from https://www.python.org/downloads/
echo         During installation, select "Add Python to PATH".
goto :python_setup_failed

:python_found
%PYTHON_CMD% --version
if errorlevel 1 (
    echo [ERROR] Python could not be started.
    goto :python_setup_failed
)

echo.
echo [2/5] Checking virtual environment...
if exist "%VENV_DIR%\Scripts\python.exe" (
    echo       Existing virtual environment found: %VENV_DIR%
) else (
    if exist "%VENV_DIR%" (
        echo       Existing virtual environment is incomplete; recreating it.
    ) else (
        echo       Creating virtual environment: %VENV_DIR%
    )
    %PYTHON_CMD% -m venv "%VENV_DIR%"
    if errorlevel 1 (
        echo [ERROR] Failed to create the virtual environment.
        goto :python_setup_failed
    )
)

echo.
echo [3/5] Activating virtual environment...
call "%VENV_DIR%\Scripts\activate.bat"
if errorlevel 1 (
    echo [ERROR] Failed to activate the virtual environment.
    goto :python_setup_failed
)

echo.
echo [4/5] Upgrading pip...
python -m pip install --upgrade pip
if errorlevel 1 (
    echo [ERROR] Failed to upgrade pip. Check your internet connection.
    goto :python_setup_failed
)

echo.
echo [5/5] Installing packages from requirements.txt...
python -m pip install -r "%REQUIREMENTS_FILE%"
if errorlevel 1 (
    echo [ERROR] Dependency installation failed. Check requirements.txt and your internet connection.
    goto :python_setup_failed
)

echo.
echo ============================================================
echo  Python environment setup completed successfully.
echo  Virtual environment: %VENV_DIR%
echo ============================================================
echo.
if not defined NO_PAUSE pause
exit /b 0

:python_setup_failed
echo.
echo Setup did not complete. Review the message above and try again.
echo.
if not defined NO_PAUSE pause
exit /b 1
