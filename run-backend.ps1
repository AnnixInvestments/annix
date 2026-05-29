. "$PSScriptRoot\dev-lib.ps1"
Remove-OrphanedNestWatchers
Set-Location "$PSScriptRoot\annix-backend"

$databaseDriver = $env:DATABASE_DRIVER
if (-not $databaseDriver -and (Test-Path ".env")) {
    $driverLine = Select-String -Path ".env" -Pattern '^DATABASE_DRIVER=(.*)$' | Select-Object -First 1
    if ($driverLine) { $databaseDriver = $driverLine.Matches[0].Groups[1].Value.Trim() }
}

if ($databaseDriver -eq 'mongo') {
    Write-Host "[run-backend] DATABASE_DRIVER=mongo - skipping Postgres migrations (Mongo has no SQL migrations)." -ForegroundColor Green
} else {
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
}

pnpm start:dev
