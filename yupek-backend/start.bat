@echo off
setlocal
cd /d "%~dp0"
title YUPEK API

where python >nul 2>nul
if errorlevel 1 (
  echo Python 3.10+ not found. Install from https://www.python.org/downloads/ and tick "Add to PATH".
  pause & exit /b 1
)

if not exist .venv (
  echo Creating virtual environment...
  python -m venv .venv || (pause & exit /b 1)
)
call .venv\Scripts\activate.bat

if not exist .venv\.installed (
  echo Installing dependencies...
  python -m pip install --upgrade pip >nul
  pip install -r requirements.txt || (pause & exit /b 1)
  echo ok> .venv\.installed
)

if not exist .env (
  copy .env.example .env >nul
  echo.
  echo .env created. Fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, then run start.bat again.
  notepad .env
  pause & exit /b 0
)

if /i "%1"=="seed" (
  python -m app.seed
  pause & exit /b 0
)

echo.
echo API:  http://localhost:8000
echo Docs: http://localhost:8000/docs
echo.
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause
