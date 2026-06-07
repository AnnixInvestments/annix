#!/bin/bash
# Flags oversized frontend source files for review (issue #267 Phase 4).
#
# Large single-file React components (the step/form monoliths) dominate the
# frontend build's SWC parse cost and resist tree-shaking. Any file over the
# review threshold in annix-frontend/src/ should be looked at for sub-renderer
# / helper extraction — see docs/frontend-conventions.md "Component size budget".
#
# NON-BLOCKING: this only WARNS so an oversized file is noticed in review; it
# never fails the push. Build-cost reduction is a judgement call, not a gate.

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

SRC_DIR="annix-frontend/src"
REVIEW_THRESHOLD_KB=200

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

if [ ! -d "$SRC_DIR" ]; then
  exit 0
fi

threshold_bytes=$((REVIEW_THRESHOLD_KB * 1024))
offenders=$(find "$SRC_DIR" -type f \( -name '*.ts' -o -name '*.tsx' \) -size +"${threshold_bytes}"c 2>/dev/null | sort)

if [ -z "$offenders" ]; then
  echo -e "${GREEN}✓ No frontend source files over ${REVIEW_THRESHOLD_KB} KB.${NC}"
  exit 0
fi

echo -e "${YELLOW}⚠ Frontend source files over ${REVIEW_THRESHOLD_KB} KB — review for sub-renderer/helper extraction (docs/frontend-conventions.md \"Component size budget\"):${NC}"
while IFS= read -r f; do
  kb=$(( $(wc -c < "$f") / 1024 ))
  echo -e "${YELLOW}  - ${f} (${kb} KB)${NC}"
done <<< "$offenders"
echo -e "${YELLOW}  (warning only — does not block the push)${NC}"
exit 0
