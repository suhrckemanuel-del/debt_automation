@echo off
cd /d "%~dp0"

python --version >nul 2>&1
if errorlevel 1 (
  echo Python 3.11 or newer is required.
  echo Install Python from https://www.python.org/downloads/ and run this file again.
  pause
  exit /b 1
)

echo Installing the local application and PDF support...
python -m pip install -e .
if errorlevel 1 (
  echo.
  echo Setup failed. Check the error above.
  pause
  exit /b 1
)

echo.
echo Running the synthetic safety benchmark...
python app.py benchmark
if errorlevel 1 (
  echo.
  echo Setup completed, but the benchmark failed. Do not use the pilot yet.
  pause
  exit /b 1
)

echo.
echo Setup complete. Double-click start_app.bat to launch the application.
pause
