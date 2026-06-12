#!/usr/bin/env node
/**
 * Pushes the current HEAD to the pre-main scratch branch, which deploys ONLY
 * the staging environment (annix-app-staging). Production and test are
 * untouched and the work does not reach main. (Test is NOT scratch space —
 * real Orbit users work on annix-app-test.)
 *
 * If an open feedback-widget PR holds the on-staging claim, the run fails
 * with a clear error naming the PR rather than stomping its validation
 * deploy — wait for the PR to release staging, then push again.
 *
 * pre-main is a scratch branch: force-pushes are expected (force-with-lease),
 * its history is not durable, and it is never merged into main. To ship the
 * work for real, push it to main as normal.
 *
 * Pure Node so it runs identically on Windows, macOS and Linux (no bash).
 * See docs/single-environment-deploys.md for when to use this route versus
 * the staging PR route.
 *
 * Run:
 *   node scripts/push-experimental.ts
 */

import { spawnSync } from "node:child_process";

const REMOTE = "origin";
const BRANCH = "pre-main";

const git = (args: string[], stdio: "pipe" | "inherit") =>
  spawnSync("git", args, { stdio, encoding: "utf8" });

const shortSha = git(["rev-parse", "--short", "HEAD"], "pipe").stdout.trim();

git(["fetch", REMOTE, BRANCH], "pipe");

const push = git(
  ["push", REMOTE, `HEAD:refs/heads/${BRANCH}`, `--force-with-lease=refs/heads/${BRANCH}`],
  "inherit",
);

if (push.status !== 0) {
  process.exit(push.status ?? 1);
}

process.stdout.write(`
Pushed ${shortSha} to ${REMOTE}/${BRANCH}.
Deploying to the STAGING environment only (annix-app-staging). Production and test are untouched.
If a feedback-widget PR currently holds the on-staging claim, the run will fail with an error naming the PR.

Watch the run:   https://github.com/AnnixInvestments/annix/actions/workflows/deploy.yml?query=branch%3A${BRANCH}
Staging app:     https://annix-app-staging.fly.dev

Reminder: ${BRANCH} is a scratch branch. To ship this work for real, push it to main as normal.
`);
