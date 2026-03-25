#!/bin/bash
# Legal risk detection for the Annix project
# Scans staged/changed files for content that could create legal exposure
# Run manually or as part of the pre-push hook

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

ERRORS=0
WARNINGS=0

MODE="${1:-staged}"

if [ "$MODE" = "staged" ]; then
  FILES=$(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null | grep -E '\.(ts|tsx|js|jsx|json|html|md)$' || true)
elif [ "$MODE" = "pushed" ]; then
  REMOTE_HEAD=$(git rev-parse origin/main 2>/dev/null || echo "")
  if [ -n "$REMOTE_HEAD" ]; then
    FILES=$(git diff --name-only "$REMOTE_HEAD"..HEAD --diff-filter=ACMR 2>/dev/null | grep -E '\.(ts|tsx|js|jsx|json|html|md)$' || true)
  else
    FILES=$(git ls-files '*.ts' '*.tsx' '*.js' '*.jsx' '*.json' '*.html' '*.md')
  fi
else
  FILES=$(git ls-files '*.ts' '*.tsx' '*.js' '*.jsx' '*.json' '*.html' '*.md')
fi

if [ -z "$FILES" ]; then
  exit 0
fi

FILTERED_FILES=$(echo "$FILES" | grep -v 'node_modules/' | grep -v 'dist/' | grep -v '.next/' | grep -v 'check-legal-risks' | grep -v 'CLAUDE.md' || true)

if [ -z "$FILTERED_FILES" ]; then
  exit 0
fi

echo -e "${CYAN}Scanning for legal risks...${NC}"

check_pattern() {
  local label="$1"
  local severity="$2"
  local pattern="$3"
  local exclude_pattern="${4:-}"

  local matches
  if [ -n "$exclude_pattern" ]; then
    matches=$(echo "$FILTERED_FILES" | xargs grep -nEi "$pattern" 2>/dev/null | grep -v "$exclude_pattern" || true)
  else
    matches=$(echo "$FILTERED_FILES" | xargs grep -nEi "$pattern" 2>/dev/null || true)
  fi

  if [ -n "$matches" ]; then
    if [ "$severity" = "error" ]; then
      echo -e "${RED}ERROR: $label${NC}"
      ERRORS=$((ERRORS + 1))
    else
      echo -e "${YELLOW}WARNING: $label${NC}"
      WARNINGS=$((WARNINGS + 1))
    fi
    echo "$matches" | head -10
    local total
    total=$(echo "$matches" | wc -l)
    if [ "$total" -gt 10 ]; then
      echo "  ... and $((total - 10)) more"
    fi
    echo ""
  fi
}

check_pattern \
  "Fake .co.za email addresses — use @example.com instead (RFC 2606)" \
  "error" \
  '"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.co\.za"' \
  "\.env\|check-legal\|placeholder\|annix\.co\.za\|sahrc\.org\.za"

check_pattern \
  "Realistic South African phone numbers in test/example data — use +27 11 000 xxxx" \
  "warning" \
  '"\+27 [0-9]{2} [1-9][0-9]{2} [0-9]{4}"' \
  "\.env\|check-legal"

check_pattern \
  "Hardcoded external URLs to standards bodies (ASTM, ISO, AWWA, etc.)" \
  "warning" \
  'https?://(www\.)?(astm\.org|iso\.org|awwa\.org|asme\.org|api\.org|nace\.org|en-standard\.eu|plasticpipe\.org)' \
  ""

check_pattern \
  "Direct Anthropic/Claude API usage — must use Gemini via AiChatService" \
  "error" \
  '(new Anthropic|import.*from.*@anthropic|ClaudeChatProvider|providerOverride.*claude)' \
  "node_modules\|ai-providers/"

check_pattern \
  "Sage API called without rate limiter — all calls must go through sageRateLimiter" \
  "error" \
  'fetch\(.*sage\.(one|cloud|accounting)' \
  "sage-rate-limiter"

check_pattern \
  "Native Date usage — must use Luxon via datetime module" \
  "warning" \
  '(new Date\(|Date\.now\(\)|Date\.parse\()' \
  "\.spec\.\|\.test\.\|\.e2e-spec\.\|\.migration\.\|node_modules\|datetime\|\.md:\|scripts/"

check_pattern \
  "Potential secret or credential in source code" \
  "error" \
  '(AKIA[0-9A-Z]{16}|sk-[a-zA-Z0-9]{48}|ghp_[a-zA-Z0-9]{36})' \
  ""

check_pattern \
  "Hardcoded localhost URL that may need environment variable" \
  "warning" \
  'https?://localhost:[0-9]+' \
  "\.env\|\.spec\.\|\.test\.\|check-legal\|\.md:\|\.claude-swarm\|config\.json"

if [ "$ERRORS" -gt 0 ]; then
  echo -e "${RED}Found $ERRORS error(s) and $WARNINGS warning(s). Fix errors before pushing.${NC}"
  exit 1
elif [ "$WARNINGS" -gt 0 ]; then
  echo -e "${YELLOW}Found $WARNINGS warning(s). Review before pushing.${NC}"
  exit 0
else
  echo -e "${GREEN}No legal risks detected.${NC}"
  exit 0
fi
