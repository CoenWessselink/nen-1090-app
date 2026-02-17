@echo off
cd /d %~dp0

echo ===============================
echo NEN1090 CWS - Playwright Debug
echo ===============================
echo.

powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing http://localhost:5173/index.html -TimeoutSec 2; exit 0 } catch { exit 1 }"
if errorlevel 1 (
  start "NEN1090 Server (5173)" cmd /k "%~dp0server.bat"
  powershell -NoProfile -Command "Start-Sleep -Seconds 2"
)

npm install
npx playwright install

REM Headed + stop after first failure so you can see what's happening
npx playwright test --headed --timeout=60000 --workers=1 --max-failures=1

echo.
pause
