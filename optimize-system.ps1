# Run this script as Administrator
# Right-click PowerShell > Run as Administrator, then execute this script

Write-Host "=== System Optimization Script ===" -ForegroundColor Cyan
Write-Host ""

# 1. Add Windows Defender exclusion for development folder
Write-Host "[1/3] Adding Windows Defender exclusion for Annix-sync..." -ForegroundColor Yellow
try {
    Add-MpPreference -ExclusionPath "C:\Users\andy\Documents\Annix-sync"
    Write-Host "  SUCCESS: Defender exclusion added" -ForegroundColor Green
} catch {
    Write-Host "  FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

# 2. Disable unnecessary startup programs
Write-Host ""
Write-Host "[2/3] Disabling unnecessary startup programs..." -ForegroundColor Yellow

$startupApps = @(
    @{Name="com.squirrel.FathomVideo.Fathom"; Path="HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"},
    @{Name="AdobeGCInvoker-1.0"; Path="HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"},
    @{Name="CDAServer"; Path="HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Run"}
)

foreach ($app in $startupApps) {
    try {
        $value = Get-ItemProperty -Path $app.Path -Name $app.Name -ErrorAction SilentlyContinue
        if ($value) {
            Remove-ItemProperty -Path $app.Path -Name $app.Name -ErrorAction Stop
            Write-Host "  Disabled: $($app.Name)" -ForegroundColor Green
        } else {
            Write-Host "  Skipped (not found): $($app.Name)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "  Failed to disable $($app.Name): $($_.Exception.Message)" -ForegroundColor Red
    }
}

# 3. Run Disk Cleanup
Write-Host ""
Write-Host "[3/3] Running Disk Cleanup..." -ForegroundColor Yellow
Write-Host "  This will open Disk Cleanup - select items to clean and click OK"
Start-Process -FilePath "cleanmgr.exe" -ArgumentList "/d C" -Wait

Write-Host ""
Write-Host "=== Optimization Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Additional manual steps:" -ForegroundColor Yellow
Write-Host "  1. Open Task Manager > Startup tab"
Write-Host "  2. Disable: ESET VPN, Samsung Stylish UI, Fathom (if still there)"
Write-Host "  3. Restart your computer for changes to take effect"
Write-Host ""
Read-Host "Press Enter to exit"
