@echo off
setlocal enabledelayedexpansion

echo =======================================================
echo   Spotpatch - Spotify CEF Theme Patcher (Installer)
echo =======================================================
echo.

:: Detect Python executable
set "PY_EXE="
where py.exe >nul 2>&1
if %ERRORLEVEL% equ 0 (
    set "PY_EXE=py -3"
) else (
    where python.exe >nul 2>&1
    if %ERRORLEVEL% equ 0 (
        set "PY_EXE=python"
    )
)

if "%PY_EXE%"=="" (
    echo [ERROR] Python 3.11+ is not installed or not in your PATH.
    echo Please install Python 3.11 or newer from https://www.python.org/
    echo Make sure to check "Add python.exe to PATH" during installation.
    echo.
    pause
    exit /b 1
)

echo [*] Applying theme and patching Spotify...
cd /d "%~dp0"
%PY_EXE% patcher.py apply --restart
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Patching failed with exit code %ERRORLEVEL%.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [OK] Spotify patched successfully and relaunched!
timeout /t 5 >nul
exit /b 0
