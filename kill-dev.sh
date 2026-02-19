#!/bin/bash
# shellcheck source=dev-lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/dev-lib.sh"

echo "Stopping Annix development servers..."
kill_service "${ANNIX_BACKEND_PORT:-4001}"
kill_service "${ANNIX_FRONTEND_PORT:-3000}"
echo "All development processes stopped"
echo ""
echo "Tip: You can restart with ./run-dev.sh"
