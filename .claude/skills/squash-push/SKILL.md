---
name: squash-push
description: Squash all unpushed commits on the current branch into a single commit and push it to origin/main. Use when the user asks to "squash and push", "squash into 1 commit and push", or wants the unpushed history collapsed before shipping.
---

# Squash unpushed commits into one and push

Collapse every commit ahead of `origin/main` into a single commit, then push to `origin/main`. Always trunk-based: push to `origin/main` even from a `claude/*` branch.

## Steps

1. **Fetch first (mandatory).** Stale local refs cause wrong counts.
   ```
   git fetch origin main
   ```

2. **List what will be squashed** (so the user — and the squashed message — reflect reality):
   ```
   git log origin/main..HEAD --oneline
   ```
   Count the lines actually shown. If the count is 0, stop — nothing to squash. If it is 1, there is nothing to squash; just push.

3. **Soft-reset to the base** — this keeps every unpushed commit's changes staged in the index, with nothing committed yet:
   ```
   git reset --soft origin/main
   ```

4. **Sanity-check the index** before committing:
   ```
   git diff --cached --name-only | wc -l        # staged files = the squash payload
   git status --short | grep -vE "^M |^A |^D "   # confirm no surprise unstaged/extra content
   ```
   Untracked (`??`) files are NOT included in the squash — that's expected. Do not `git add` them unless the user asked.

5. **Compose ONE umbrella commit message** that summarises the squashed commits — group by feature/issue, list the notable pieces, keep the conventional-commit type that best fits the bulk of the work. NEVER add AI attribution. Then commit (skip the how-to prompt for a large mixed squash):
   ```
   HOWTO_HOOK=skip git commit -m "<umbrella message>"
   ```
   The pre-commit hook re-runs biome/eslint/tsc/specs over ALL staged files — if it fails, fix the offending file and amend (`git commit --amend`), do not create a second commit.

6. **Push to origin/main** and report the pre-push step timings table (including the wall-clock TOTAL):
   ```
   git push origin HEAD:main
   ```
   If the push is rejected as non-fast-forward (another machine moved `origin/main`), do NOT force-push: `git fetch origin main`, `git rebase origin/main`, resolve, then push again.

7. **Verify the push actually landed** — do not trust "push succeeded" alone. In a swarm/parallel repo a concurrent `git reset` can abandon your fresh commit between commit and push. Re-`git fetch origin main` and confirm `origin/main` contains your change (e.g. `git show origin/main:<file> | grep <marker>`). If it's missing, your commit is in `git reflog` — recover the isolated commit (`git cherry-pick <sha>`) and push again immediately.

## Cautions

- This rewrites local history. The squash bundles **all** unpushed commits — including any from parallel/swarm sessions — into one, losing their granular history. If the unpushed list contains substantial unrelated feature work from other sessions, surface that to the user before squashing so they can confirm.
- The reset target is the remote-tracking `origin/main`. Re-`git fetch` immediately before the reset so it is current; if `origin/main` advanced past your base, prefer a rebase over a blind reset.
- Recovery: the pre-squash commits remain in `git reflog` until garbage-collected — `git reflog` + `git reset --hard <sha>` restores them if the squash was a mistake (before pushing).
