---
name: afk
description: Work autonomously through one or more GitHub issues end-to-end while the user is away (AFK). Implement each issue fully, commit incrementally, tick the issue's checkboxes as items complete, and close the issue when done — making every decision without asking. Triggered when the user says they're AFK / going away and wants issues worked unattended.
---

# AFK — autonomous issue execution

The user is away and wants one or more GitHub issues taken from open to
done without any further input. Invoked as `/afk #295 #296` (issue
numbers) or just `/afk` when the issues are clear from context.

## Operating rules while AFK

1. **Make every decision yourself.** Do NOT use AskUserQuestion or stop
   to ask. When an issue is ambiguous, pick the most reasonable
   interpretation, note the assumption in the commit message, and move
   on. A delivered reasonable choice beats a blocked perfect one.
2. **Commit incrementally.** Commit each logical unit of work as you go
   — never one giant commit at the end. The user should be able to read
   the history and see the progression.
3. **Follow project commit conventions:**
   - No AI attribution in commit messages (the pre-commit hook rejects
     `Co-Authored-By: Claude` and `🤖 Generated with`).
   - Use `git commit --only <paths>` to pin the exact files — a
     parallel process in this repo races files into the staging area.
   - Bump `annix-frontend/src/app/stock-control/config/version.ts`
     (patch) when shipping ASCA changes; let the pre-commit hooks
     (biome, ESLint, type-check) run and fix anything they flag.
4. **Verify before committing.** Run the type-check / lint for the area
   touched. If a hook blocks the commit, fix the cause and retry — never
   `--no-verify`.
5. **Tick the issue checkboxes.** As each item in the issue's task list
   is completed, edit the issue body and flip `- [ ]` to `- [x]`. If the
   issue has no checkbox list, convert its task description into one
   first so progress is visible.
6. **Close the issue when fully done.** Add a closing comment that
   lists the commits that resolved it, then close it. If an issue can't
   be fully finished, leave it open with a comment explaining exactly
   what's done and what remains.
7. **Don't push** unless the issue says to, or pushing is the issue's
   deliverable. Leave commits local for the user to review.

## Workflow per issue

1. `gh issue view <n>` — read the full issue.
2. If no `- [ ]` checklist, rewrite the body with one via
   `gh issue edit <n> --body`.
3. Implement, committing each logical step; tick checkboxes as you go.
4. Type-check / lint; resolve any hook failures.
5. When all boxes are ticked: `gh issue comment` with the commit list,
   then `gh issue close <n>`.
6. Move to the next issue.

## End-of-run report

When all issues are done (or blocked), post a single summary to the
user: per issue — done/blocked, the commits, and anything that needed
a judgement call so they can sanity-check it on return.
