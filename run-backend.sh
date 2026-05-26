#!/usr/bin/env bash
set -uo pipefail
# shellcheck source=dev-lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/dev-lib.sh"
cd "$ANNIX_ROOT/annix-backend"

database_driver=$(grep -E '^DATABASE_DRIVER=' .env 2>/dev/null | cut -d= -f2- | tr -d '[:space:]')

if [ "$database_driver" = "mongo" ]; then
  echo "[run-backend] DATABASE_DRIVER=mongo — skipping Postgres migrations"
else
  max_attempts=3
  attempt=0
  migration_ok=false

  while [ "$attempt" -lt "$max_attempts" ] && [ "$migration_ok" = false ]; do
    attempt=$((attempt + 1))
    echo "[run-backend] Running database migrations (attempt $attempt/$max_attempts)..."
    if pnpm migration:run; then
      migration_ok=true
    else
      echo "[run-backend] Migration attempt $attempt failed, retrying in 5s..."
      sleep 5
    fi
  done

  if [ "$migration_ok" = true ]; then
    echo "[run-backend] Migrations complete, starting backend..."
  else
    echo "[run-backend] Migrations failed after $max_attempts attempts, starting backend anyway..."
  fi
fi

run_service annix-backend pnpm start:dev
