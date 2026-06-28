# Core Plan L Stabilization Runbook

**Last updated:** 2026-06-28

This runbook closes the implementation side of issue #395 Phase 7. Plan L is the logical Core merge: one Core entry and shell for Stock Control and AU Rubber while preserving existing `appScope` strings, collection names, Mongoose model names, and app-owned operational routes.

## Production Invariants

- Plan L does not rename `AppScope` values. Existing `stock-control` and `annix:admin` user scopes remain production identity values.
- Plan L does not rename Mongo collections. Stock Control keeps `stock_control_*`; AU Rubber keeps `rubber_*`; stock-management rubber support keeps `sm_rubber_*`.
- Plan L does not rename Mongoose refs. `StockControlCompany` and `RubberCompany` remain the populate/model names.
- Core app ownership is presence-based: Stock Control ownership comes from `stock_control_companies`; AU Rubber ownership comes from `rubber_company`.
- Login-time denial is off by default behind `CORE_LOGIN_MODULE_GATE`. Missing app-code rows, unresolved companies, regular admin users with no AU grant, and lookup failures remain fail-open.
- Plan P is optional cosmetic debt, not scheduled. Do not start collection/model/ref renames unless a new issue explicitly reopens Plan P after a separate risk review.

## Core Shell Exports

The canonical Core shell lives under `annix-frontend/src/app/core/portal/` and folds the promoted Ops navigation/module surfaces into one portal:

| Surface | Path | Purpose |
|---|---|---|
| Portal provider | `CoreActiveAppContext.tsx` | Resolves enabled apps, active app, persisted active app, and switch routing. |
| Auth mount | `ActiveAppAuthMount.tsx` | Mounts exactly one app auth provider for the active app, or the multi-app picker when no app is selected. |
| Portal chrome | `components/CorePortalChrome.tsx` | Wraps sidebar, header, module provider, app provider bridge, and page-access guard. |
| App provider bridge | `components/CoreAppProviders.tsx` | Mounts active-app support providers inside the selected app context. |
| Module provider | `CorePortalModuleProvider.tsx` | Adapts Ops module metadata for Core navigation. |
| Sidebar | `components/CorePortalSidebar.tsx` | Reuses Ops navigation and rewrites entries to Core hybrid routes for the active app. |
| Header | `components/CorePortalHeader.tsx` | Shows Core version, active app version, active company, app switcher, and logout. |
| App picker | `CoreAppPicker.tsx` | Shared `FormModal`-based picker for companies with more than one enabled app. |
| App metadata | `config/coreAppMeta.ts` | Central label, description, and version mapping for Core app surfaces. |
| Nav ownership map | `config/navAppMap.ts` | Maps nav entries to Stock Control, AU Rubber, or shared Core ownership. |

`annix-frontend/src/app/ops/login/page.tsx` is a redirect shim into `/core`, preserving safe return URLs. Existing `/ops/portal/*` operational pages remain in place where Stock Control still owns the workflow.

## Smoke Checklist

Run these checks after deploy and again during the 2-3 week production soak window. Capture timestamps, environment, test account class, observed result, and any errors in GitHub issue #395.

| Check | Expected result |
|---|---|
| Stock Control-only company logs in through `/core` | User lands in `/core/portal/stock-control/dashboard`; only Stock Control auth hydrates. |
| AU Rubber-only company logs in through `/core` | User lands in `/core/portal/au-rubber/dashboard`; only AU Rubber auth hydrates. |
| Dual-app company logs in through `/core` with no safe return URL | User lands on `/core/portal` and must choose an app from the picker. |
| Dual-app company chooses Stock Control | Active app persists as Stock Control and Stock Control routes render through Core chrome. |
| Dual-app company switches to AU Rubber | Active app changes to AU Rubber and AU Rubber routes render through Core chrome. |
| `/ops/login?returnUrl=/ops/portal/...&expired=1` | Redirects into `/core`; safe Stock Control return URLs are preserved. |
| Logout from Core | Stock Control, AU Rubber, admin, Core active-app, and Nix local token state are cleared. |
| Cross-app Core route with the wrong active app | Page-access guard blocks the mismatched app surface and sends the user back to the active app dashboard. |
| `CORE_LOGIN_MODULE_GATE` off | Login resolution behaves as before the gate. |
| `CORE_LOGIN_MODULE_GATE` on with explicit disabled row | Matching disabled app is denied; missing rows and admin-no-AU paths stay fail-open. |

## Metrics And Logs

During the 2-3 week soak, monitor production Fly logs, browser/client error telemetry, and any available API metrics. `UnifiedLoginService` emits searchable JSON log lines with `event: "core.resolve_app"` and `result: "success" | "invalid_credentials" | "disabled"` so the login-resolution audit can be built from logs even if no metrics dashboard is wired yet.

- `/auth/resolve-app` success, failure, and denied-by-disabled-app counts.
- Login failures grouped by `appScope`, app result, and company resolution state.
- Client errors on `/core`, `/core/portal`, `/ops/login`, `/ops/portal`, `/stock-control`, and `/au-rubber`.
- Backend boot logs for duplicate Mongoose model/provider errors after the CoreModule and Rubber core split.
- Frontend logs for ReferenceError crashes on Core surfaces, especially around query/member access expressions.

Record a dated soak update on issue #395 at least weekly and at close-out. Phase 7 can be closed only after the soak has at least two consecutive production weeks with no unresolved Core login-routing regression, no duplicate-provider/model boot error, no appScope/collection/model rename, and no rollback of the Core shell.

There is no data migration to watch for Plan L. Any database anomaly during this phase should be treated as unrelated until proven otherwise because Plan L does not write ownership rows or rename persistence structures.

## Rollback

Use the smallest rollback lever that matches the problem:

| Problem | First rollback lever |
|---|---|
| Login gate blocks valid users | Set `CORE_LOGIN_MODULE_GATE=false`. |
| Core picker or hybrid shell fails | Revert the frontend Core portal routing/shell changes so `/core` or the app entry links send users directly to the legacy `/stock-control` or `/au-rubber` login/dashboard paths; keep backend guards in place unless they are the verified cause. |
| Ops return-url redirect causes trouble | Revert only `annix-frontend/src/app/ops/login/page.tsx` to the previous Ops login implementation or route it directly to the Stock Control dashboard while the Core redirect is repaired. |
| Backend boot/provider issue appears | Revert `annix-backend/src/core/core.module.ts`, the AppModule CoreModule import, and the Rubber core module split together as one code rollback. |
| AppScope, collection, or model rename is proposed | Stop. That is Plan P and requires a separate issue/risk review. |

The permanent platform controller guard and tenant-scoped resource reads are security hardening and should not be rolled back with the Core UX unless they are the direct cause of a verified regression.

## Phase 7 Close-Out State

- Implementation phases 0 through 6 are documented and wired.
- Core shell exports and invariants are recorded in `docs/shared-registry.md`.
- Local type/lint/script checks provide implementation confidence, but they do not replace the required live-traffic soak.
- The remaining Phase 7 activity after merge/deploy is operational observation: complete the smoke checklist in production, monitor login-resolution metrics for 2-3 weeks, and record weekly plus final results on issue #395 before closing the phase.
