Write-Host "Stopping all Annix development processes..."

$pids = @(14244, 22916, 21592, 1668, 5156, 24860, 23668, 1256, 12416, 11588)

foreach ($pid in $pids) {
    try {
        Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        Write-Host "Stopped PID $pid"
    } catch {
        Write-Host "PID $pid already stopped or not found"
    }
}

Start-Sleep -Seconds 2

Write-Host "Remaining node processes:"
Get-Process -Name node -ErrorAction SilentlyContinue | ForEach-Object {
    Write-Host "  PID $($_.Id)"
}
