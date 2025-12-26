@echo off
echo Starting Annix Development Environment...

REM Start Docker container if not running
docker start annix-postgres 2>nul
if errorlevel 1 (
    echo Note: Docker container not found or Docker not running
) else (
    echo PostgreSQL container started
    timeout /t 3 /nobreak >nul
)

REM Start the dev servers
cd /d "%~dp0"
call run-dev.bat
