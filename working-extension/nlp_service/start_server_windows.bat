@echo off
REM Windows batch script to start the NLP server
cd /d "%~dp0"

REM Check if virtual environment exists
if not exist ".venv\Scripts\python.exe" (
    echo Virtual environment not found. Creating one...
    python -m venv .venv
    echo Installing dependencies...
    .venv\Scripts\pip install -r requirements.txt
)

REM Activate virtual environment and start server
echo Activating virtual environment...
call .venv\Scripts\activate.bat
echo Starting NLP server...
python start_server.py
pause

