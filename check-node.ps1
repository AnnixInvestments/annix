Get-WmiObject Win32_Process -Filter "Name = 'node.exe'" | ForEach-Object {
    $cmd = $_.CommandLine
    if ($cmd -like '*nest*' -or $cmd -like '*annix-backend*') {
        Write-Host "BACKEND: PID $($_.ProcessId) - $cmd"
    } elseif ($cmd -like '*next*' -or $cmd -like '*annix-frontend*') {
        Write-Host "FRONTEND: PID $($_.ProcessId) - $cmd"
    } else {
        Write-Host "OTHER: PID $($_.ProcessId) - $cmd"
    }
}
