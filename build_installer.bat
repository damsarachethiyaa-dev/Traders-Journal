@echo off
setlocal
title Traders Journal - Build Executable Installer
echo =======================================================
echo   TRADERS JOURNAL - WINDOWS EXE BUILDER
echo   Created by Chethiya Rathnasekara
echo =======================================================
echo.

echo [1/3] Closing any running instances of Traders Journal...
powershell -NoProfile -Command "Stop-Process -Name 'Traders Journal' -Force -ErrorAction SilentlyContinue"
echo Done.
echo.

echo [2/3] Building Windows Installer and Portable EXE...
call npm run dist
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Build failed! Please check the output above for errors.
    pause
    exit /b %ERRORLEVEL%
)
echo.

echo [3/3] Build completed successfully!
echo.
echo Executable files are ready in the 'dist' folder:
echo   - dist\Traders-Journal-Setup-1.0.1.exe (Installer)
echo   - dist\Traders-Journal-Portable-1.0.1.exe (Portable)
echo.

explorer dist
pause
