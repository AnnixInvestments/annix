#!/usr/bin/env bash
# The Annix repo was relocated off OneDrive to C:\dev\Annix. This Documents
# checkout is stale (no .env, not the live tree). Always defer to the live
# launcher so `./run-dev.sh` from here keeps working.
set -euo pipefail

LIVE_RUN_DEV="/c/dev/Annix/run-dev.sh"
if [ ! -x "$LIVE_RUN_DEV" ]; then
  printf '\033[31m[run-dev]\033[0m Live launcher not found at %s\n' "$LIVE_RUN_DEV" >&2
  exit 1
fi

printf '\033[33m[run-dev]\033[0m Redirecting to the live repo at C:\\dev\\Annix...\n'
exec "$LIVE_RUN_DEV" "$@"
