# Kill all Annix development processes (Windows PowerShell)

Write-Host "🛑 Stopping Annix development servers..." -ForegroundColor Yellow

# Kill backend processes
Get-Process -Name "node" -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -like "*annix-backend*" } |
    Stop-Process -Force -ErrorAction SilentlyContinue

# Kill frontend processes
Get-Process -Name "node" -ErrorAction SilentlyContinue |
    Where-Object { $_.Path -like "*annix-frontend*" } |
    Stop-Process -Force -ErrorAction SilentlyContinue

# Kill processes on specific ports
$ports = @(4001, 3000, 4200)
foreach ($port in $ports) {
    $connections = netstat -ano | Select-String ":$port.*LISTENING"
    foreach ($conn in $connections) {
        $pid = $conn.ToString().Split()[-1]
        if ($pid -match '^\d+$') {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
        }
    }
}

Write-Host "✅ All development processes stopped" -ForegroundColor Green
Write-Host ""
Write-Host "Tip: You can restart with .\run-dev.ps1" -ForegroundColor Cyan
