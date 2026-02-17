@echo off
setlocal
cd /d "%~dp0"

REM Frontend Service: serve built static dist on port 5173
REM This avoids running Vite dev server as a Windows Service.

if not exist "dist" (
  echo [ERROR] dist folder not found: %cd%\dist
  echo Run ..\03_BUILD_FRONTEND_DIST.bat first.
  exit /b 1
)

REM Use Python's built-in static server
python -m http.server 5173 --bind 127.0.0.1 --directory dist
