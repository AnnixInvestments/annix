# Shared helpers for annix service management.
# Dot-source this file; do not execute directly.

function Remove-OrphanedNestWatchers {
  $watchers = Get-CimInstance Win32_Process -Filter "Name='node.exe'" -ErrorAction SilentlyContinue |
    Where-Object { $_.CommandLine -like '*nest*start*--watch*' }

  if (-not $watchers) { return }

  $killed = 0
  foreach ($w in $watchers) {
    $parent = Get-CimInstance Win32_Process -Filter "ProcessId=$($w.ParentProcessId)" -ErrorAction SilentlyContinue
    $isOrphaned = (-not $parent) -or ($parent.Name -eq 'cmd.exe' -and $parent.CommandLine -like '*nest start --watch*')

    if ($isOrphaned) {
      Stop-Process -Id $w.ProcessId -Force -ErrorAction SilentlyContinue
      if ($parent -and $parent.Name -eq 'cmd.exe') {
        Stop-Process -Id $parent.ProcessId -Force -ErrorAction SilentlyContinue
      }
      $killed++
    }
  }

  if ($killed -gt 0) {
    Write-Host "[dev-lib] Cleaned up $killed orphaned nest --watch process(es)" -ForegroundColor Yellow
  }
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
