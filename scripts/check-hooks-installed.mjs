#!/usr/bin/env node
/**
 * Verifies that git's core.hooksPath points at the project's .githooks/
 * directory, so that pre-commit and pre-push checks actually run.
 *
 * If the config has drifted, this script attempts to restore it and warns
 * loudly that a safety regression was just patched. If the restore fails
 * (e.g. .git is read-only), it fails non-zero with an actionable message
 * so the developer can fix it manually.
 *
 * Wire-in points:
 *   - package.json "prepare" — runs on every `pnpm install`
 *   - package.json "dev"     — runs before `claude-swarm start`
 *
 * Run standalone:
 *   node scripts/check-hooks-installed.mjs
 */

import { execSync } from "node:child_process";

const EXPECTED = ".githooks";

const gitConfigGet = (key) => {
  try {
    return execSync(`git config --get ${key}`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
};

const gitConfigSet = (key, value) => {
  execSync(`git config ${key} ${value}`, { stdio: "ignore" });
};

const isGitRepo = () => {
  try {
    execSync("git rev-parse --git-dir", {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
};

if (!isGitRepo()) {
  // Not a git repo (fresh clone before .git exists, CI without checkout, etc.) —
  // nothing to verify, exit cleanly.
  process.exit(0);
}

const current = gitConfigGet("core.hooksPath");

if (current === EXPECTED) {
  process.exit(0);
}

try {
  gitConfigSet("core.hooksPath", EXPECTED);
} catch (err) {
  process.stderr.write(`
[hooks-check] FAILED to restore core.hooksPath = ${EXPECTED}.

The pre-commit and pre-push hooks will NOT run. Commits and pushes can
silently bypass biome checks, type-checks, and tests.

Error: ${err.message}

Fix manually:
  git config core.hooksPath .githooks
`);
  process.exit(1);
}

process.stderr.write(`
[hooks-check] Restored core.hooksPath = "${EXPECTED}"
  (was: ${current === null ? "<not set>" : `"${current}"`})

This was a silent safety regression — the pre-commit and pre-push hooks
weren't installed. They are now. Investigate what cleared the setting.
`);

process.exit(0);
