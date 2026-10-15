@echo off
title IT Blog Backend Server (FastAPI)
echo ========================================================
echo   Dang khoi dong IT Blog Backend Server tren cong 8000
echo ========================================================
cd /d "%~dp0backend"
if exist "..\.venv\Scripts\python.exe" (
    "..\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
) else (
    uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
)
pause

