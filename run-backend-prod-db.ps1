# Start the backend with production database connection.
# Run setup-prod-db.ps1 first to fetch credentials.

$ErrorActionPreference = "Stop"
$prodDbEnv = Join-Path $PSScriptRoot "annix-backend\.env.prod-db"

if (-not (Test-Path $prodDbEnv)) {
    Write-Host "Production DB config not found. Running setup-prod-db.ps1 first..." -ForegroundColor Yellow
    & "$PSScriptRoot\setup-prod-db.ps1"
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Red
Write-Host "  PRODUCTION DATABASE MODE" -ForegroundColor Red
Write-Host "  All changes affect LIVE data!" -ForegroundColor Red
Write-Host "========================================" -ForegroundColor Red
Write-Host ""

foreach ($line in Get-Content $prodDbEnv) {
    $line = $line.Trim()
    if ($line -and -not $line.StartsWith("#")) {
        $parts = $line -split "=", 2
        [System.Environment]::SetEnvironmentVariable($parts[0], $parts[1], "Process")
    }
}

. "$PSScriptRoot\dev-lib.ps1"
Start-AnnixService -SubDir "annix-backend" -Command @("pnpm", "start:dev")
