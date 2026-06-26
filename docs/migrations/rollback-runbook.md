# Migration & Deploy Rollback Runbook

Covers what to do when a deploy must be rolled back, given that Annix runs
**forward-only `migrate-mongo` migrations on every deploy** against shared,
all-app MongoDB collections. Addresses review findings `devops-5` and
`devops-6` (issue #405).

## The core hazard: image rollback ≠ schema rollback

The Fly `release_command` (`fly.toml`) runs migrations **before** the new image
takes traffic:

1. core empty-collection sweep
2. core `migrate-mongo up` (`migrations-mongo/`)
3. when Orbit vars are set: Orbit empty-collection sweep + Orbit `migrate-mongo up` (`migrations-mongo-orbit/`)

A failed `release_command` aborts the Fly deploy, so **traffic never cuts over**
to a broken image. But two gaps remain:

- **Per-migration commit, no surrounding transaction.** `migrate-mongo` applies
  each migration and records it in `_migrations` one at a time. If migration N
  succeeds and N+1 fails, the deploy aborts with the **old image still serving**
  but the DB already has N applied — old code now runs against a partially
  migrated DB.
- **`flyctl deploy` rollback does NOT run `migrate-mongo down`.** Rolling the
  Fly machine back to the previous image restores the old *code* but leaves the
  DB in the *new* shape. A migration's `down()` is only ever run if an operator
  runs it by hand.

So: **the DB can be ahead of the code, and getting it back is a manual,
per-migration judgement call.** This runbook is that judgement.

## Classify every migration before you ship it

Each migration falls into one of three classes. Put the class in the migration's
top comment so the operator doesn't have to reverse-engineer it under pressure.

### 1. Reversible structural — `down()` truly reverses `up()`

Index adds, non-destructive field adds, collection renames with a working
inverse. **Rollback:** after the image rollback, run the matching
`pnpm migrate:down` (core) or `pnpm migrate:orbit:down` (Orbit) for exactly the
migrations applied by the bad release. Safe because `down()` restores the prior
shape the old code expects.

### 2. Forward-only data repair — intentionally empty `down()`

NaN/`null` repairs, backfills that correct invalid data
(e.g. `fix-cpo-non-finite-fulfilled-quantities.ts`). **Rollback:** do nothing —
leave it applied. The repaired data is valid for the old code too; reverting it
would re-introduce the bad data. Never write a `down()` that un-repairs data.

### 3. Shape-breaking — `$set` new shape **and** `$unset` old fields

The dangerous class. e.g. `nest-company-address-contact`,
`nest-platform-company-address-contact`, `embed-stock-control-rbac-config-on-company`
— they move flat `company.email`/`company.phone` into a nested object and
`$unset` the flat fields on a **shared** collection. On image rollback the old
code reads `company.email`, which no longer exists. **Rollback:** image rollback
alone is NOT safe — you must **also** run `pnpm migrate:down` for that migration
(and it must be idempotent). Better: don't ship this class at all — use
expand/contract below.

## Prevent the class-3 problem: expand / contract (two-phase)

Never break the read shape in a single migration coupled to the code deploy.
Split it across two deploys so image rollback is safe at every step:

1. **Expand** — migration writes the **new** nested shape while **keeping** the
   old flat fields. Deploy code that reads new-shape-with-fallback-to-old.
   *Rollback-safe:* old code still finds the flat fields.
2. **(soak — confirm no running code reads the old fields)**
3. **Contract** — a **later** migration `$unset`s the old flat fields, only once
   no deployed code reads them. *Rollback-safe:* the only code that could roll
   back already reads the new shape.

Where a destructive `$unset` has *already* shipped (the migrations listed under
class 3), its rollback story is "image rollback **plus** `migrate:down` for that
specific migration" — record it explicitly in the deploy notes for that release.

## Operator checklist — when a release goes bad

1. **Did `release_command` fail mid-way?** Check the deploy logs for which
   migration aborted. Everything *before* it is applied; that one and everything
   after are not. The old image is still serving.
2. **Identify the applied migrations** for the bad release (diff `_migrations`
   changelog head before vs after — see below) and **classify each** (1/2/3).
3. **Roll the image back** (`flyctl releases`/`flyctl deploy --image <prev>`).
4. **Reconcile the schema by class:**
   - Class 1 (reversible): `migrate:down` each, newest first.
   - Class 2 (data repair): leave applied.
   - Class 3 (shape-breaking): `migrate:down` each — **required**, not optional.
   Use the right config: `migrate:down` for core, `migrate:orbit:down` for Orbit.
   Never run a core command against Orbit collections or vice-versa
   (`scripts/check-migration-routing.ts` enforces file placement, not runtime).
5. **Re-verify** `/api/health/db` reports `main.connected: true` (and
   `orbit.connected: true` when Orbit is configured) on the rolled-back app — the
   deploy gate now asserts this (`devops-3`).

## Keep rollback cheap: rules for new migrations

- **Idempotent `up()` and `down()`** so a re-run after a fix is safe (most
  already are — keep it that way).
- **Build unique indexes with `createUniqueIndexSafely`** from
  `src/lib/persistence/migration-index-helpers.ts` (`devops-7`): it is idempotent
  (a pre-existing equivalent unique index is treated as success), throws a clear
  error if a non-unique index already occupies the key, and — instead of letting
  `createIndex` fail opaquely mid-deploy — refuses up front listing sample
  duplicate values so you dedupe in the same `up()` first. Use `findDuplicateKeys`
  from the same module to inspect, then dedupe (for entities with foreign
  references, re-point them before deleting losers — pattern:
  `migrations-mongo-orbit/20260620090000-dedupe-seeker-workflow-progress-participants.ts`).
- **No class-3 shape break in one step** — expand/contract instead.
- **State the class** in the migration's header comment.
- **Log the changelog head** before/after in the deploy notes so the applied set
  is unambiguous if a release aborts mid-way:
  `pnpm migrate:status` (core) / `pnpm migrate:orbit:status` (Orbit).

## Required-secret matrix (`devops-10`)

The `release_command` runs `scripts/check-required-secrets.ts` **first**, before
any sweep or migration. It hard-fails the deploy (naming the missing key) if a
boot-critical secret is absent, and warns (without failing) on secrets whose
absence silently degrades a feature. Keep this table in sync with that script.

| Secret | Tier | Required when | Absence symptom |
|---|---|---|---|
| `MONGODB_URI` | hard-fail | always | core DB — app won't boot |
| `MONGO_DATABASE` | hard-fail | always | core DB — app won't boot |
| `ORBIT_MONGODB_URI` | hard-fail | `NODE_ENV=production` | Orbit DB — boot throws in prod (all three Fly envs) |
| `ORBIT_MONGO_DATABASE` | hard-fail | `NODE_ENV=production` | Orbit DB — boot throws in prod |
| `WHATSAPP_APP_SECRET` | hard-fail | `ORBIT_WHATSAPP_QUOTA_GATE=true` | boot throws when the gate is on |
| `GEMINI_API_KEY` | warn | always (AI used by all apps) | AI extraction/chat fails on first use |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_S3_BUCKET` / `AWS_REGION` | warn | `STORAGE_TYPE=s3` | file uploads fail on first use |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | warn | always (email used by all apps) | email degrades to console logging |
| `GEMINI_CHAT_MODEL` | optional | never | overrides the in-code model default (a stale value once caused an outage — keep it intentional) |
| `ANTHROPIC_API_KEY` | optional | never | optional AI fallback only (policy is Gemini-only) |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | n/a | build-arg, not a runtime secret | set at image build, not via `fly secrets` |

Secrets are **per-app Fly secrets** (one `fly.toml`, three apps; each reads its
own). Set with `fly secrets set <KEY>=<value> -a <app-name>` — never in
`fly.toml`. A secret missing on one environment only affects that environment.

## Shared-module blast radius (`devops-1`)

The backend runs as **one NestJS process** that wires every app module, so a
change to any shared surface restarts the single process and interrupts **all
three apps at once** — Stock Control, RFQ and AU Rubber. Shared surfaces include
`src/lib/persistence/`, `src/email`, `src/storage`, `src/nix`, `src/auth`,
`src/rbac`, the `src/shared` throttler, and `packages/product-data` (its built
`dist` is consumed at boot). A boot-time failure in any of them (a DI crash, a
stale `product-data` dist, a bad migration) takes down all three apps, not one.

With `min_machines_running = 1` there is no rolling/blue-green deploy: in-flight
requests for all apps drop on restart. Treat **any `src/lib` or shared-module
change as an all-app deploy** — gate it behind the staging smoke-test (which now
asserts real DB readiness, `devops-3`) and watch `/api/health/db` after promote.

### Scaling to `min_machines_running >= 2` (`devops-1`) — two-deploy sequence

Zero-downtime rolling restarts need `min_machines_running >= 2`. The prerequisite
is in place: `RbacCacheEpochService` (`src/rbac/rbac-cache-epoch.service.ts`)
propagates RBAC cache invalidations across machines via a Mongo epoch stamp
(`_rbac_cache_epoch`), so the in-process access-details cache stays correct on a
multi-machine fleet. **Ship the flip as a SEPARATE, later deploy — never with the
epoch mechanism**, because during a 2-machine rollout one machine would still run
old code without the poll loop (the exact stale-permission window).

Before the `min_machines_running = 2` push, verify:
1. Every running machine is already on a build containing `RbacCacheEpochService`
   (the mechanism is fully rolled out — no old machines).
2. `_rbac_cache_epoch` exists on the core cluster with `{_id:"rbac", epoch:N}`.
3. Live cross-machine test: mutate RBAC on one machine, confirm the other clears
   within ~5s (look for the "cleared on cross-machine invalidation" log line).
4. The `/api/health/db` canary still gates the deploy.
This is itself a `fly.toml`/scaling change → re-run the `annix-devops` gate; the
rollback is simply reverting `min_machines_running` to 1 (the epoch infra is
inert at one machine, so nothing else needs unwinding).

## Related

- `fly.toml` `release_command` — the migration execution path (core + Orbit).
- `docs/single-environment-deploys.md` — staging-only deploy path.
- `docs/migrations/` — migration authoring notes.
- Issue #405 — `devops-4` (Orbit routing fail-fast), `devops-5`/`devops-6`
  (this runbook), `devops-7` (safe unique-index builds), `devops-8` (Orbit
  empty-collection sweep at deploy).
