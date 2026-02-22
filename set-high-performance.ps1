# Run this script as Administrator to set High Performance power plan
# Right-click this file → "Run with PowerShell" (as Admin)

Write-Host "Current power plan:"
powercfg /getactivescheme

Write-Host "`nSwitching to High Performance..."
powercfg /setactive 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c

Write-Host "`nNew power plan:"
powercfg /getactivescheme

Write-Host "`nDone! Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
