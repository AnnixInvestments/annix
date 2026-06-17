---
name: PBG
description: Push Bypass Gate (OBSOLETE) — the prod deploy gate has been removed. A normal push to main now deploys prod automatically after the staging smoke-test passes, so there is nothing to bypass. Treat /PBG as a normal push.
---

# Push Bypass Gate (/PBG) — obsolete

There is no longer a prod deploy gate to bypass. The nightly required-reviewer
window (`prod-deploy-window.yml`) was removed in favour of a staging-promotion
model: a push to `main` deploys staging first, and on a clean staging deploy it
automatically promotes to prod + test. See [#364](https://github.com/AnnixInvestments/annix/issues/364).

## What to do when the user types /PBG

`/PBG` now means the same thing as `push`. There is no separate approval step,
no `pending_deployments` to approve, and no 03:00 window. Do NOT call any
approval or gate-release API.

1. If there are uncommitted changes the user asked to ship, commit them (one
   commit, biome on staged files, house rules apply).
2. `git push origin HEAD:main` and report the pre-push step timings table.
3. Optionally watch the deploy run: staging deploys first, then prod + test
   promote automatically once the staging health check passes. Report the
   conclusion; on failure surface the run URL and the failing job's tail.

The single push instruction still authorizes exactly one push (house rules).
Never force-push; a non-fast-forward rejection means fetch + rebase + retry.

## If the staging claim is held

If an open feedback PR holds the `on-staging` label, the staging smoke-test is
skipped for the push and prod + test still deploy (the run logs a warning).
Nothing extra to do.
