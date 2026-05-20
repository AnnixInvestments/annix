$os = Get-CimInstance Win32_OperatingSystem
$totalGB = [math]::Round($os.TotalVisibleMemorySize / 1MB, 1)
$freeGB = [math]::Round($os.FreePhysicalMemory / 1MB, 1)
$usedGB = [math]::Round($totalGB - $freeGB, 1)
Write-Output "Total RAM: $totalGB GB | Used: $usedGB GB | Free: $freeGB GB"

Write-Output ""
Write-Output "--- top 15 processes by RAM ---"
Get-Process |
  Sort-Object WorkingSet64 -Descending |
  Select-Object -First 15 `
    Name,
    Id,
    @{ N = "RAM_MB"; E = { [math]::Round($_.WorkingSet64 / 1MB) } },
    @{ N = "StartTime"; E = { $_.StartTime } } |
  Format-Table -AutoSize

Write-Output "--- node.exe processes (command line) ---"
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Select-Object ProcessId,
    @{ N = "RAM_MB"; E = { [math]::Round($_.WorkingSetSize / 1MB) } },
    @{ N = "Parent"; E = { $_.ParentProcessId } },
    CommandLine |
  Sort-Object RAM_MB -Descending |
  Format-List

Write-Output "--- claude.exe processes (parent chain) ---"
$claudeProcs = Get-CimInstance Win32_Process -Filter "Name='claude.exe'"
foreach ($c in $claudeProcs) {
  $parent = Get-CimInstance Win32_Process -Filter "ProcessId=$($c.ParentProcessId)" -ErrorAction SilentlyContinue
  $pname = if ($parent) { $parent.Name } else { "(gone)" }
  $ram = [math]::Round($c.WorkingSetSize / 1MB)
  $age = (Get-Date) - $c.CreationDate
  $ageStr = if ($age.TotalDays -ge 1) {
    "{0:N1}d old" -f $age.TotalDays
  } else {
    "{0:N1}h old" -f $age.TotalHours
  }
  Write-Output "claude PID $($c.ProcessId)  ${ram}MB  parent=$($c.ParentProcessId) ($pname)  $ageStr"
}

Write-Output ""
Write-Output "--- swarm registry (live PIDs) ---"
if (Test-Path ".claude-swarm/registry.json") {
  $reg = Get-Content ".claude-swarm/registry.json" -Raw | ConvertFrom-Json
  foreach ($svc in @("backend", "frontend")) {
    $entry = $reg.$svc
    if ($entry) {
      Write-Output "$svc : pid=$($entry.pid) status=$($entry.status) port=$($entry.port)"
    }
  }
} else {
  Write-Output "(no registry.json - swarm not running here)"
}
