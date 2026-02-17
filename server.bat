@echo off
setlocal EnableExtensions
cd /d %~dp0

REM =========================================================
REM NEN1090 Frontend Static Server
REM - Starts a simple static server on http://127.0.0.1:5173
REM - Works even when "python" is NOT on PATH (Windows Store alias issue)
REM - You can override the python exe by setting:
REM     set NEN1090_PYTHON_EXE=C:\path\to\python.exe
REM =========================================================

set "PORT=5173"

REM 1) Explicit override
if not "%NEN1090_PYTHON_EXE%"=="" (
  if exist "%NEN1090_PYTHON_EXE%" (
    "%NEN1090_PYTHON_EXE%" -m http.server %PORT%
    goto :eof
  )
)

REM 2) Common per-user installs
set "PY=%LocalAppData%\Programs\Python\Python312\python.exe"
if exist "%PY%" (
  "%PY%" -m http.server %PORT%
  goto :eof
)

set "PY=%LocalAppData%\Programs\Python\Python311\python.exe"
if exist "%PY%" (
  "%PY%" -m http.server %PORT%
  goto :eof
)

set "PY=%LocalAppData%\Programs\Python\Python310\python.exe"
if exist "%PY%" (
  "%PY%" -m http.server %PORT%
  goto :eof
)

set "PY=%LocalAppData%\Programs\Python\Python314\python.exe"
if exist "%PY%" (
  "%PY%" -m http.server %PORT%
  goto :eof
)

REM 3) Python Launcher (if installed)
py -3.12 -m http.server %PORT% >nul 2>&1
if %errorlevel%==0 goto :eof

py -3.11 -m http.server %PORT% >nul 2>&1
if %errorlevel%==0 goto :eof

py -m http.server %PORT% >nul 2>&1
if %errorlevel%==0 goto :eof

echo.
echo [ERROR] Could not start the frontend server.
echo.
echo Fix:
echo - Install Python 3.12+ (per-user is OK)
echo - Or set NEN1090_PYTHON_EXE to your python.exe
echo.
echo Example:
echo   set NEN1090_PYTHON_EXE=%LocalAppData%\Programs\Python\Python312\python.exe
echo   server.bat
echo.
pause
exit /b 1
