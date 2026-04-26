# Contributing to Annix

This document covers the working agreement for PRs, staging, and the
GitHub-native automation that backs them. The default workflow is direct
commits to `main` (see `CLAUDE.md`); PRs are reserved for changes that need
visual review on staging or that the feedback-widget pipeline opens
automatically.

## PR lifecycle

1. **Open the PR against `main`.** It must be rebased on the current
   `origin/main` head — the staging deploy workflow refuses stale branches
   (see "Staging" below).
2. **Staging deploys automatically** if the rebase check passes. The first
   PR to deploy successfully claims staging via the `on-staging` label.
3. **Subsequent PRs queue** rather than overwriting. They get the
   `staging-queued` label and a comment explaining who holds staging.
4. **Visual review on staging** is required before merge. Code review alone
   doesn't catch the regressions that show up in the running app.
5. **Merge or close to release staging** — the next queued PR is woken
   automatically.

## Process rules

Three rules keep the queue moving without a release-manager rota:

- **48h review SLA.** A PR must receive review feedback (or be moved to
  `draft`) within 48 hours of being marked ready. After that it counts
  against the "ready" cap below.
- **Max 2 PRs in `ready for review` at once.** Beyond that, finish or draft
  one before opening another. This prevents the staging queue from growing
  faster than humans can review it.
- **One PR on staging at a time.** The PR holding `on-staging` is the one
  being reviewed. Others wait.

## Label vocabulary

The PR-management automation in `.github/workflows/` reads and writes these
labels. Don't apply them by hand unless you know what the workflows expect.

### Staging lifecycle

| Label | Applied by | Meaning |
|-------|-----------|---------|
| `on-staging` | `deploy-staging.yml` (success) | This PR is currently deployed to `annix-app-staging`. Other PRs queue behind it. Removed on PR close/merge by `staging-release.yml`. |
| `staging-queued` | `deploy-staging.yml` (claim gate) | This PR's staging deploy is waiting for the holder to release. Auto-removed when the next deploy fires. |

### Hygiene

| Label | Applied by | Meaning |
|-------|-----------|---------|
| `behind-main` | `pr-hygiene.yml` (daily) | PR's branch is behind `origin/main`. Comment `/rebase` to fix. |
| `stale-7d` | `pr-hygiene.yml` (daily) | No activity for 7 days. A "still wanted?" comment is posted on first apply. |
| `stale-14d` | `pr-hygiene.yml` (daily) | No activity for 14 days. |
| `stale-21d` | (not applied — auto-close threshold) | At 21 days idle the PR is auto-closed unless `keep` is present. |
| `keep` | Manually | Exempts a PR from the 21-day auto-close. Use when a PR is genuinely paused (waiting on upstream, design decision, etc.) but still wanted. |

### Rebase automation

| Label | Applied by | Meaning |
|-------|-----------|---------|
| `needs-rebase` | Manually or by another workflow | Triggers `pr-rebase.yml`. Same effect as commenting `/rebase`. |
| `rebase-needs-human` | `pr-rebase.yml` (Claude failure) | Claude attempted rebase but couldn't produce a clean, passing resolution. Manual intervention required. |

## Triggers you can use

- **`/rebase` comment on a PR** — runs `pr-rebase.yml`. Claude resolves
  conflicts where possible, runs biome + tsc + tests, and force-pushes.
  Subjective business-logic conflicts may end up with `rebase-needs-human`
  for manual resolution.
- **`/merge #N` comment on a feedback tracker issue** — merges the PR
  after auth/permission checks. See `claude.yml` for the exact contract.

## Staging

One Fly app: `annix-app-staging`. There is no PR-per-environment
provisioning. The `on-staging` claim mechanism exists because:

- Two PRs deploying in the same window used to silently overwrite each
  other.
- A `main`-branch deploy could overwrite the PR a reviewer was looking at.

`deploy.yml`'s `set-environments` job drops `staging` from the matrix
whenever an open PR holds `on-staging`. Production and test deploys are
unaffected — only the staging path waits.

If you genuinely need to push `main` to staging while a PR holds the
claim, ask the holder to merge or close. There is no override flag and
that is intentional.

## When automation fails

- Staging deploy stuck in queue forever — check the holder's PR; if it's
  closed but `on-staging` wasn't removed, run the `staging-release.yml`
  workflow manually with `gh workflow run staging-release.yml`.
- Daily sweep didn't run — check the Actions tab for `pr-hygiene`. The
  cron is `0 8 * * *` UTC, intentionally clustered with other Neon-aware
  jobs (see `CLAUDE.md` cron policy).
- Claude rebase resolution failed — the PR will have `rebase-needs-human`
  applied. Resolve manually and force-push. The label is removed by the
  next successful `pr-rebase` run.

## Feedback-widget PRs

PRs opened automatically by the feedback-widget pipeline are subject to
the same rules — they must rebase before staging will deploy. See
`.github/FEEDBACK_CONTEXT.md` for the full feedback-handling contract,
specifically the **Scope Discipline** section, which is what `pr-rebase.yml`
points Claude at when resolving feedback-PR conflicts.
