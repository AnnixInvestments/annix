#!/usr/bin/env bash
set -euo pipefail
# shellcheck source=dev-lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/dev-lib.sh"
run_service annix-backend pnpm start:dev
