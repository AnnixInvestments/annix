# Run this script as Administrator to add Windows Defender exclusions
# If not admin, it will show an error

Write-Host "Adding Windows Defender exclusions for development..." -ForegroundColor Cyan

# Project directory
Write-Host "Adding: C:\Users\andy\Documents\Annix-sync"
Add-MpPreference -ExclusionPath "C:\Users\andy\Documents\Annix-sync"

# pnpm store
Write-Host "Adding: C:\Users\andy\AppData\Local\pnpm"
Add-MpPreference -ExclusionPath "C:\Users\andy\AppData\Local\pnpm"

# Node processes
Write-Host "Adding: node.exe process"
Add-MpPreference -ExclusionProcess "node.exe"

Write-Host "`nCurrent exclusions:" -ForegroundColor Green
Get-MpPreference | Select-Object -ExpandProperty ExclusionPath

Write-Host "`nDone!" -ForegroundColor Green
