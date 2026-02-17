@echo off
cd /d %~dp0
echo Installing npm deps...
npm install
echo Installing Playwright browsers...
npx playwright install
echo Done.
pause
