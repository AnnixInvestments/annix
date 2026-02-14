# Annix Development Servers Startup Script
# This script starts both the backend and frontend development servers

$backendPath = "C:\Users\andy\Documents\annix\annix-backend"
$frontendPath = "C:\Users\andy\Documents\annix\annix-frontend"

Write-Host "Starting Annix Development Servers..." -ForegroundColor Cyan

# Wait for PostgreSQL to be ready
Write-Host "Waiting for PostgreSQL service..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
while ($attempt -lt $maxAttempts) {
    $service = Get-Service -Name "postgresql-x64-16" -ErrorAction SilentlyContinue
    if ($service -and $service.Status -eq "Running") {
        Write-Host "PostgreSQL is running." -ForegroundColor Green
        break
    }
    $attempt++
    Start-Sleep -Seconds 2
}

if ($attempt -eq $maxAttempts) {
    Write-Host "Warning: PostgreSQL service not detected. Servers may fail to connect to database." -ForegroundColor Red
}

# Start Backend Server in new window
Write-Host "Starting Backend Server (port 4001)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; npm run start:dev" -WindowStyle Normal

# Wait a moment for backend to initialize
Start-Sleep -Seconds 5

# Start Frontend Server in new window
Write-Host "Starting Frontend Server (port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "Annix servers are starting!" -ForegroundColor Green
Write-Host "- Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "- Backend:  http://localhost:4001" -ForegroundColor Cyan
Write-Host ""
Write-Host "This window will close in 10 seconds..." -ForegroundColor Gray
Start-Sleep -Seconds 10
