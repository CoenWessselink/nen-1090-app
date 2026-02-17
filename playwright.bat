@echo off
cd /d %~dp0

echo ===============================
echo NEN1090 CWS - Playwright Runner
echo ===============================
echo.

REM Check if server is reachable; if not, start it in a separate window.
powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing http://localhost:5173/index.html -TimeoutSec 2; exit 0 } catch { exit 1 }"
if errorlevel 1 (
  echo Server not running on http://localhost:5173 - starting server.bat in a new window...
  start "NEN1090 Server (5173)" cmd /k "%~dp0server.bat"
  echo Waiting 2 seconds for server to start...
  powershell -NoProfile -Command "Start-Sleep -Seconds 2"
) else (
  echo Server is running.
)

echo Installing npm deps (if needed)...
npm install

echo Installing Playwright browsers (if needed)...
npx playwright install

echo Running tests...
npx playwright test

echo.
echo Done. Press any key to close.
pause >nul
