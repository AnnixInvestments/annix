#!/bin/bash
# Guards MongoDB collection growth on the Atlas M0 free tier (hard cap: 500
# collections). Every @Schema / SchemaFactory.createForClass class maps to a
# collection, so this check blocks a push that ADDS new collection definitions
# unless the author explicitly acknowledges it. We are staying on M0, so every
# step toward the cap must be a deliberate, recorded decision rather than an
# accidental by-product of a feature.
#
# To proceed with a genuinely-needed new collection, add a trailer to one of
# the commits being pushed:
#
#     Allow-New-Collection: <short reason>
#
# or do a one-off override with ALLOW_NEW_COLLECTIONS=1 git push.

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

M0_COLLECTION_CAP=500
SCHEMA_PATH="annix-backend/src"

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

DIFF_RANGE="origin/main...HEAD"
LOG_RANGE="origin/main..HEAD"
if ! git rev-parse origin/main >/dev/null 2>&1; then
  DIFF_RANGE="HEAD"
  LOG_RANGE="HEAD"
fi

current_count=$(git grep -hoE 'SchemaFactory\.createForClass\([A-Za-z0-9_]+' HEAD -- "$SCHEMA_PATH" 2>/dev/null \
  | sort -u | grep -c . || true)

headroom=$((M0_COLLECTION_CAP - current_count))
echo "Schema/collection definitions: ${current_count} / ${M0_COLLECTION_CAP} (M0 cap) — ${headroom} headroom"

added=$(git diff "$DIFF_RANGE" -- "$SCHEMA_PATH" 2>/dev/null \
  | grep -E '^\+' \
  | grep -oE 'SchemaFactory\.createForClass\([A-Za-z0-9_]+' \
  | sed -E 's/.*\(//' \
  | sort -u || true)

if [ -z "$added" ]; then
  echo -e "${GREEN}No new collections in this push.${NC}"
  exit 0
fi

new_count=$(printf "%s\n" "$added" | grep -c .)
echo -e "${YELLOW}This push adds ${new_count} new collection definition(s):${NC}"
printf "%s\n" "$added" | sed 's/^/    + /'

acknowledged=0
if [ "${ALLOW_NEW_COLLECTIONS:-0}" = "1" ]; then
  acknowledged=1
fi
if git log "$LOG_RANGE" --format='%B' 2>/dev/null | grep -qiE '^Allow-New-Collection:'; then
  acknowledged=1
fi

if [ "$acknowledged" = "1" ]; then
  echo -e "${GREEN}Acknowledged — new collection(s) approved for this push.${NC}"
  exit 0
fi

echo ""
echo -e "${RED}Blocked:${NC} new collections add pressure to the M0 500-collection cap, and we are staying on M0."
echo "First consider whether the data belongs as an embedded sub-document on an"
echo "existing schema — counters, config, and single-row settings usually do."
echo ""
echo "If a new collection is genuinely the right model, record the decision with a"
echo "trailer on one of the commits being pushed:"
echo ""
echo "    Allow-New-Collection: <short reason>"
echo ""
echo "  git commit --amend                  # add the trailer to the last commit, or"
echo "  ALLOW_NEW_COLLECTIONS=1 git push     # one-off override"
exit 1
