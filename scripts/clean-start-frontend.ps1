# PowerShell script for clean frontend start
# Usage: .\scripts\clean-start-frontend.ps1

Write-Host "=== Clean Frontend Start ===" -ForegroundColor Cyan

# Step 1: Kill any processes on port 3000
Write-Host "Killing processes on port 3000..." -ForegroundColor Yellow
$connections = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($connections) {
    $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($pid in $pids) {
        Write-Host "  Killing PID $pid" -ForegroundColor Red
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
} else {
    Write-Host "  No processes found on port 3000" -ForegroundColor Green
}

# Step 2: Clear corrupted cache
Write-Host "Clearing Next.js cache..." -ForegroundColor Yellow
$cacheDir = Join-Path $PSScriptRoot "..\annix-frontend\.next\cache"
$turboDir = Join-Path $PSScriptRoot "..\annix-frontend\.next\cache\turbopack"
$swcDir = Join-Path $PSScriptRoot "..\annix-frontend\.next\cache\swc"

if (Test-Path $turboDir) {
    Remove-Item -Recurse -Force $turboDir -ErrorAction SilentlyContinue
    Write-Host "  Cleared turbopack cache" -ForegroundColor Green
}

if (Test-Path $swcDir) {
    Remove-Item -Recurse -Force $swcDir -ErrorAction SilentlyContinue
    Write-Host "  Cleared swc cache" -ForegroundColor Green
}

# Step 3: Start frontend
Write-Host "Starting frontend on port 3000..." -ForegroundColor Cyan
Set-Location (Join-Path $PSScriptRoot "..\annix-frontend")
pnpm dev
