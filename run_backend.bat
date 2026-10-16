@echo off
chcp 65001 > nul
set PYTHONIOENCODING=utf-8
set PYTHONUTF8=1
title IT Blog Backend Server (FastAPI)
echo ========================================================
echo   Đang khởi động IT Blog Backend Server trên cổng 8000
echo ========================================================
cd /d "%~dp0backend"
if exist "..\.venv\Scripts\python.exe" (
    "..\.venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
) else (
    python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
)
pause

