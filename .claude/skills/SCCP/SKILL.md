---
name: SCCP
description: Squash Commit Cherry-Pick — take all current work in a claude/ worktree, fold it into exactly ONE commit, and cherry-pick that commit onto the main checkout. This is the worktree handoff, NOT a push — it never runs git push. Use when the user says "SCCP", "squash and cherry-pick to main", or wants worktree work synced to main as a single commit.
---

# SCCP — Squash, Commit, Cherry-Pick to main

The worktree handoff in one step: everything currently in this `claude/<name>`
worktree becomes a single commit, which is then cherry-picked onto the `main`
checkout so the dev swarm (which serves `main`) sees the change.

**This is NOT a push.** SCCP commits locally and cherry-picks locally only.
It must never run `git push`. Pushing `main` is owned by a separate process
and needs its own explicit instruction (see the Critical Git Rules in
`CLAUDE.md`). Cherry-picking to `main` IS this session's handoff — once done,
treat the work as landed, not "pending deploy".

## When to run

The user typed `/SCCP`, or asked to "squash and cherry-pick to main", or to
sync the current worktree work onto `main` as one commit.

## Preconditions

- Current branch must be a `claude/...` worktree branch, never `main`. Confirm
  with `git branch --show-current`. If on `main`, stop and tell the user.
- There must be work to ship — either uncommitted changes, or commits on this
  branch ahead of `origin/main`.

## Procedure

1. **Locate the main checkout.** `git worktree list` — the entry marked
   `[main]` is the target checkout (typically `C:/Users/AndrewB/annix`). Call
   it `$MAIN`.

2. **House-rules check before committing** (same as a normal commit):
   - Bump the app version constant for any functional change (see the App
     Versioning table in `CLAUDE.md`) — minor for a new page/feature, patch
     for a fix/enhancement. Fold the bump into the same commit.
   - New user-facing feature → its How-To guide belongs in the same commit
     (Stock Control). If you consciously skip it, note why.
   - Run Biome on the staged files from the repo root: `pnpm biome check
     --staged --write`. If this worktree has no `node_modules`, biome is
     missing — `pnpm install` first (the binary lives in `$MAIN/node_modules`
     but the pre-commit hook resolves biome from the worktree).

3. **Produce exactly ONE commit:**
   - Stage the intended files explicitly with `git add <paths>` (don't blanket-add).
   - **Zero existing commits ahead of `origin/main`** → make one commit now.
   - **One existing commit** → amend it with the latest changes
     (`git commit --amend`) if it's still local-only.
   - **Several existing commits** for this one piece of work → squash them into
     one: `git reset --soft $(git merge-base origin/main HEAD)` then a single
     `git commit`. Never leave a trail of small commits.
   - Commit message: semantic and comprehensive, **no AI attribution**, add
     `(ref #N)` only if it directly fixes that issue. Let the pre-commit hook
     run (don't `--no-verify` unless the user explicitly asked).

4. **Cherry-pick onto main.** Take the new commit SHA (`git rev-parse HEAD`) and:
   `git -C "$MAIN" cherry-pick <sha>`
   Cherry-pick does not run the pre-commit hook, so a depless `$MAIN` is fine
   for this step — but `$MAIN` is the running swarm checkout, so it has deps.

5. **Resolve conflicts immediately.** If the cherry-pick conflicts (a parallel
   session touched the same files), resolve in `$MAIN`, `git -C "$MAIN" add`
   the resolved files, and `git -C "$MAIN" cherry-pick --continue`. Do not
   leave a backlog of un-synced commits.

6. **Report.** State the one commit SHA, that it's cherry-picked onto `main`,
   and that the swarm will now serve it. Do NOT describe it as "pending push"
   or ask when to deploy — the handoff is complete. Explicitly confirm that no
   push was performed.

## Hard rules

- One change = one commit = one cherry-pick.
- Never `git push` from this skill.
- Never force-push, never amend a commit that is already on `origin/main`.
- Per-commit cherry-pick: if asked again later for more work, repeat the whole
  procedure for the new commit rather than batching.
