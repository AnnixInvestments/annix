#!/usr/bin/env bash
# Spec test for scripts/howto-pre-commit-prompt.mjs.
# Validates non-interactive paths (TTY paths can't be tested without `expect`):
#   1. HOWTO_HOOK=skip exits 0 immediately.
#   2. No staged files → exits 0.
#   3. Staged file matches a guide's relatedPaths → fall-through warning is printed.
#   4. Staged file does NOT match → no warning, exits 0.
#   5. Auto-discovers guides across multiple apps under annix-frontend/src/app/*/how-to/guides/.
#
# Run: bash scripts/howto-pre-commit-prompt.test.sh
# Exit 0 = all pass, exit 1 = any failure.

set -u

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SCRIPT_UNDER_TEST="${SCRIPT_DIR}/howto-pre-commit-prompt.mjs"

if [ ! -f "$SCRIPT_UNDER_TEST" ]; then
    echo "FAIL: $SCRIPT_UNDER_TEST not found"
    exit 1
fi

PASS=0
FAIL=0

assert_eq() {
    local label="$1"
    local expected="$2"
    local actual="$3"
    if [ "$expected" = "$actual" ]; then
        echo "  PASS: $label"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: $label"
        echo "    expected: $expected"
        echo "    actual:   $actual"
        FAIL=$((FAIL + 1))
    fi
}

assert_contains() {
    local label="$1"
    local needle="$2"
    local haystack="$3"
    if printf '%s' "$haystack" | grep -qF "$needle"; then
        echo "  PASS: $label"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: $label (expected to contain '$needle')"
        echo "    actual: $haystack"
        FAIL=$((FAIL + 1))
    fi
}

assert_not_contains() {
    local label="$1"
    local needle="$2"
    local haystack="$3"
    if printf '%s' "$haystack" | grep -qF "$needle"; then
        echo "  FAIL: $label (expected NOT to contain '$needle')"
        echo "    actual: $haystack"
        FAIL=$((FAIL + 1))
    else
        echo "  PASS: $label"
        PASS=$((PASS + 1))
    fi
}

setup_fixture_repo() {
    local fixture_dir="$1"
    mkdir -p "$fixture_dir"
    cd "$fixture_dir" || exit 1
    git init -q
    git config user.email "test@example.com"
    git config user.name "Test"

    mkdir -p annix-frontend/src/app/app-one/how-to/guides
    mkdir -p annix-frontend/src/app/app-two/how-to/guides
    mkdir -p annix-frontend/src/app/app-one/feature-x
    mkdir -p annix-frontend/src/app/app-two/feature-y
    mkdir -p annix-backend/src/some-module
    mkdir -p scripts

    cp "$SCRIPT_UNDER_TEST" scripts/howto-pre-commit-prompt.mjs

    cat > annix-frontend/src/app/app-one/how-to/guides/guide-one.md <<'EOF'
---
title: Guide One
slug: guide-one
category: Test
roles: [admin]
order: 1
tags: [test]
lastUpdated: 2026-01-01
summary: First test guide.
readingMinutes: 1
relatedPaths: [annix-frontend/src/app/app-one/feature-x, annix-backend/src/some-module]
---

Guide one body.
EOF

    cat > annix-frontend/src/app/app-two/how-to/guides/guide-two.md <<'EOF'
---
title: Guide Two
slug: guide-two
category: Test
roles: [admin]
order: 1
tags: [test]
lastUpdated: 2026-01-01
summary: Second test guide.
readingMinutes: 1
relatedPaths: [annix-frontend/src/app/app-two/feature-y]
---

Guide two body.
EOF

    git add . > /dev/null 2>&1
    git commit -q -m "initial fixture"
}

# === TEST 1: HOWTO_HOOK=skip exits 0 immediately ===
echo "TEST 1: HOWTO_HOOK=skip skips entirely"
TEST_DIR="$(mktemp -d)"
setup_fixture_repo "$TEST_DIR/repo"
HOWTO_HOOK=skip node "$TEST_DIR/repo/scripts/howto-pre-commit-prompt.mjs"
assert_eq "exit code is 0" "0" "$?"
rm -rf "$TEST_DIR"

# === TEST 2: no staged files exits 0 ===
echo ""
echo "TEST 2: no staged files exits 0"
TEST_DIR="$(mktemp -d)"
setup_fixture_repo "$TEST_DIR/repo"
output=$(node "$TEST_DIR/repo/scripts/howto-pre-commit-prompt.mjs" 2>&1)
assert_eq "exit code is 0" "0" "$?"
assert_eq "no warning printed (no staged files)" "" "$output"
rm -rf "$TEST_DIR"

# === TEST 3: staged file matches a guide's relatedPaths → warning printed ===
echo ""
echo "TEST 3: staged file matches a guide → warning printed (no TTY in subshell)"
TEST_DIR="$(mktemp -d)"
setup_fixture_repo "$TEST_DIR/repo"
echo "new content" > "$TEST_DIR/repo/annix-frontend/src/app/app-one/feature-x/changed.txt"
git -C "$TEST_DIR/repo" add annix-frontend/src/app/app-one/feature-x/changed.txt
output=$(node "$TEST_DIR/repo/scripts/howto-pre-commit-prompt.mjs" < /dev/null 2>&1)
assert_eq "exit code is 0 (warn-only when no TTY)" "0" "$?"
assert_contains "mentions affected guide" "guide-one.md" "$output"
assert_contains "mentions trigger file" "changed.txt" "$output"
rm -rf "$TEST_DIR"

# === TEST 4: staged file does NOT match any guide → silent ===
echo ""
echo "TEST 4: staged file does not match any guide → silent"
TEST_DIR="$(mktemp -d)"
setup_fixture_repo "$TEST_DIR/repo"
echo "new content" > "$TEST_DIR/repo/annix-backend/src/unrelated.ts"
git -C "$TEST_DIR/repo" add annix-backend/src/unrelated.ts
output=$(node "$TEST_DIR/repo/scripts/howto-pre-commit-prompt.mjs" < /dev/null 2>&1)
assert_eq "exit code is 0" "0" "$?"
assert_eq "no output (no matching guide)" "" "$output"
rm -rf "$TEST_DIR"

# === TEST 5: auto-discovers guides across multiple apps ===
echo ""
echo "TEST 5: auto-discovers guides across multiple apps"
TEST_DIR="$(mktemp -d)"
setup_fixture_repo "$TEST_DIR/repo"
echo "new content" > "$TEST_DIR/repo/annix-frontend/src/app/app-two/feature-y/changed.txt"
git -C "$TEST_DIR/repo" add annix-frontend/src/app/app-two/feature-y/changed.txt
output=$(node "$TEST_DIR/repo/scripts/howto-pre-commit-prompt.mjs" < /dev/null 2>&1)
assert_eq "exit code is 0" "0" "$?"
assert_contains "mentions guide-two from app-two" "guide-two.md" "$output"
assert_not_contains "does NOT mention guide-one (app-one was not staged)" "guide-one.md" "$output"
rm -rf "$TEST_DIR"

echo ""
echo "============================================"
echo "Results: $PASS passed, $FAIL failed"
echo "============================================"

if [ "$FAIL" -gt 0 ]; then
    exit 1
fi
exit 0
