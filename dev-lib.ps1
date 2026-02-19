# Shared helpers for annix service management.
# Dot-source this file; do not execute directly.

function Start-AnnixService {
  param(
    [string]$SubDir,
    [string[]]$Command
  )
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
