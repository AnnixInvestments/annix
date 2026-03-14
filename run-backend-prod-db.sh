#!/usr/bin/env bash
set -euo pipefail

# Start the backend with production database connection.
# Run setup-prod-db.sh first to fetch credentials.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROD_DB_ENV="$SCRIPT_DIR/annix-backend/.env.prod-db"

if [ ! -f "$PROD_DB_ENV" ]; then
  echo "Production DB config not found. Running setup-prod-db.sh first..."
  "$SCRIPT_DIR/setup-prod-db.sh"
fi

echo ""
echo "========================================"
echo "  PRODUCTION DATABASE MODE"
echo "  All changes affect LIVE data!"
echo "========================================"
echo ""

set -a
while IFS= read -r line; do
  line="${line#"${line%%[![:space:]]*}"}"
  if [ -n "$line" ] && [ "${line:0:1}" != "#" ]; then
    export "$line"
  fi
done < "$PROD_DB_ENV"
set +a

# shellcheck source=dev-lib.sh
. "$SCRIPT_DIR/dev-lib.sh"
run_service annix-backend pnpm start:dev
