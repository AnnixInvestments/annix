# Stop any existing processes on port 3000
Write-Host "Stopping any existing processes on port 3000..." -ForegroundColor Yellow

$processes = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($processes) {
    foreach ($proc in $processes) {
        $process = Get-Process -Id $proc.OwningProcess -ErrorAction SilentlyContinue
        if ($process) {
            Write-Host "Stopping process $($process.ProcessName) (PID: $($process.Id))" -ForegroundColor Red
            Stop-Process -Id $process.Id -Force
        }
    }
}

# Wait for processes to terminate
Start-Sleep -Seconds 2

# Start the development server
Write-Host "Starting Next.js development server..." -ForegroundColor Green
Set-Location $PSScriptRoot
npm run dev