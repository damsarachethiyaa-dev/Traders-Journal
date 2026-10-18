@echo off
rem Creates the local Python environment used for MetaTrader 5 account detection and sync.
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" python -m venv .venv
".venv\Scripts\python.exe" -m pip install --upgrade MetaTrader5 requests
echo.
echo MetaTrader 5 sync environment is ready. Start the app with start.bat
pause
