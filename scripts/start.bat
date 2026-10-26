@echo off
cd /d "%~dp0\.."
if exist "dist\win-unpacked\Traders Journal.exe" (
    start "" "dist\win-unpacked\Traders Journal.exe"
) else if exist "dist\video-edition\win-unpacked\Traders Journal.exe" (
    start "" "dist\video-edition\win-unpacked\Traders Journal.exe"
) else if exist "%LOCALAPPDATA%\Programs\Traders Journal\Traders Journal.exe" (
    start "" "%LOCALAPPDATA%\Programs\Traders Journal\Traders Journal.exe"
) else (
    call npm start
)
exit /b 0
