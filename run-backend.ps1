. "$PSScriptRoot\dev-lib.ps1"

$lockFile = Join-Path $env:TEMP "annix-run-backend.lock"
if (Test-Path $lockFile) {
    $existingPid = (Get-Content $lockFile -ErrorAction SilentlyContinue | Select-Object -First 1)
    if ($existingPid -and (Get-Process -Id ([int]$existingPid) -ErrorAction SilentlyContinue)) {
        Write-Host "[run-backend] Backend launcher already running (pid $existingPid) - exiting to avoid stacking nest watchers. Stop that one first if you want a fresh launcher." -ForegroundColor Yellow
        exit 0
    }
}
Set-Content -Path $lockFile -Value $PID
Register-EngineEvent PowerShell.Exiting -Action {
    Remove-Item (Join-Path $env:TEMP "annix-run-backend.lock") -ErrorAction SilentlyContinue
} | Out-Null

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

$env:NODE_OPTIONS = "--max-old-space-size=8192"

$rapidRestarts = 0
while ($true) {
    Write-Host "[run-backend] starting backend watcher (heap 8 GB)..." -ForegroundColor Green
    $startedAt = Get-Date
    pnpm start:dev
    $exitCode = $LASTEXITCODE
    $uptimeSeconds = [int](New-TimeSpan -Start $startedAt).TotalSeconds

    if ($uptimeSeconds -lt 20) { $rapidRestarts++ } else { $rapidRestarts = 0 }
    if ($rapidRestarts -ge 5) {
        Write-Host "[run-backend] backend exited 5 times within 20s each - looks like a real boot error, not auto-restarting. Fix the issue and relaunch the swarm." -ForegroundColor Red
        break
    }

    Write-Host "[run-backend] backend watcher exited (code $exitCode) after ${uptimeSeconds}s - auto-restarting in 3s..." -ForegroundColor Yellow
    Start-Sleep -Seconds 3
    Remove-OrphanedNestWatchers
}
