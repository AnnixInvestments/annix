@echo off
cd /d "%~dp0"

:: Start the server in the background
start /b "" npm run dashboard >nul 2>&1

:: Wait for server to start
timeout /t 2 /nobreak >nul

:: Open the HTA mini UI
start "" mshta.exe "%~dp0VoiceFilter.hta"
