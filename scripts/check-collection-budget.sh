#!/bin/bash
# Tracks MongoDB collection growth on the Atlas M0 free tier (hard cap: 500
# collections). Every @Schema / SchemaFactory.createForClass class maps to a
# collection. New collections are fine while there is comfortable headroom —
# the check only reports them. It does NOT block a push until the defined count
# is APPROACHING the cap (>= BLOCK_THRESHOLD); only then must a new collection
# be a deliberate, recorded decision rather than an accidental by-product.
#
# When near the cap, proceed with a genuinely-needed new collection by adding a
# trailer to one of the commits being pushed:
#
#     Allow-New-Collection: <short reason>
#
# or do a one-off override with ALLOW_NEW_COLLECTIONS=1 git push.

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

M0_COLLECTION_CAP=500
# Only require acknowledgement for new collections once the defined count
# reaches this "approaching the cap" zone. Below it, new collections pass freely.
BLOCK_THRESHOLD=480
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

if [ "$current_count" -lt "$BLOCK_THRESHOLD" ]; then
  echo -e "${GREEN}Within budget (${current_count}/${M0_COLLECTION_CAP}, ${headroom} headroom) — allowed.${NC}"
  exit 0
fi

acknowledged=0
if [ "${ALLOW_NEW_COLLECTIONS:-0}" = "1" ]; then
  acknowledged=1
fi
if git log "$LOG_RANGE" --format='%B' 2>/dev/null | grep -qiE '^Allow-New-Collection:'; then
  acknowledged=1
fi

if [ "$acknowledged" = "1" ]; then
  echo -e "${GREEN}Acknowledged — new collection(s) approved despite nearing the cap.${NC}"
  exit 0
fi

echo ""
echo -e "${RED}Blocked:${NC} only ${headroom} collection(s) of headroom left before the ${M0_COLLECTION_CAP} M0 cap, and we are staying on M0."
echo "This close to the cap, every new collection must be deliberate. First consider"
echo "whether the data belongs as an embedded sub-document on an existing schema —"
echo "counters, config, and single-row settings usually do."
echo ""
echo "If a new collection is genuinely the right model, record the decision with a"
echo "trailer on one of the commits being pushed:"
echo ""
echo "    Allow-New-Collection: <short reason>"
echo ""
echo "  git commit --amend                  # add the trailer to the last commit, or"
echo "  ALLOW_NEW_COLLECTIONS=1 git push     # one-off override"
exit 1
