@echo off
cd /d "%~dp0"
python web_app.py
if errorlevel 1 (
  echo.
  echo The application could not start. Confirm that Python 3.11 or newer is installed.
  pause
)
