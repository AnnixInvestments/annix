---
name: unstick-dev
description: Diagnose and recover a stuck local dev environment. Detects hung next-server, dead backend, swarm registry desync, runaway CPU loops, orphan agent CLI sessions, and stale git worktrees. Reports findings; kills runaways only with confirmation.
---

# Unstick Dev

When the user reports the local dev environment is misbehaving — frontend not loading, page blank, "swarm not working", curl hangs, hung tabs — run this diagnostic playbook end-to-end and report findings before killing anything.

## When to invoke

User says any of:
- "I can't get the page to load"
- "frontend is hung", "nothing is loading", "page is blank"
- "swarm is broken / not working"
- "kill the orphan sessions", "fix dev"
- The user asks why dev / app is slow or unresponsive

Don't invoke for application-level bugs (specific 500s, broken features). Those need code investigation, not infrastructure recovery.

## Steps

Run all checks first, then report. **Do not kill processes until the user confirms.** The diagnosis matters as much as the fix.

### 1. Health probes (parallel curls with short timeout)

```bash
curl -sS --max-time 5 -o /dev/null -w "frontend / : %{http_code} in %{time_total}s\n" http://localhost:3000/
curl -sS --max-time 5 -o /dev/null -w "frontend cv: %{http_code} in %{time_total}s\n" http://localhost:3000/annix-orbit
curl -sS --max-time 5 -o /dev/null -w "backend  / : %{http_code} in %{time_total}s\n" http://localhost:4001/
```

- `200`/`404`/`401` fast → server alive (404 on backend `/` is normal — no controller mounted there).
- timeout → process accepts TCP but isn't responding. **Hung.**
- connection refused → process not listening. **Dead.**

### 2. Log staleness

```bash
stat -f "frontend.log: mtime=%Sm size=%z" logs/frontend.log
stat -f "backend.log:  mtime=%Sm size=%z" logs/backend.log
```

If mtime is older than ~2 minutes during active use → server is not flushing logs. Hang or detached stdio.

### 3. Process inventory

```bash
ps -ax -o pid,stat,etime,rss,command | grep -E "next-server|nest start|dist/main|pnpm dev|pnpm start" | grep -v grep
```

Flag any of:
- **STAT = R** with high ETIME → runaway loop (event loop deadlock; CPU-spinning).
- **next-server RSS growing past ~3 GB** → leaking while spinning.
- Missing parent orchestrator (`pnpm dev:turbo` or `pnpm start:dev`) but children alive → swarm watcher died, will not respawn.
- Children missing entirely → backend/frontend dead, need swarm restart.

### 4. Swarm registry desync

```bash
cat .claude-swarm/registry.json
```

If `"pid": null` but `"status": "running"` → swarm has lost its child PIDs and cannot restart them. The orchestrator is blind.

### 5. Backend error tail

If logs are stale, look at the **last** errors before the freeze (often the cause):

```bash
grep -B 1 -A 25 "ERROR" logs/backend.log | tail -80
```

Particular things to look for:
- `Cannot read properties of undefined (reading 'databaseName')` → TypeORM orderBy using snake_case DB column instead of entity property name. Crash path is `getManyAndCount` with pagination + join (`createOrderByCombinedWithSelectExpression`).
- `value too long for type character varying(N)` → string literal exceeds column width. Look at the failing INSERT to identify the column.

### 6. Orphan agent CLI sessions

Use the patched detection (excludes desktop app helpers — never run a loose `ps | grep` for the agent name, it will flag the macOS desktop-app helpers (Claude.app / Codex.app) as orphans):

```bash
node -e '
const { execSync } = require("child_process");
const out = execSync("ps -eo pid,tty,command", { encoding: "utf8" });
function isAgentCliCommand(c) {
  if (/Claude\.app|Codex\.app|claudefordesktop|Squirrel|ShipIt/i.test(c)) return false;
  return /(?:^|\/)(claude|codex)(\s|$)/.test(c) || /\bclaude-code\b/.test(c);
}
const orphans = [], attached = [];
out.split("\n").slice(1).forEach(line => {
  const m = line.match(/^\s*(\d+)\s+(\S+)\s+(.+)$/);
  if (!m) return;
  const [, pid, tty, cmd] = m;
  if (cmd.includes("claude-swarm")) return;
  if (!isAgentCliCommand(cmd)) return;
  ((tty === "??" || tty === "?") ? orphans : attached).push({ pid, tty, cmd: cmd.slice(0,80) });
});
console.log("Attached:"); attached.forEach(s => console.log(`  ${s.pid} ${s.tty} ${s.cmd}`));
console.log("\nOrphans:"); if (!orphans.length) console.log("  (none)"); else orphans.forEach(s => console.log(`  ${s.pid} ${s.tty} ${s.cmd}`));
'
```

### 7. Worktree status

```bash
git worktree list
```

For any worktree on a `claude/*` branch that's stale (last commit > 1 month ago) or has no commits ahead of main, flag for cleanup. Check `git status` inside before suggesting deletion — there may be uncommitted work the user wants to keep.

## Report format

Show the user a concise summary table covering:

| Check | Status |
|---|---|
| Frontend HTTP | 200 / timeout / refused |
| Backend HTTP | 200 / 404 / timeout / refused |
| Log mtimes | fresh / N min stale |
| Hung processes | none / list of PIDs in R state |
| Swarm registry | healthy / desync (pid=null) |
| Orphan CLI sessions | none / list |
| Stale worktrees | none / list |

Then a one-line diagnosis (e.g. "Frontend next-server PID X stuck in R state for Y minutes; swarm registry has no PID so it cannot self-recover") and recommended action.

## Recovery actions (require user confirmation)

Each one is destructive in its own way — confirm before doing.

1. **Kill a runaway next-server**: `kill -9 <pid>`. The parent `pnpm dev:turbo` *may* respawn it; often it dies with the child and the user will need to restart swarm.
2. **Kill orphan CLI sessions**: `kill -9 <pid>` for each.
3. **Remove stale worktrees**: `git worktree remove --force <path>` then `git branch -D claude/<branch>`.
4. **Restart the swarm**: tell the user to do this themselves — `CLAUDE.md` forbids running `pnpm run dev`, `./run-dev.sh` etc. directly. Swarm owns the lifecycle.

After any kill, re-run health probes (step 1) to confirm the new state.

## Anti-patterns

- **Do not** run `pnpm run dev`, `pnpm dev:turbo`, `nest start`, `next dev`, `./run-dev.sh`, or any build command. The Claude Swarm orchestrator owns these. (See `CLAUDE.md` § Build & Dev Servers.)
- **Do not** use a loose `ps | grep` for the agent name — it will match the macOS desktop-app helpers (Claude.app / Codex.app) and offer to kill them. Always use the `isAgentCliCommand` filter above.
- **Do not** delete worktrees without showing what's in them first. The user may have unmerged work they want to preserve.
- **Do not** force-restart everything just because a curl timed out. Diagnose the specific stuck component; fix only that.
