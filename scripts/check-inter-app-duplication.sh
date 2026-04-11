#!/bin/bash
# Inter-app duplication detector for the Annix monorepo.
# Flags patterns that indicate shared code is being copied per-app instead of
# placed in a canonical shared location. See CLAUDE.md §"Discovery-first protocol"
# and docs/shared-registry.md.
#
# Run modes:
#   staged  — scan files staged for commit (default, used by pre-commit)
#   pushed  — scan files in the range being pushed (used by pre-push)
#   all     — scan the entire tracked tree (used manually)

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

MODE="${1:-staged}"

if [ "$MODE" = "staged" ]; then
  FILES=$(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null | grep -E '\.(ts|tsx)$' || true)
elif [ "$MODE" = "pushed" ]; then
  REMOTE_HEAD=$(git rev-parse origin/main 2>/dev/null || echo "")
  if [ -n "$REMOTE_HEAD" ]; then
    FILES=$(git diff --name-only "$REMOTE_HEAD"..HEAD --diff-filter=ACMR 2>/dev/null | grep -E '\.(ts|tsx)$' || true)
  else
    FILES=$(git ls-files '*.ts' '*.tsx')
  fi
else
  FILES=$(git ls-files '*.ts' '*.tsx')
fi

if [ -z "$FILES" ]; then
  exit 0
fi

FILTERED_FILES=$(echo "$FILES" | grep -v 'node_modules/' | grep -v 'dist/' | grep -v '.next/' | grep -v '.spec.ts' | grep -v '.test.ts' || true)

if [ -z "$FILTERED_FILES" ]; then
  exit 0
fi

APP_PATTERN='annix-frontend/src/app/(stock-control|au-rubber|cv-assistant|annix-rep|comply-sa|fieldflow)'

echo -e "${CYAN}Running inter-app duplication checks...${NC}"

for f in $FILTERED_FILES; do
  [ -f "$f" ] || continue

  # Rule 1: cross-app relative imports (hard error) — only applies to frontend app
  # trees, where apps must never reach into each other. Backend modules under
  # annix-backend/src/ legitimately share services via relative imports.
  if echo "$f" | grep -qE "$APP_PATTERN/"; then
    if grep -qE "from ['\"]\\.\\./(\\.\\./)+(stock-control|au-rubber|cv-assistant|annix-rep|comply-sa|fieldflow)/" "$f" 2>/dev/null; then
      echo -e "${RED}ERROR${NC} $f"
      echo "  Cross-app relative import detected. Apps must never reach into each other."
      echo "  Move the shared code to one of the canonical locations in docs/shared-registry.md:"
      echo "    - packages/product-data/<domain>/    (shared reference data)"
      echo "    - annix-backend/src/lib/             (backend utilities)"
      echo "    - annix-frontend/src/app/components/ (shared components)"
      echo "    - annix-frontend/src/app/lib/        (frontend utilities)"
      ERRORS=$((ERRORS + 1))
    fi
  fi

  # Rule 2: hardcoded lookup table with 5+ entries inside an app-specific folder (warning)
  if echo "$f" | grep -qE "$APP_PATTERN/"; then
    if grep -qE '^\s*(export\s+)?const\s+[A-Z][A-Z0-9_]+\s*(:\s*[^=]+)?=\s*\{' "$f" 2>/dev/null; then
      ENTRY_COUNT=$(grep -cE '^\s*("[^"]+"|[0-9]+|[a-zA-Z_]+)\s*:\s*' "$f" 2>/dev/null || echo 0)
      if [ "$ENTRY_COUNT" -gt 5 ]; then
        echo -e "${YELLOW}WARNING${NC} $f"
        echo "  App-specific file contains a lookup table / constant map with $ENTRY_COUNT+ entries."
        echo "  If this data is (or could become) relevant to any other app, move it to:"
        echo "    - packages/product-data/<domain>/  (preferred for reference data)"
        echo "    - annix-frontend/src/app/lib/      (for frontend-only utilities)"
        echo "  Reference: docs/shared-registry.md"
        WARNINGS=$((WARNINGS + 1))
      fi
    fi
  fi

  # Rule 3: new file in app-specific lib/ or utils/ folder (warning — these folders should not exist)
  if echo "$f" | grep -qE "$APP_PATTERN/(lib|utils|helpers)/"; then
    echo -e "${YELLOW}WARNING${NC} $f"
    echo "  File placed in an app-specific lib/utils/helpers folder."
    echo "  Shared code should live in annix-frontend/src/app/lib/ (canonical location)."
    echo "  Reference: docs/shared-registry.md §Red-flag locations"
    WARNINGS=$((WARNINGS + 1))
  fi

  # Rule 4: backend services with per-app copies in app module lib/ folders
  if echo "$f" | grep -qE 'annix-backend/src/[a-z-]+/lib/'; then
    echo -e "${YELLOW}WARNING${NC} $f"
    echo "  Backend file placed in an app-module lib/ folder."
    echo "  Shared backend code belongs in annix-backend/src/lib/ or a standalone module."
    echo "  Reference: docs/shared-registry.md §Red-flag locations"
    WARNINGS=$((WARNINGS + 1))
  fi
done

# Rule 5: check for new files in canonical shared locations without a registry update
REGISTRY_UPDATED=0
if echo "$FILES" | grep -q 'docs/shared-registry.md'; then
  REGISTRY_UPDATED=1
fi

CANONICAL_ADDITIONS=$(echo "$FILTERED_FILES" | grep -E '^(packages/product-data/|annix-backend/src/lib/|annix-backend/src/storage/|annix-backend/src/email/|annix-backend/src/ai-chat/|annix-backend/src/notifications/|annix-backend/src/reference-data/|annix-frontend/src/app/components/|annix-frontend/src/app/lib/)' || true)

if [ -n "$CANONICAL_ADDITIONS" ] && [ "$REGISTRY_UPDATED" -eq 0 ]; then
  NEW_CANONICAL=$(git diff --cached --name-only --diff-filter=A 2>/dev/null | grep -E '^(packages/product-data/|annix-backend/src/lib/|annix-frontend/src/app/components/|annix-frontend/src/app/lib/)' || true)
  if [ "$MODE" = "pushed" ] && [ -n "$REMOTE_HEAD" ]; then
    NEW_CANONICAL=$(git diff --name-only "$REMOTE_HEAD"..HEAD --diff-filter=A 2>/dev/null | grep -E '^(packages/product-data/|annix-backend/src/lib/|annix-frontend/src/app/components/|annix-frontend/src/app/lib/)' || true)
  fi
  if [ -n "$NEW_CANONICAL" ]; then
    echo -e "${YELLOW}WARNING${NC} New files added to canonical shared locations without updating docs/shared-registry.md:"
    echo "$NEW_CANONICAL" | sed 's/^/    /'
    echo "  Please update docs/shared-registry.md so future sessions can discover these modules."
    WARNINGS=$((WARNINGS + 1))
  fi
fi

echo ""
if [ "$ERRORS" -gt 0 ]; then
  echo -e "${RED}Inter-app duplication check: $ERRORS error(s), $WARNINGS warning(s)${NC}"
  echo "Errors block the push. Fix the cross-app imports above."
  exit 1
elif [ "$WARNINGS" -gt 0 ]; then
  echo -e "${YELLOW}Inter-app duplication check: $WARNINGS warning(s)${NC}"
  echo "Warnings do not block the push, but please review before committing."
  exit 0
else
  echo -e "${CYAN}Inter-app duplication check: clean${NC}"
  exit 0
fi
