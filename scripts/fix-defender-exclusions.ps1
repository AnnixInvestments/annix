#Requires -RunAsAdministrator
# Fix Windows Defender causing slow Git pushes
# Run this script as Administrator: Right-click PowerShell -> Run as Administrator
# Then: .\scripts\fix-defender-exclusions.ps1

$ErrorActionPreference = "Stop"

Write-Host "Adding Windows Defender exclusions for development..." -ForegroundColor Cyan

# Directory exclusions
$pathExclusions = @(
    # Annix workspace
    "C:\Users\andy\Documents\Annix-sync",
    # Git internals
    "C:\Users\andy\Documents\Annix-sync\.git",
    # Node modules and build output
    "C:\Users\andy\Documents\Annix-sync\annix-frontend\.next",
    "C:\Users\andy\Documents\Annix-sync\annix-frontend\node_modules",
    "C:\Users\andy\Documents\Annix-sync\annix-backend\node_modules",
    "C:\Users\andy\Documents\Annix-sync\annix-backend\dist",
    "C:\Users\andy\Documents\Annix-sync\node_modules",
    # pnpm store
    "$env:LOCALAPPDATA\pnpm-store",
    "$env:APPDATA\pnpm",
    # Node.js install
    "$env:ProgramFiles\nodejs",
    # Git install
    "$env:ProgramFiles\Git",
    # Temp directories used during builds
    "$env:TEMP"
)

# Process exclusions
$processExclusions = @(
    "node.exe",
    "git.exe",
    "git-remote-https.exe",
    "ssh.exe",
    "ssh-agent.exe",
    "gpg.exe",
    "pnpm.exe",
    "turbopack-node.exe"
)

Write-Host "`nCurrent path exclusions:" -ForegroundColor Yellow
try {
    $current = (Get-MpPreference).ExclusionPath
    if ($current) { $current | ForEach-Object { Write-Host "  $_" } }
    else { Write-Host "  (none)" }
} catch { Write-Host "  Could not read" }

Write-Host "`nAdding path exclusions..." -ForegroundColor Yellow
foreach ($path in $pathExclusions) {
    $resolved = [System.Environment]::ExpandEnvironmentVariables($path)
    try {
        Add-MpPreference -ExclusionPath $resolved -ErrorAction SilentlyContinue
        Write-Host "  + $resolved" -ForegroundColor Green
    } catch {
        Write-Host "  ! Failed: $resolved - $_" -ForegroundColor Red
    }
}

Write-Host "`nAdding process exclusions..." -ForegroundColor Yellow
foreach ($proc in $processExclusions) {
    try {
        Add-MpPreference -ExclusionProcess $proc -ErrorAction SilentlyContinue
        Write-Host "  + $proc" -ForegroundColor Green
    } catch {
        Write-Host "  ! Failed: $proc - $_" -ForegroundColor Red
    }
}

Write-Host "`nVerifying exclusions..." -ForegroundColor Yellow
$prefs = Get-MpPreference
Write-Host "`nPath exclusions:" -ForegroundColor Cyan
$prefs.ExclusionPath | ForEach-Object { Write-Host "  $_" }
Write-Host "`nProcess exclusions:" -ForegroundColor Cyan
$prefs.ExclusionProcess | ForEach-Object { Write-Host "  $_" }

Write-Host "`nDone! Git push should now be faster." -ForegroundColor Green
Write-Host "If pushes are still slow, also check:" -ForegroundColor Yellow
Write-Host "  1. git config --global core.fsmonitor true" -ForegroundColor White
Write-Host "  2. git config --global core.untrackedcache true" -ForegroundColor White
