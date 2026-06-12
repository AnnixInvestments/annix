# Single-Environment Deploys (deploying without touching production)

There are two ways to get work onto the staging environment for testing. Pick by intent.

**Test (`annix-app-test`) is NOT scratch space** — real Orbit users work on it. Experimental deploys go to staging, never test. Production runs Polymer and AU Rubber's real users; test runs Orbit's.

| | Staging via PR (feedback widget route) | Experimental push (`pre-main` route) |
|---|---|---|
| **Use when** | Validating a finished change before it goes to `main` | Trying something out; you are not sure it should ever reach `main` |
| **Deploys to** | `annix-app-staging` | `annix-app-staging` |
| **How** | Open a PR against `main` (the feedback widget does this automatically) | `node scripts/push-experimental.ts`, or tell Claude "push to staging" |
| **Reserves the environment?** | Yes — the PR claims staging via the `on-staging` label, which also skips staging in normal `main` deploys until the PR closes | No — and while a PR holds the claim, the experimental push fails with a clear error naming the PR |
| **Reaches production?** | When the PR's commits reach `main` | Never, until you separately push the work to `main` |

## The experimental push route

Pushing any commit to the `pre-main` branch triggers `.github/workflows/deploy.yml`, which resolves the deploy matrix to the **staging environment only** (`annix-app-staging`). Production and test are never part of a `pre-main` run, and a failed experimental run does not create a `deploy-failure` issue.

Staging is the right place for risky build experiments: its database is refreshed from production overnight (`refresh-staging-db.yml`, 06:00 SAST when `MONGO_REFRESH_ENABLED` is true), so it behaves like production without any real users on it.

From your machine (cross-platform, no bash required):

```bash
node scripts/push-experimental.ts
```

This pushes your current `HEAD` to `origin/pre-main` (force-with-lease) and prints the Actions and staging-app URLs. Anything you can commit locally can be deployed this way — it does not need to exist on `main` or in a PR.

### If staging is claimed

When an open feedback-widget PR holds the `on-staging` label, the experimental run **fails immediately** with an error naming the PR, rather than silently skipping or overwriting the PR's validation deploy. Wait for that PR to release staging (or close it), then push again.

### What to tell Claude

- **"push to staging"** — push the current work to `pre-main`, deploying the staging environment only.
- **"push"** — the normal full push to `main` (deploys prod, test and staging; prod waits for the release approval).

"Push to staging" authorizes exactly one push to `pre-main` and never to `main` — same per-push rules as every other push instruction.

### Housekeeping policy for `pre-main`

- `pre-main` is a **scratch branch**. Force-updates are expected; the helper script force-pushes on every use. Do not treat its history as durable.
- Never merge `pre-main` into `main`. When experimental work proves out, push it to `main` through the normal route (one clean commit, explicit push instruction).
- Nick and Andy share the branch and the staging environment. A push replaces whatever was there; the next `main` push also redeploys staging (when unclaimed), so experimental deploys are ephemeral by design.

### Caveat: base experimental work on a current `main`

GitHub reads the workflow file **at the pushed commit**. If your experimental branch is based on a `main` from before the `pre-main` trigger existed, the push starts no run at all. Rebase onto current `main` first.
