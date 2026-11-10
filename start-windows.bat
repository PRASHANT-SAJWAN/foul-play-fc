@echo off
rem Foul Play FC for Windows.
rem Double-click this file. It serves the game at http://localhost:8080, saves every
rem match to data-metric\, and can also give friends a temporary public link through Cloudflare.
setlocal
cd /d "%~dp0"
title Foul Play FC

rem Find Python 3: the "py" launcher first, then "python" (skipping the Microsoft Store stub).
set "PY="
py -3 -c "import sys" >nul 2>nul && set "PY=py -3"
if not defined PY python -c "import sys; sys.exit(0 if sys.version_info >= (3, 7) else 1)" >nul 2>nul && set "PY=python"
if not defined PY (
  echo Python 3 is needed to run the game locally.
  echo Install it from https://www.python.org/downloads/windows/
  echo   or run:  winget install --id Python.Python.3.12 -e
  echo During setup, tick "Add python.exe to PATH". Then double-click this file again.
  echo.
  pause
  exit /b 1
)

set "ARGS=--open"
choice /c YN /n /m "Share online with a temporary Cloudflare link? [Y/N] "
if errorlevel 2 goto run
set "ARGS=--open --tunnel"

:run
%PY% server.py %ARGS% %*
echo.
pause
