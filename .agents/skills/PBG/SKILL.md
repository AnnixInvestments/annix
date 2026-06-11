---
name: PBG
description: Push Bypass Gate — push all commits to origin/main, then immediately release the prod deploy gate for that push instead of waiting for the 03:00 window. Use when the user types /PBG or says "push and bypass the gate" / "push and deploy prod now".
---

# Push Bypass Gate (/PBG)

Push to `origin/main`, then approve the prod environment deployment for the pushed SHA so it ships now instead of at the 03:00 deploy window. Typing `/PBG` is the explicit authorization for exactly one push AND one gate bypass.

## Background

The `prod` GitHub environment has a required-reviewer rule: every push builds + tests + deploys test/staging immediately, but the prod deploy parks at "Waiting for review" until `.github/workflows/prod-deploy-window.yml` releases it at 03:00 SAST. The session `gh` CLI is authenticated as the required reviewer, so it can approve directly.

## Steps

1. **Fetch + list what will be pushed:**
   ```
   git fetch origin main
   git log origin/main..HEAD --oneline
   ```
   If there are uncommitted session changes the user asked to ship, commit them first (one commit, biome on staged files, house rules apply). If there is nothing to push at all, skip to step 4 and release the newest already-waiting run instead.

2. **Push** and report the pre-push step timings table (including the wall-clock TOTAL):
   ```
   git push origin HEAD:main
   ```

3. **Wait for the deploy run for the pushed SHA to reach the gate.** Tests + image build take ~10 minutes. Poll in the background (60s interval, ~30 min timeout):
   ```
   gh api "repos/AnnixInvestments/annix/actions/workflows/deploy.yml/runs?head_sha=<SHA>" \
     --jq '.workflow_runs[0] | "\(.id) \(.status)"'
   ```
   Do NOT use `gh run list --commit <sha>` — it has returned empty for valid runs before. If the run reaches `completed` without ever showing `waiting`, the test or build stage failed — report the failure instead of approving anything.

4. **Approve the prod deployment** for that run:
   ```
   ENV_IDS=$(gh api "repos/AnnixInvestments/annix/actions/runs/<RUN_ID>/pending_deployments" \
     --jq '[.[] | select(.environment.name == "prod" and .current_user_can_approve) | .environment.id]')
   jq -n --argjson ids "$ENV_IDS" \
     '{environment_ids: $ids, state: "approved", comment: "Bypassed via /PBG"}' \
     | gh api -X POST "repos/AnnixInvestments/annix/actions/runs/<RUN_ID>/pending_deployments" --input -
   ```
   (`jq` may be missing on this machine — fall back to building the JSON with python3 and `--input -`.)

5. **Cancel stale superseded runs** — any OLDER run still waiting on the gate is now obsolete (the approved SHA contains its commits):
   ```
   gh api "repos/AnnixInvestments/annix/actions/workflows/deploy.yml/runs?status=waiting&per_page=50" \
     --jq '.workflow_runs[] | select(.id != <RUN_ID>) | .id'
   # for each: gh api -X POST repos/AnnixInvestments/annix/actions/runs/<id>/cancel
   ```
   Cancel (never reject) — rejection marks the run failed and fires the deploy-failure issue bot.

6. **Verify the prod deploy lands.** Watch the run to completion in the background and report the conclusion; on failure, surface the run URL and the failing job's tail.

## Cautions

- One `/PBG` = one push + one bypass. A later push the same day queues for the 03:00 window as normal.
- Never force-push; non-fast-forward rejection means fetch + rebase + retry per house rules.
- If `current_user_can_approve` comes back false, the gh token no longer belongs to a prod required reviewer — stop and tell the user instead of retrying.
