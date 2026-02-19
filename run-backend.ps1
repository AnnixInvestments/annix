. "$PSScriptRoot\dev-lib.ps1"
Start-AnnixService -SubDir "annix-backend" -Command @("pnpm", "start:dev")
