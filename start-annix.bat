@echo off
echo Starting Annix Development Environment...
echo PostgreSQL is running as Windows service (no Docker needed)

REM Start the dev servers
cd /d "%~dp0"
call run-dev.bat
