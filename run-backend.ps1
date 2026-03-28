. "$PSScriptRoot\dev-lib.ps1"
Remove-OrphanedNestWatchers
Set-Location "$PSScriptRoot\annix-backend"
Write-Host "[run-backend] Running database migrations..." -ForegroundColor Cyan
pnpm migration:run
Write-Host "[run-backend] Migrations complete, starting backend..." -ForegroundColor Green
pnpm start:dev
