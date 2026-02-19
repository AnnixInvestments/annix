Set-Location $PSScriptRoot
if (-not (Test-Path "node_modules\@annix\claude-swarm\run.ps1")) { pnpm install }
& "node_modules\@annix\claude-swarm\run.ps1"
