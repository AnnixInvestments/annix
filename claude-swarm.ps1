Set-Location $PSScriptRoot

if ($env:SWARM_WINDOW -ne "true") {
    $env:SWARM_WINDOW = "true"
    wt --window swarm new-tab --title "Swarm Manager" -d $PSScriptRoot powershell -ExecutionPolicy Bypass -NoExit -File $PSCommandPath
    exit
}

$packageVersion = (Get-Content package.json | ConvertFrom-Json).devDependencies.'@annix/claude-swarm'
$latestVersion = (npm view @annix/claude-swarm version 2>$null)
$installedVersion = $null
if (Test-Path "node_modules\@annix\claude-swarm\package.json") {
    $installedVersion = (Get-Content "node_modules\@annix\claude-swarm\package.json" | ConvertFrom-Json).version
}

$needsInstall = $false

if ($latestVersion -and ($latestVersion -ne $packageVersion)) {
    Write-Host "Updating @annix/claude-swarm: $packageVersion -> $latestVersion"
    $packageJson = Get-Content package.json -Raw | ConvertFrom-Json
    $packageJson.devDependencies.'@annix/claude-swarm' = $latestVersion
    $packageJson | ConvertTo-Json -Depth 100 | Set-Content package.json
    $needsInstall = $true
} elseif ($installedVersion -ne $packageVersion) {
    Write-Host "Installing @annix/claude-swarm@$packageVersion (currently have $installedVersion)"
    $needsInstall = $true
}

if ($needsInstall) { pnpm install }

& "node_modules\@annix\claude-swarm\run.ps1"
