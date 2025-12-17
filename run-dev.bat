@echo off
setlocal
set SCRIPT_DIR=%~dp0

if exist "%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" (
    powershell -ExecutionPolicy Bypass -File "%SCRIPT_DIR%run-dev.ps1" %*
) else (
    echo PowerShell is required to run this script.
    exit /b 1
)
endlocal
