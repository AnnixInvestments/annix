#!/usr/bin/env bash
# Shared helpers for annix service management.
# Source this file; do not execute directly.

ANNIX_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

run_service() {
  local subdir="$1"
  shift
  cd "$ANNIX_ROOT/$subdir"
  exec "$@"
}

kill_service() {
  local port="$1"
  lsof -ti:"$port" 2>/dev/null | xargs kill -9 2>/dev/null || true
}
