# Parallel Claude Workflows

Options for speeding up development using Claude in parallel. Organised by cost.

**Note:** Andy's Max subscription provides ~20x the usage limits of the standard Pro plan, which makes running multiple concurrent sessions practical.

---

## The Conflict Problem

Even with careful coordination, parallel Claude sessions in the same functional area will cause conflicts. Two sessions editing related files simultaneously creates merge headaches.

**Solution:** Use short-lived branches with frequent rebasing back to main.

---

## Recommended Approach: Branch-Based Parallel Work

Each Claude session works on its own branch, then rebases to main when done.

**Workflow:**
```
1. Claude session creates branch: git checkout -b claude/feature-name
2. Claude implements the feature
3. Claude rebases onto main: git fetch origin && git rebase origin/main
4. Human reviews and merges to main
5. Delete branch
```

**Why this works:**
- No live conflicts during development
- Trunk-based development preserved (branches are short-lived, hours not days)
- Each session has full autonomy
- Conflicts resolved at merge time, not during coding

**Naming convention:**
- `claude/andy-rfq-filters` - Andy's Claude working on RFQ filters
- `claude/nick-boq-export` - Nick's Claude working on BOQ export

---

## Planned: Parallel Claude Manager TUI

A TypeScript-based TUI tool will simplify this workflow - no git knowledge required.

**Branch management:**
- Show all `claude/*` branches with status (ahead/behind main)
- Switch to a branch and spin up the app to test
- Approve changes: rebase onto main, fast-forward merge (no merge commits)
- Delete merged branches

**Session monitoring:**
- Track all running Claude Code sessions across terminals
- Show status of each: Working, Complete, Error, Idle
- Preview recent output without switching terminals
- Highlight sessions needing attention

**Why TypeScript:** Single implementation works on both macOS and Windows.

See [GitHub Issue #34](https://github.com/nbarrett/Annix-sync/issues/34) for details and progress.

---

## Terminal Allocation

Realistically, each person has limited terminals:

| Terminal | Purpose |
|----------|---------|
| 1 | Running app (`./run-dev.sh` or `run-dev.ps1`) |
| 2 | Claude Code session (primary work) |
| 3 | Claude Code session (secondary/research) - optional |

**The running app terminal is unavailable for Claude.** This means:
- Andy: 1-2 Claude sessions + 1 app terminal
- Nick: 1-2 Claude sessions + 1 app terminal
- Total: 2-4 parallel Claude sessions (not 4-6)

---

## Do Sessions Need Separate Builds/Ports?

**Short answer: No, if using branch-based workflow.**

With branch-based parallel work:
- Only one person runs the app at a time (on their machine)
- Claude sessions on branches don't need to run the app to make changes
- Testing happens after rebasing to main

**When you would need separate ports:**
- Running multiple full app instances simultaneously
- Live testing changes from multiple branches at once

This is rarely needed. The simpler approach:
1. Make changes on branch
2. Switch to main, pull latest
3. Rebase your branch
4. Run app to test
5. Merge if good

---

## If You Do Need Multiple Instances

Current port configuration:
- Frontend: hardcoded to port 3000
- Backend: uses `PORT` env var (defaults to 4001)
- Database: shared (5432)

**To run a second instance, you'd need:**

```bash
# Instance 2 - different ports
PORT=4002 NEXT_PUBLIC_API_URL=http://localhost:4002 pnpm dev -p 3001
```

**Script changes required:**
- `run-dev.sh` / `run-dev.ps1` would need an instance number parameter
- Frontend `package.json` scripts would need port to be configurable
- Each instance needs its own log files

**This adds complexity.** Only pursue if branch-based workflow proves insufficient.

---

## Included in Max ($200/month)

### Option 1: Branch-Per-Session (Recommended)

Each Claude session works on its own branch.

**How it works:**
- Morning: agree on task allocation
- Each Claude session creates a branch for its task
- Work independently with no coordination needed
- Rebase and merge throughout the day
- Keep branches short-lived (hours, not days)

**Example day:**
| Session | Owner | Branch | Task |
|---------|-------|--------|------|
| 1 | Andy | `claude/andy-filters` | New filter component |
| 2 | Andy | `claude/andy-docs` | API documentation |
| 3 | Nick | `claude/nick-validation` | Backend validation |

**Merge sequence:**
1. Andy finishes filters, rebases onto main, merges
2. Nick rebases validation onto updated main, merges
3. Andy rebases docs onto updated main, merges

---

### Option 2: Research + Implementation Split

One session explores (read-only), another implements.

**How it works:**
- Session 1: "Explore how the pricing calculations work - don't make any changes"
- Session 2: Actually builds the feature

**Why this avoids conflicts:**
- Research session never writes files
- Only implementation session modifies code
- Both can be on main

---

### Option 3: Separated Functional Areas

Each session owns a completely separate area of the codebase.

**Safe boundaries:**
| Area | Owner |
|------|-------|
| `/annix-frontend/src/app/admin/portal/` | Session A |
| `/annix-backend/src/` | Session B |
| `/docs/` | Session C |

**Danger zones (never parallel):**
- `lib/config/rfq/` - calculation modules
- Shared types and interfaces
- Database migrations

---

## Additional Cost Options

These require payment beyond the Max subscription.

### Claude Code GitHub Actions

**What it does:** Assign GitHub issues to @claude, it creates a branch, implements, and opens a PR.

**Cost:** Anthropic API credits (~$3-15 per complex task)

**How it fits:** This IS the branch-based workflow, automated. Claude creates branch, works, opens PR for you to review and merge.

**Links:**
- [Official docs](https://code.claude.com/docs/en/github-actions)

---

### GitHub Copilot Coding Agent

**What it does:** Assign issues to Copilot, it works autonomously on a branch and opens draft PRs.

**Cost:** GitHub Copilot subscription ($10-39/month)

---

### Devin

**What it does:** Autonomous AI developer for larger tasks.

**Cost:** $20-500/month

---

## Comparison Summary

| Option | Cost | Conflict Risk | Best For |
|--------|------|---------------|----------|
| Branch-per-session | Included | Low | Most parallel work |
| Research + Implementation | Included | None | Complex features |
| Separated areas | Included | Low | Clear domain boundaries |
| Claude GitHub Actions | API usage | None | Automated PRs |
| Copilot Agent | $10-39/mo | None | Quick autonomous tasks |

---

## Practical Daily Workflow

**Morning:**
1. Quick sync: "I'm working on X, you're working on Y"
2. Each person creates branches for their tasks
3. Run app in one terminal, Claude in another

**During the day:**
1. Claude works on branch
2. When task complete, rebase onto main
3. Test locally
4. Merge to main
5. Notify other person: "Merged X, pull when ready"
6. Start next task on new branch

**End of day:**
1. Merge any completed work
2. Rebase any in-progress branches onto main
3. Push branches (even incomplete) for backup

---

## Avoiding Issues

1. **Keep branches short-lived** - hours not days
2. **Rebase frequently** - at least 2-3 times per day
3. **Communicate merges** - "Just merged X, pull before starting Y"
4. **One person owns migrations** - never parallel database changes
5. **Test after rebase** - run the app before merging
6. **Delete merged branches** - keep git clean
