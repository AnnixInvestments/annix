<#
.SYNOPSIS
  Periodically clean up orphan node.exe processes left behind by crashed
  swarm sessions, without touching active swarm-managed dev servers.

.DESCRIPTION
  Reads .claude-swarm/registry.json, walks the parent-child process tree
  from each swarm-claimed PID, and treats every node.exe NOT in that tree
  as a candidate orphan. Candidates are killed only if they match known
  orphan patterns (`nest --watch`, `next dev`, etc.) or have no living
  parent. Output is logged to logs/orphan-cleanup.log.

  Designed to run from Windows Task Scheduler every ~6 hours. Use
  -DryRun for first-time validation.

.PARAMETER DryRun
  Identify and report orphans without killing them. Recommended on first
  run to verify no legitimate processes are mis-classified.

.PARAMETER ProjectRoot
  Override the project root path. Defaults to the repo this script lives in.

.EXAMPLE
  pwsh -File scripts/kill-orphan-node-processes.ps1 -DryRun
  pwsh -File scripts/kill-orphan-node-processes.ps1
#>

[CmdletBinding()]
param(
  [switch]$DryRun,
  [string]$ProjectRoot
)

$ErrorActionPreference = 'Stop'

if (-not $ProjectRoot) {
  $ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
}
$RegistryPath = Join-Path $ProjectRoot '.claude-swarm/registry.json'
$LogDir       = Join-Path $ProjectRoot 'logs'
$LogPath      = Join-Path $LogDir 'orphan-cleanup.log'

# Ensure log dir exists.
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir -Force | Out-Null }

function Write-Log {
  param([string]$Level, [string]$Message)
  $line = "[{0}] [{1}] {2}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Level.ToUpper(), $Message
  Add-Content -Path $LogPath -Value $line
  if ($Level -eq 'ERROR') { Write-Error $Message }
  else                    { Write-Host $line }
}

function Get-Descendants {
  param([int]$RootPid, [hashtable]$ChildrenByParent)
  $stack = [System.Collections.Generic.Stack[int]]::new()
  $stack.Push($RootPid)
  $seen = [System.Collections.Generic.HashSet[int]]::new()
  while ($stack.Count -gt 0) {
    $current = $stack.Pop()
    if ($seen.Add($current)) {
      $children = $ChildrenByParent[$current]
      if ($children) {
        foreach ($child in $children) { $stack.Push($child) }
      }
    }
  }
  return $seen
}

# ---- Read swarm registry ----
if (-not (Test-Path $RegistryPath)) {
  Write-Log 'INFO' "No swarm registry at $RegistryPath — nothing to protect, exiting safely."
  exit 0
}
$registry = Get-Content $RegistryPath -Raw | ConvertFrom-Json

$registryPids = @()
foreach ($app in @('backend', 'frontend')) {
  $entry = $registry.$app
  if ($entry -and $entry.status -eq 'running' -and $entry.pid) {
    $registryPids += [int]$entry.pid
  }
}
Write-Log 'INFO' ("Swarm-registered active PIDs: " + ($registryPids -join ', '))

# ---- Snapshot all running processes (not just node.exe) so we can build the full parent-child tree ----
$allProcs = Get-CimInstance Win32_Process |
  Select-Object ProcessId, ParentProcessId, Name, CommandLine, WorkingSetSize

$childrenByParent = @{}
foreach ($p in $allProcs) {
  $key = [int]$p.ParentProcessId
  if (-not $childrenByParent.ContainsKey($key)) { $childrenByParent[$key] = @() }
  $childrenByParent[$key] += [int]$p.ProcessId
}

# ---- Build the protected set: registry PIDs + their descendants + the swarm orchestrator + Claude Code ----
$protected = [System.Collections.Generic.HashSet[int]]::new()

foreach ($p in $registryPids) {
  foreach ($d in Get-Descendants -RootPid $p -ChildrenByParent $childrenByParent) {
    [void]$protected.Add($d)
  }
  # Also walk UP one level to protect the cmd.exe / pwsh.exe wrapper that spawned the registry PID.
  $reg = $allProcs | Where-Object { $_.ProcessId -eq $p }
  if ($reg) { [void]$protected.Add([int]$reg.ParentProcessId) }
}

