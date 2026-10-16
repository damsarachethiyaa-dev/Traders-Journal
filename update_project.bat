@echo off
setlocal enabledelayedexpansion
title Traders Journal - GitHub Update Helper
echo =======================================================
echo   TRADERS JOURNAL - GITHUB UPDATE & SYNC HELPER
echo   Created by Chethiya Rathnasekara
echo =======================================================
echo.

echo Checking Git status...
git status -s
echo.

set /p COMMIT_MSG="Enter commit message (or press Enter for 'Update Traders Journal'): "
if "!COMMIT_MSG!"=="" set COMMIT_MSG=Update Traders Journal

echo.
echo [1/3] Staging all files...
git add .

echo [2/3] Committing changes...
git commit -m "!COMMIT_MSG!"

echo [3/3] Pushing to GitHub...
git push origin main
if %ERRORLEVEL% neq 0 (
    echo.
    echo [NOTE] Push failed or remote 'origin' is not configured yet.
    echo To set your remote repository, run:
    echo   git remote add origin https://github.com/^<your-username^>/^<your-repo^>.git
    echo   git push -u origin main
) else (
    echo.
    echo [SUCCESS] Updates pushed to GitHub successfully!
)

echo.
pause
