@echo off
echo Starting Annix Frontend Development Server...
echo.

REM Kill any existing processes on port 3000
echo Stopping any existing processes on port 3000...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    echo Killing process %%a
    taskkill /f /pid %%a 2>nul
)

REM Wait a moment for processes to fully terminate
timeout /t 2 /nobreak >nul

REM Start the development server
echo Starting Next.js development server...
cd /d "%~dp0"
npm run dev

pause