# Find the swarm orchestrator itself + its tree.
$swarmOrchestrators = $allProcs | Where-Object {
  $_.Name -eq 'node.exe' -and $_.CommandLine -and $_.CommandLine -match 'claude-swarm[\\/]dist[\\/]bin\.js'
}
foreach ($s in $swarmOrchestrators) {
  foreach ($d in Get-Descendants -RootPid ([int]$s.ProcessId) -ChildrenByParent $childrenByParent) {
    [void]$protected.Add($d)
  }
  [void]$protected.Add([int]$s.ParentProcessId)
}

# Protect anything that looks like an active Claude Code agent.
$claudeProcs = $allProcs | Where-Object {
  $_.CommandLine -and ($_.CommandLine -match 'claude-code' -or $_.CommandLine -match '\\\.claude\\')
}
foreach ($c in $claudeProcs) {
  [void]$protected.Add([int]$c.ProcessId)
  [void]$protected.Add([int]$c.ParentProcessId)
}

Write-Log 'INFO' ("Protected PID set size: " + $protected.Count)

# ---- Identify orphan candidates among node.exe processes ----
$nodeProcs = $allProcs | Where-Object { $_.Name -eq 'node.exe' }
$candidates = @()
foreach ($n in $nodeProcs) {
  $procPid = [int]$n.ProcessId
  if ($protected.Contains($procPid)) { continue }

  $cmdLine = if ($n.CommandLine) { $n.CommandLine } else { '' }
  $memMB   = [math]::Round($n.WorkingSetSize / 1MB, 1)

  # Classification heuristics — order matters.
  $reason = $null

  # Pattern: nest --watch with no living swarm parent.
  if ($cmdLine -match 'nest\.js.* start.*--watch' -or $cmdLine -match 'nest\\bin\\nest\.js') {
    $reason = "stale nest --watch (not in active swarm tree)"
  }
  # Pattern: next dev with no living swarm parent.
  elseif ($cmdLine -match 'next[\\/]dist[\\/]bin[\\/]next.*\bdev\b' -or $cmdLine -match 'next dev') {
    $reason = "stale next dev (not in active swarm tree)"
  }
  # Pattern: large memory consumer with dead parent.
  elseif ($memMB -gt 100) {
    $parentAlive = $allProcs | Where-Object { $_.ProcessId -eq $n.ParentProcessId }
    if (-not $parentAlive) {
      $reason = "orphan (parent process dead) consuming ${memMB} MB"
    }
  }

  if ($reason) {
    $candidates += [pscustomobject]@{
      Pid      = $procPid
      MemMB    = $memMB
      Reason   = $reason
      Command  = if ($cmdLine.Length -gt 200) { $cmdLine.Substring(0, 200) + '...' } else { $cmdLine }
    }
  }
}

if ($candidates.Count -eq 0) {
  Write-Log 'INFO' "No orphan node processes found."
  exit 0
}

$totalMB = ($candidates | Measure-Object MemMB -Sum).Sum
Write-Log 'INFO' ("Found {0} orphan candidate(s); total {1} MB" -f $candidates.Count, $totalMB)

foreach ($c in $candidates) {
  Write-Log 'INFO' ("  PID {0}  {1} MB  {2}" -f $c.Pid, $c.MemMB, $c.Reason)
  Write-Log 'INFO' ("      cmd: " + $c.Command)
}

if ($DryRun) {
  Write-Log 'INFO' "DryRun — no processes killed. Re-run without -DryRun to actually kill."
  exit 0
}

$killed = 0
foreach ($c in $candidates) {
  try {
    Stop-Process -Id $c.Pid -Force -ErrorAction Stop
    Write-Log 'INFO' ("Killed PID {0}" -f $c.Pid)
    $killed++
  } catch {
    Write-Log 'WARN' ("Failed to kill PID {0}: {1}" -f $c.Pid, $_.Exception.Message)
  }
}

Write-Log 'INFO' ("Killed {0} of {1} orphan candidate(s); ~{2} MB freed" -f $killed, $candidates.Count, $totalMB)
exit 0
