@echo off
REM Kill Annix development processes (Windows batch launcher)
powershell -ExecutionPolicy Bypass -File "%~dp0kill-dev.ps1"
