. "$PSScriptRoot\dev-lib.ps1"
Remove-OrphanedNestWatchers
Set-Location "$PSScriptRoot\annix-backend"

$maxAttempts = 3
$attempt = 0
$migrationSucceeded = $false

while ($attempt -lt $maxAttempts -and -not $migrationSucceeded) {
    $attempt++
    Write-Host "[run-backend] Running database migrations (attempt $attempt/$maxAttempts)..." -ForegroundColor Cyan
    pnpm migration:run
    if ($LASTEXITCODE -eq 0) {
        $migrationSucceeded = $true
    } else {
        Write-Host "[run-backend] Migration attempt $attempt failed, retrying in 5s..." -ForegroundColor Yellow
        Start-Sleep -Seconds 5
    }
}

if ($migrationSucceeded) {
    Write-Host "[run-backend] Migrations complete, starting backend..." -ForegroundColor Green
} else {
    Write-Host "[run-backend] Migrations failed after $maxAttempts attempts, starting backend anyway..." -ForegroundColor Yellow
}

pnpm start:dev
