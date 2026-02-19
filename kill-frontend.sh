#!/usr/bin/env bash
# shellcheck source=dev-lib.sh
. "$(dirname "${BASH_SOURCE[0]}")/dev-lib.sh"
kill_service "${ANNIX_FRONTEND_PORT:-3000}"
