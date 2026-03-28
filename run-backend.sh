#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=dev-lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/dev-lib.sh"
cd "$ANNIX_ROOT/annix-backend"
echo "[run-backend] Running database migrations..."
pnpm migration:run
echo "[run-backend] Migrations complete, starting backend..."
run_service annix-backend pnpm start:dev
