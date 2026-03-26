# Shared helpers for annix service management.
# Dot-source this file; do not execute directly.

function Remove-OrphanedNestWatchers {
  $myPid = $PID
  $watchers = Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like '*nest*start*--watch*' }

  if (-not $watchers) { return }

  $killed = 0
  foreach ($w in $watchers) {
    if ((Test-IsDescendantOf -ChildPid $w.ProcessId -AncestorPid $myPid)) { continue }

    Stop-Process -Id $w.ProcessId -Force -ErrorAction SilentlyContinue
    $parent = Get-CimInstance Win32_Process -Filter "ProcessId=$($w.ParentProcessId)" -ErrorAction SilentlyContinue
    if ($parent -and $parent.Name -eq 'cmd.exe') {
      Stop-Process -Id $parent.ProcessId -Force -ErrorAction SilentlyContinue
    }
    $killed++
  }

  if ($killed -gt 0) {
    Write-Host "[dev-lib] Cleaned up $killed orphaned nest --watch process(es)" -ForegroundColor Yellow
  }
}

function Test-IsDescendantOf {
  param([int]$ChildPid, [int]$AncestorPid)
  $current = $ChildPid
  for ($i = 0; $i -lt 10; $i++) {
    if ($current -eq $AncestorPid) { return $true }
    if ($current -le 0) { return $false }
    $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$current" -ErrorAction SilentlyContinue
    if (-not $proc) { return $false }
    $current = $proc.ParentProcessId
  }
  return $false
}

function Start-AnnixService {
  param(
    [string]$SubDir,
    [string[]]$Command
  )
  Remove-OrphanedNestWatchers
  Set-Location "$PSScriptRoot\$SubDir"
  & $Command[0] $Command[1..($Command.Length - 1)]
}

function Stop-AnnixService {
  param([int]$Port)
  $conn = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if ($conn) {
    Stop-Process -Id $conn.OwningProcess -Force -ErrorAction SilentlyContinue
  }
}
