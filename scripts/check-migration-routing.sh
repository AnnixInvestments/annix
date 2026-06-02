#!/bin/bash
# Stops an Orbit migration from being placed in the core migrations directory.
#
# Annix Orbit runs on its own MongoDB cluster (ORBIT_MONGODB_URI). The deploy
# release command runs:
#   - migrations in annix-backend/migrations-mongo/        against the CORE cluster
#   - migrations in annix-backend/migrations-mongo-orbit/  against the ORBIT cluster
#
# So a migration that touches Orbit collections (cv_assistant_*, orbit_*,
# tier_invite, seeker_usage_counter) but sits in the core directory runs against
# the wrong database: at best it does nothing (the Orbit data is not on core),
# at worst a destructive operation mutates the core production ERP database.
#
# Every migration in the core directory is scanned: the core directory must
# never contain a migration that references Orbit collections. (All Orbit
# migrations were moved to migrations-mongo-orbit/ in the Orbit-split work; the
# data was moved core->Orbit by an out-of-band sync, not by these migrations,
# so the changelog is not a historical record we need to preserve.)

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

CORE_DIR="annix-backend/migrations-mongo"
ORBIT_DIR="annix-backend/migrations-mongo-orbit"
ORBIT_COLLECTION_PATTERN='cv_assistant_[a-z0-9_]+|orbit_[a-z0-9_]+|tier_invites?|seeker_usage_counters?'

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

core_migrations=$(git ls-files "$CORE_DIR" 2>/dev/null | grep -E "^${CORE_DIR}/[0-9].*\.ts$" || true)

if [ -z "$core_migrations" ]; then
  echo -e "${GREEN}Migration routing OK${NC} — no core migrations to check."
  exit 0
fi

offenders=""
while IFS= read -r file; do
  [ -z "$file" ] && continue
  [ -f "$file" ] || continue
  if grep -qE "$ORBIT_COLLECTION_PATTERN" "$file"; then
    hit=$(grep -oE "$ORBIT_COLLECTION_PATTERN" "$file" | sort -u | head -3 | paste -sd ', ' -)
    offenders="${offenders}  - ${file}  (references: ${hit})\n"
  fi
done <<EOF
$core_migrations
EOF

if [ -n "$offenders" ]; then
  echo -e "${RED}Migration routing check FAILED${NC}"
  echo ""
  echo "These migrations live in ${CORE_DIR}/ (the CORE cluster) but reference"
  echo "Orbit collections, so the deploy would run them against the wrong database:"
  echo ""
  echo -e "$offenders"
  echo "Orbit migrations belong in ${ORBIT_DIR}/. To fix:"
  echo "  1. git mv each file into ${ORBIT_DIR}/"
  echo "  2. create future Orbit migrations with: pnpm migrate:orbit:create <name>"
  echo "  3. the deploy release command already runs migrate:orbit:up against the"
  echo "     Orbit cluster (ORBIT_MONGODB_URI) per environment."
  echo ""
  echo "Core (ERP) migrations stay in ${CORE_DIR}/ as before."
  exit 1
fi

echo -e "${GREEN}Migration routing OK${NC} — core migrations reference no Orbit collections."
exit 0
