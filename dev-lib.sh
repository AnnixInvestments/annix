#!/usr/bin/env bash
# Shared helpers for annix service management.
# Source this file; do not execute directly.

ANNIX_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

remove_orphaned_nest_watchers() {
  local killed=0
  local pids
  pids=$(pgrep -f 'nest.*start.*--watch' 2>/dev/null) || return 0

  for np in $pids; do
    local ppid
    ppid=$(ps -o ppid= -p "$np" 2>/dev/null | tr -d ' ')
    if [ -z "$ppid" ] || [ "$ppid" = "1" ] || ! ps -p "$ppid" > /dev/null 2>&1; then
      kill -9 "$np" 2>/dev/null && killed=$((killed + 1))
    fi
  done

  if [ "$killed" -gt 0 ]; then
    echo "[dev-lib] Cleaned up $killed orphaned nest --watch process(es)"
  fi
}

run_service() {
  local subdir="$1"
  shift
  remove_orphaned_nest_watchers
  cd "$ANNIX_ROOT/$subdir"
  exec "$@"
}

kill_service() {
  local port="$1"
  lsof -ti:"$port" 2>/dev/null | xargs kill -9 2>/dev/null || true
}
