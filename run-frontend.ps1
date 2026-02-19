. "$PSScriptRoot\dev-lib.ps1"
Start-AnnixService -SubDir "annix-frontend" -Command @("pnpm", "dev:turbo")
