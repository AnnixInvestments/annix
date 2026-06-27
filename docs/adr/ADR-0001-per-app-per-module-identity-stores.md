# ADR-0001: Per-app and per-module identity stores

- **Status:** Accepted (design) — implementation phased, see Migration.
- **Date:** 2026-06-27
- **Deciders:** Product owner (andy@auind.co.za), annix-architect review
- **Supersedes the implicit design of:** issue #389 (logical app isolation via `appScope`)

---

## Context

### How identity works today

Every login for every Annix product shares **one** MongoDB collection — `user` in the
core `annix_production` database (cluster `annix.apxdmbt.mongodb.net`). Records are
separated only by an `appScope` string field:

| appScope | product / module |
|---|---|
| `orbit:company` | Orbit — company |
| `orbit:seeker` | Orbit — job seeker |
| `orbit:recruiter` | Orbit — recruitment agency |
| `orbit:student` | Orbit — student |
| `forge:customer` | Forge |
| `annix:admin` | Annix admin |
| … | … |

The same human with the same email can therefore be **several rows** in this one
collection. Real example observed in production for `andy@auind.co.za`: three rows —
`orbit:seeker`, `forge:customer`, `annix:admin`.

Identity is not only "the `user` collection." It is **one global numeric `_id` space**
used as a foreign key across the whole platform: Orbit profiles
(`cv_assistant_profiles.userId`), passkeys (`passkey.userId`), RBAC grants
(`user_app_access.userId`), candidates, audit, WhatsApp, and the JWT `sub` claim every
guard reads. **61 files inject `UserRepository`; ~247 references across ~100 files.**
IDs are minted from a shared `counters` collection keyed by **collection name**
(`lib/persistence/mongo-crud-repository.ts:250-281`).

### Why it ended up shared

The shared collection was a deliberate fix for issue #389 (documented in
`rbac/app-scope.ts:1-13`): "each app has its own registration + login," partitioned
**logically** by `appScope` to avoid re-keying the platform. The original bug it fixed
was Orbit stamping `orbit:*` onto a Forge/customer row and hijacking that login. So the
team already reached the conclusion "separate per-app identities" — but implemented it
logically, not physically.

A previous attempt at a **physically** separate Orbit store also exists and was
abandoned: the `AnnixOrbitUser` entity / `cv_assistant_users` collection on
`ORBIT_CONNECTION`. It has **0 documents in production** and auth no longer uses it,
but it is still wired into non-auth read paths (notifications, SSO reconciliation) —
see "Vestigial store" below.

### The problems this causes

1. **Read isolation is convention, not structure.** Correctness depends on every query
   remembering a scope filter (`NON_ORBIT_SCOPE_FILTER` / `ORBIT_SCOPE_FILTER`,
   `user/user.repository.mongo.ts:12-13`). Miss one and apps cross-authenticate — the
   exact #389 failure mode.
2. **The #389 bug surface is still live inside Orbit.** `resolveOrbitLoginUser`
   (`annix-orbit/services/auth.service.ts:156-167`) tries a module-scoped lookup, then
   falls back to `findOrbitUserByEmail`, which matches **any** `/^orbit:/` row. A
   person who is both seeker and company, logging into the company portal without a
   correct `accountType` hint, can be authenticated against their seeker row.
3. **A unique index does not fix reads.** A compound unique `{email, module}` index
   makes data *integrity* structural (no duplicate rows) but never stops a query from
   *returning* the wrong module. For an auth boundary, that is the property that
   matters.
4. **Blast radius of any identity change is the whole monorepo.** No app owns its
   identity store; an Orbit schema change touches the collection Forge and Admin
   authenticate against.
5. **Vestigial store rot.** `cv_assistant_users` is empty but still referenced —
   a latent correctness trap (see below).

---

## Decision

Split identity into **physically separate collections per app, and within Orbit, per
module** — on the storage layer, so cross-module/cross-app login bleed becomes
structurally impossible rather than convention-gated.

