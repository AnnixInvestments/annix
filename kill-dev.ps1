# Kill all Annix development processes (Windows PowerShell)

Write-Host "Stopping Annix development servers..." -ForegroundColor Yellow

# Kill processes on Annix ports (backend: 4001, frontend: 3000)
$ports = @(4001, 3000)
foreach ($port in $ports) {
    $connections = netstat -ano | Select-String ":$port.*LISTENING"
    foreach ($conn in $connections) {
        $procId = $conn.ToString().Split()[-1]
        if ($procId -match '^\d+$') {
            Write-Host "  Killing process $procId on port $port" -ForegroundColor Gray
            Stop-Process -Id $procId -Force -ErrorAction SilentlyContinue
        }
    }
}

# Kill any node processes with command lines referencing annix backend/frontend (but NOT parallel-claude)
Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" -ErrorAction SilentlyContinue | ForEach-Object {
    $cmd = $_.CommandLine
    $isParallelClaude = $cmd -like "*parallel-claude*"
    $isDevProcess = ($cmd -like "*annix-backend*") -or ($cmd -like "*annix-frontend*") -or ($cmd -like "*nest*start*") -or ($cmd -like "*next*dev*")

    if ($isDevProcess -and -not $isParallelClaude) {
        Write-Host "  Killing node process $($_.ProcessId): $($cmd.Substring(0, [Math]::Min(80, $cmd.Length)))..." -ForegroundColor Gray
        Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

# Clear Next.js cache to prevent lock issues
$nextDir = Join-Path $PSScriptRoot "annix-frontend\.next"
if (Test-Path $nextDir) {
    Write-Host "  Clearing .next cache..." -ForegroundColor Gray
    Remove-Item -Recurse -Force $nextDir -ErrorAction SilentlyContinue
}

Write-Host "All development processes stopped" -ForegroundColor Green
