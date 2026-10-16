@echo off
title Traders Journal - MetaTrader 5 Sync
cd /d "%~dp0"
echo ==========================================================
echo  Traders Journal - Local MetaTrader 5 Direct Sync
echo ==========================================================
.venv\Scripts\python.exe tools\mt5_sync.py
echo.
pause
