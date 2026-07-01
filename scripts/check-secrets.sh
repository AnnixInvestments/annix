#!/bin/bash
# Secret detection for the Annix project.
#
# Two modes, mirroring check-legal-risks.sh:
#   staged  (default) — scans files staged for the current commit. Run from
#                        the pre-commit hook.
#   pushed             — scans files touched by the commits being pushed
#                        (diff against origin/main). Run from the pre-push
#                        hook. This is the backstop that still fires when a
#                        commit was created via rebase/squash or
#                        --no-verify, both of which skip pre-commit.
#
# Patterns are deliberately high-precision (provider-specific credential
# prefixes and connection-string shapes) rather than a generic
# "password=..." match — a broad password/secret/token pattern flags
# dozens of legitimate test fixtures (auth specs use dummy password
# strings) and just trains engineers to reach for --no-verify.

set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

SECRETS_PATTERNS_FILE="$ROOT_DIR/.secret-patterns"
MODE="${1:-staged}"

if [ "$MODE" = "staged" ]; then
  FILES=$(git diff --cached --name-only --diff-filter=ACMR 2>/dev/null || true)
elif [ "$MODE" = "pushed" ]; then
  REMOTE_HEAD=$(git rev-parse origin/main 2>/dev/null || echo "")
  if [ -n "$REMOTE_HEAD" ]; then
    FILES=$(git diff --name-only "$REMOTE_HEAD"..HEAD --diff-filter=ACMR 2>/dev/null || true)
  else
    FILES=""
  fi
else
  FILES=$(git ls-files)
fi

# .env.example / .env.sample / .env.template are meant to hold placeholder
# credentials (e.g. mongodb+srv://user:password@your-cluster...) — exclude
# them from the connection-string pattern below rather than have every
# legitimate template line block a commit.
FILES=$(echo "$FILES" | grep -v -E '(^\.secret-patterns$|pnpm-lock\.yaml|package-lock\.json|^\.gitignore$|^\.githooks/|node_modules/|\.next/|dist/|build/|\.env\.(example|sample|template)$|check-secrets\.sh$)' || true)

if [ -z "$FILES" ]; then
  echo "Secret scan ($MODE): no files to check."
  exit 0
fi

FOUND_SECRETS=0

read_file() {
  local file="$1"
  if [ "$MODE" = "staged" ]; then
    # Read the staged blob so uncommitted working-tree edits can't hide a match.
    git show ":$file" 2>/dev/null || true
  else
    cat "$file" 2>/dev/null || true
  fi
}

# Literal fixed-string patterns — for documented, known-safe exceptions.
if [ -f "$SECRETS_PATTERNS_FILE" ]; then
  while IFS= read -r pattern || [ -n "$pattern" ]; do
    case "$pattern" in
      ''|\#*) continue ;;
    esac
    for file in $FILES; do
      if [ -f "$file" ] && read_file "$file" | grep -qF "$pattern"; then
        echo "ERROR: Potential secret found in $file"
        echo "  Pattern: $pattern"
        FOUND_SECRETS=1
      fi
    done
  done < "$SECRETS_PATTERNS_FILE"
fi

PATTERNS=(
  'AKIA[0-9A-Z]{16}'               # AWS access key ID
  'JWT_SECRET.*[a-f0-9]{64}'       # JWT secret (64-char hex)
  'BEGIN.*PRIVATE KEY'             # Private key material
  'FlyV1.*fm2_'                    # Fly.io token
  'AIza[0-9A-Za-z_-]{35}'         # Google API key
  'sk-[a-zA-Z0-9]{48}'            # OpenAI API key
  'ghp_[a-zA-Z0-9]{36}'           # GitHub personal access token
  'xoxb-[0-9]{10,}-[0-9]{12,}'    # Slack bot token
  "[\"']npg_[A-Za-z0-9]{10,}"     # Neon Postgres password (quote-prefixed — avoids matching identifiers like pg_largeobject after a \n line break)
  '[a-zA-Z][a-zA-Z0-9+.-]*://[^:/[:space:]]+:[^@/[:space:]]+@'  # scheme://user:pass@host connection string
)

for pattern in "${PATTERNS[@]}"; do
  for file in $FILES; do
    if [ -f "$file" ] && read_file "$file" | grep -qE "$pattern"; then
      echo "ERROR: Potential secret pattern found in $file"
      echo "  Pattern type: $(printf '%.60s' "$pattern")..."
      FOUND_SECRETS=1
    fi
  done
done

if [ "$FOUND_SECRETS" -eq 1 ]; then
  echo ""
  echo "=========================================="
  echo "SECRET SCAN FAILED ($MODE): potential secret detected"
  echo "=========================================="
  echo ""
  echo "If this is a false positive, add the literal string to .secret-patterns"
  echo "with a comment explaining why it's safe."
  echo ""
  exit 1
fi

echo "Secret scan ($MODE) passed - no secrets detected."