```
ORBIT_CONNECTION (orbit_production / orbit_test)
  orbit_company_identities
  orbit_seeker_identities
  orbit_recruiter_identities
  orbit_student_identities

CORE cluster
  forge_identities
  annix_admin_identities
  … (one per remaining app)
```

A company login injects a repository bound to `orbit_company_identities`. **There is no
code path, however careless, that can return a seeker row — the seeker rows are not in
that collection.** This is strictly stronger than index-or-convention isolation, and
the codebase has concrete production history (#389) of convention-based isolation
failing.

### Why per-module (and not one Orbit collection)

This decision reverses the architect's first-pass recommendation after the actual
cross-module usage was measured:

- **No cross-module hot path.** Login needs zero cross-module reads. Registration is
  *already* per-module (`assertOrbitAccountAvailable`, `auth.service.ts:115-125`).
  There is **no** "email exists anywhere in Orbit" gate and **no** seeker→company
  upgrade flow.
- **The only cross-module reads are admin/low-volume:** admin user list/search
  (`admin-orbit-user.service.ts:99-103`), admin by-id management
  (`admin-orbit-user.service.ts:271-344`), and two password-reset helpers
  (`forgotPassword` / `resendVerification`, `auth.service.ts:730,753`) that are
  *already* ambiguous for multi-module users and become **more** correct when made
  module-aware.
- So the "scatter-gather" cost of per-module collections is bounded and admin-scoped;
  the hot path pays nothing.

### Index / uniqueness model

| Collection (on `ORBIT_CONNECTION`) | `_id` | Indexes |
|---|---|---|
| `orbit_company_identities` | number, **shared `orbit_identity` sequence** | unique `{emailLower}`; `{emailVerificationToken}`; `{resetPasswordToken}` |
| `orbit_seeker_identities` | same shared sequence | same |
| `orbit_recruiter_identities` | same shared sequence | same |
| `orbit_student_identities` | same shared sequence | same |

`emailLower` is unique **within** each collection (module is implicit in the
collection). The same email may exist **once per module** across the four — preserving
today's behaviour structurally. Email uniqueness becomes a DB constraint, not
app-managed.

The same structural argument justifies per-**app** separation even more strongly than
per-module, since cross-app authentication was the original #389 incident.

---

## Non-negotiable conditions

Without all four, the split adds risk instead of removing it:

1. **Preserve the global numeric `_id`.** Mint all identity collections from **one
   shared sequence** (counter key `orbit_identity` for the four Orbit collections), not
   per-collection. This keeps the 61 `UserRepository` consumers and the JWT `sub`
   working untouched. *(This is what makes per-module cost no more than per-app on the
   FK axis — id preservation is required either way and is independent of collection
   count.)*
2. **Delete the module-agnostic login fallback** (`findOrbitUserByEmail` in
   `resolveOrbitLoginUser`, `auth.service.ts:166`). Login must require a known module
   and query only that module's collection. Keeping the fallback would reintroduce the
   bleed at the storage boundary we paid to remove.
3. **Make `forgotPassword` / `resendVerification` module-aware** (`auth.service.ts:730,
   753`) instead of "first Orbit row."
4. **Route the few cross-module admin reads** via a thin `identity_registry`
   (`userId` / `emailLower` / token → `{ app, module }`) or a bounded N-collection
   fan-out for admin-only paths. Never a regex-over-everything query.

---

## Migration (M0–M6)

Guiding rule: **copy, never regenerate ids; never delete the source until cut-over is
proven.** Each phase runs per environment (prod cluster, test cluster, ORBIT_CONNECTION)
with an isolation assertion as a hard release gate
(extend `scripts/check-appscope-isolation.ts`).

### M0 — Shared id sequence + identity registry *(prerequisite)*
- Add a backward-compatible `counterKey()` hook to `MongoCrudRepository` so identity
  repos can draw `_id` from one shared `orbit_identity` sequence instead of per
  collection. Default remains `collectionName` — no behaviour change for any existing
  collection.
- Build a thin `identity_registry(userId → { app, module, emailLower })` so consumers
  holding only a bare `userId` can route.
- Effort: **M**.

### M1 — Backfill copy *(idempotent, reversible)*
- For each `appScope` family, copy matching `user` rows into the target identity
  collection **preserving `_id`** and setting `module` from the scope (reuse the map at
  `auth.service.ts:52-57`).
- Idempotent via upsert on `_id`; reversible because source `user` rows are untouched.
- Carry `migratedFrom: "user"` + `migratedAt` for audit/rollback.
- Null/ambiguous-scope rows → quarantine report; never guess (mirror the
  `fallbackUserType` refusal at `auth.service.ts:106-113`).
- Effort: **L**.

### M2 — Verification checkpoint *(release gate)*
- Per-`(app, module)` counts reconcile against `appScope` group counts.
- Assert no `_id` exists in two identity collections.
- Assert every `cv_assistant_profiles.userId` / `user_app_access.userId` /
  `passkey.userId` still resolves to exactly one identity row.

### M3 — Dual-read, single-write shim
- Point `resolveOrbitLoginUser` and per-app auth services at the new collections, with
  read-fallback to `user` for any id not yet found. Write **both** for one release so
  rollback is instant.

### M4 — Cut writes over
- Stop dual-write, freeze `user` reads once dashboards show zero fallback hits.

### M5 — `cv_assistant_users` cleanup *(can ship earlier; see caveat)*
- Repoint the SSO/notification readers off `cv_assistant_users`, then drop the
  `AnnixOrbitUser` schema/entity/repo and its `ORBIT_CONNECTION` model registration.
- **Caveat (correction to first-pass "small & independent" assessment):** this is *not*
  a pure no-op deletion. `notification.controller.ts` actively reads (`:37`) and writes
  (`:62`) `cv_assistant_users` for the notification-preferences endpoints. Because the
  collection is empty in prod and `updatePreferences` does not upsert, that feature is
  **already non-functional in production** (GET returns hardcoded defaults 80/true/
  false; PATCH silently no-ops). Removal must therefore **repoint notification
  preferences to their real home** (the core `user` doc / new identity store) — fixing
  a latent bug — not merely delete code.
- Effort: **S–M** (was mis-scoped as S).

### M6 — Retire `user`
- Shrink `user` to non-identity legacy (or archive cold) only after a full release of
  zero fallback reads. Keep for the agreed rollback window.

```
M0 shared id-seq + registry
   → M1 backfill copy (idempotent)
      → M2 VERIFY: counts + FK resolve + isolation  [GATE]
         → M3 dual-read / dual-write shim
            → M4 cut writes over
               → M5 drop cv_assistant_users (repoint prefs first)
                  → M6 retire user (cold archive)
```

---

## Code blast radius

**Identity resolution / auth services** (rewrite scope queries → collection-targeted):
- `annix-orbit/services/auth.service.ts` — `resolveOrbitLoginUser` (drop fallback),
  `assertOrbitAccountAvailable`, all `register*`, every `userRepo.create(... appScope ...)`.
- `auth/unified-login.service.ts:19-34`.
- Per-app auth services: `customer/customer-auth.service.ts`,
  `supplier/supplier-auth.service.ts`, `stock-control/services/auth.service.ts`,
  `annix-sentinel/sentinel-auth/auth.service.ts`,
  `annix-rep/auth/annix-rep-auth.service.ts`,
  `teacher-assistant/services/teacher-assistant-auth.service.ts`,
  `admin/admin-auth.service.ts`.

**Repository layer:** `user/user.repository.ts` + `.mongo.ts` (+ `.postgres.ts` for
parity). The scope-filter methods (`findOrbitUserByEmail`, `findOneByEmailAndScope`,
`findOneByEmailAnyScope`, `findByEmailsAnyScope`, `NON_ORBIT_SCOPE_FILTER`,
`ORBIT_SCOPE_FILTER`) are replaced by collection-targeted queries. The Orbit repo
splits into four module-bound repos.

**Guards / token paths:** `annix-orbit/guards/annix-orbit-auth.guard.ts:43`,
`auth/jwt.strategy.ts`, `annix-sentinel/sentinel-auth/strategies/jwt.strategy.ts`, and
the per-app `*-auth.guard.ts` set (~15). They fetch by `sub`/`userId` — **keep working
iff the global id is preserved.** Strongest reason for condition #1.

**RBAC:** `user_app_access` is keyed by global `userId` — **no change if id preserved.**
`appScope` constants (`rbac/app-scope.ts`) become a `module` mapping rather than a row
discriminator.

**Passkeys:** `passkey/passkey.service.ts` keeps `userId`; only the scope lookups
(`:142-190`) move from `findOneByEmailAndScope` on `user` to the per-module identity
repo.

**SSO / reconciliation:** `sso/identity-reconciliation.service.ts` — rework
`unbridgedLegacySection` / `coverageSection` / `collectRolesByEmail` to read the new
stores; drop `cv_assistant_users` dependency.

**~55 non-auth consumers** (`userRepo.findById` / `findByIds`) — with id preserved,
most need only a repository swap or registry routing; none need re-keying.

**Dual-driver parity:** each new identity collection needs schema + entity + repo trio
(`.ts` abstract + `.mongo.ts` + `.postgres.ts`) + module wiring. Orbit per-module ≈ 4
trios; per remaining app ≈ 1 each. Add a CI parity check.

---

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Lockout on cut-over | Dual-read fallback to `user` until zero-fallback dashboards (M3→M4) |
| Id collision across new stores | Shared sequence (M0) before any copy |
| Prod/test contamination | Every phase per-environment with isolation assertion as hard gate |
| Dangling FKs | M2 asserts every `userId` in profiles/passkeys/RBAC resolves to exactly one identity before writes move |

---

## Consequences

**Positive:** structural (storage-layer) login isolation; the live #389-class fallback
bug removed; email uniqueness becomes a DB constraint; each app/module owns its identity
store and indexes; a latent broken feature (notification prefs) gets fixed during M5.

**Negative / accepted trade-offs:** ~4× identity schema/repo boilerplate and Mongo↔
Postgres parity surface for Orbit; admin cross-module list/search becomes an
N-collection union or read-model; admin by-id and token lookups must route to the right
collection. Justified specifically because this is the **authentication boundary** —
isolation failure here means account takeover. This split would **not** be worth it for
an ordinary domain aggregate.

---

## Implementation slices (tracking)

- [x] **S0 — Scaffold (additive, no behaviour change):** new `orbit_*_identities`
  entity/schema/abstract-repo/mongo-repo for the four modules + the `counterKey()` hook
  on `MongoCrudRepository`. Not wired into login. *(Done — in review.)*
- [x] **S1 — M0:** shared `orbit_identity` sequence wired into the new repos
  (global-max-safe reseed hook) + `identity_registry` store. Still inert. *(Done — in
  review.)*
- [x] **S2 — M1/M2:** backfill migration script
  (`scripts/migrate-orbit-identities.ts`, dry-run default) + M2 verification gate
  + spec. Runs against no runner; not yet executed on real data. *(Done — in
  review.)*
- [ ] **S3 — M3:** dual-read/dual-write in `resolveOrbitLoginUser` and per-app auth;
  drop the module-agnostic fallback behind the new path.
- [ ] **S4 — M4:** cut writes over; module-aware `forgotPassword`/`resendVerification`.
- [ ] **S5 — M5:** repoint notification prefs + SSO reconciliation; delete
  `cv_assistant_users` / `AnnixOrbitUser`.
- [ ] **S6 — M6:** retire `user` to legacy/cold archive.
