@echo off
cd /d "%~dp0"
echo Starting Voice Filter Enrollment...
echo.
npm run enroll -- --auto
echo.
pause
