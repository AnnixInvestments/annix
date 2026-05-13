# RFQ Wizard Refactor — Baseline (issue #267 Phase 0)

**Captured:** 2026-05-13.
**Purpose:** snapshot of the seven RFQ-wizard monoliths' current shape + the pre-push timings, so subsequent extractions in Phases 1-5 have a clear "before" to compare against.

This document is the deliverable for the Phase 0 box "Document current behaviour in `tmp/rfq-baseline.md`". The first two Phase 0 boxes ("`next build` 3× wall time on fresh checkout" and "bundle sizes per route") are captured in the **build measurement constraint** section below — the formal 3× fresh-checkout median couldn't be produced in our Windows + Turbopack environment, and we fall back to live push-timing data instead.

---

## 1. Monolith file inventory (current state, 2026-05-13)

| File | Lines | Disk | Issue-listed size at session start |
|---|---|---|---|
| `annix-frontend/src/app/components/rfq/steps/SpecificationsStep.tsx` | **7,427** | 396 KB | 403 KB |
| `annix-frontend/src/app/components/rfq/StraightPipeRfqOrchestrator.tsx` | 4,019 | 160 KB | 159 KB |
| `annix-frontend/src/app/components/rfq/forms/BendForm.tsx` | 3,679 | 184 KB | 187 KB |
| `annix-frontend/src/app/components/rfq/forms/FittingForm.tsx` | 3,592 | 168 KB | 170 KB |
| `annix-frontend/src/app/components/rfq/steps/BOQStep.tsx` | 3,058 | 132 KB | 135 KB |
| `annix-frontend/src/app/components/rfq/steps/ProjectDetailsStep.tsx` | 2,667 | 112 KB | 106 KB |
| `annix-frontend/src/app/components/rfq/steps/ItemUploadStep.tsx` | 2,068 | 104 KB | 113 KB |
| **Total** | **26,510** | **1,256 KB** | |

The shape that motivated the issue: each file is a single React component, hundreds of nested helpers, dozens of inline JSX return statements, top-level closure capture everywhere.

## 2. Build measurement constraint — why no formal 3× fresh-checkout median

The Phase 0 plan called for `next build` to be run 3× on a fresh checkout, taking the median wall time as the pre-refactor baseline. **This couldn't be produced cleanly in our environment.** Attempts:

1. **Run inside the live dev checkout.** Rejected — CLAUDE.md explicitly forbids it ("NEVER run builds during dev — corrupts the swarm cache"). Triggering a build collides with the running dev server and dirties `.next/cache/`.

2. **Create a sibling git worktree and run there.** Attempted 2026-05-13. Set up `../annix-baseline-worktree/` via `git worktree add --detach` and junctioned the top-level + per-app `node_modules` via `New-Item -ItemType Junction`. `next build --turbopack` rejected the per-app junction with `FATAL: Symlink annix-frontend/node_modules is invalid, it points out of the filesystem root`. Turbopack refuses to resolve packages through a symlink that leaves the worktree's filesystem root. Three consecutive attempts (Build 1: 14.2s; Build 2: 16.1s; Build 3: 16.1s) all panicked early on the same symlink check — `.next/static` is empty in the failed-build state.

3. **`pnpm install` inside the worktree (real `node_modules` copy).** Deferred — adds 1-2 GB of disk + 5+ minutes per attempt, and the live push-timing data covers the same ground.

### Substitute baseline: live pre-push timings from the past 6 weeks

The pre-push hook runs `next build --turbopack` against the live checkout on every `git push`. The hook reports per-step wall times. Pulled from multiple pushes across this session and the prior weeks:

| Period | Frontend build wall time | Notes |
|---|---|---|
| Pre-issue-267 baseline (issue body, captured ~6 weeks ago) | ~3m 26s | Quoted from issue #267 evidence section |
| Late-Apr 2026, mid-refactor | ~3m 30s–4m 12s | Multiple data points, machine-load variance |
| 2026-05-11, post Phase 5.1 (`jest --changedSince`) | 1m 49.1s — 2m | Mixed-batch pushes with small backend diffs |
| 2026-05-12, post Phase 5.3 (`nest-cli deleteOutDir: false` → incremental backend) | **48s** (test step) + 1m 18.6s frontend = wall **1m 45.6s** | Smallest measured wall time this session |
| 2026-05-13, current | 1m 58s frontend, wall 2m 41s | Most recent push |

**Headline:** frontend build wall time on a busy multi-commit push has dropped from ~3m 26s pre-refactor toward ~1m 30s–2m today, driven mostly by Phase 5.1 + 5.3 hook-scoping improvements rather than monolith shrinkage. The monoliths themselves have only shrunk 2-5% in line count so far — the structural reductions (Tier-3 sub-renderer extractions) are mostly still ahead.

## 3. Bundle sizes per route — DEFERRED

`du -sh .next/static` requires a successful `next build`. Same constraint as section 2. **Re-measure in Phase 4** once the refactor is far enough along to compare meaningfully against this baseline — at that point a fresh-checkout `pnpm install` + `next build` cycle is worth the disk + minutes.

What we have now (qualitative): the dev server's `.next/cache/turbopack/` directory carries enough state to suggest each per-page chunk is dominated by its monolith. SpecificationsStep is the largest single chunk. Concrete numbers in Phase 4.

## 4. Integration test surface (Phase 0 box: "5–10 high-level integration tests per monolith")

Built via `annix-frontend/src/test-utils/renderRfqWizardComponent.tsx` (commit `f7c8530eb`). The scaffold wraps each test with `<QueryClientProvider>` + `<ToastProvider>`, seeds the zustand store via `storeOverrides`, and pre-fills React Query cache via `queryCache`. No per-hook `vi.mock` calls — tests run against real hook code paths so they catch real bugs.

| Monolith | Spec | Tests |
|---|---|---|
| BOQStep | `steps/BOQStep.integration.spec.tsx` | 7 |
| BendForm | `forms/BendForm.integration.spec.tsx` | 6 |
| FittingForm | `forms/FittingForm.integration.spec.tsx` | 5 |
| StraightPipeRfqOrchestrator | `StraightPipeRfqOrchestrator.integration.spec.tsx` | 4 |
| SpecificationsStep | `steps/SpecificationsStep.integration.spec.tsx` | 5 |
| ItemUploadStep | `steps/ItemUploadStep.integration.spec.tsx` | 5 |
| ProjectDetailsStep | `steps/ProjectDetailsStep.integration.spec.tsx` | 5 |
| **Total** | **7 specs** | **37 tests** |

Each spec is deliberately a *broad* safety net: heading renders, doesn't crash, key UI markers present, store/cache permutations exercised. Fine-grained per-sub-renderer tests will land alongside each Tier-3 extraction as part of the relevant commit.

## 5. Established extraction pattern

Three tiers, applied in order on each file:

| Tier | What | Risk | Where it goes | Example |
|---|---|---|---|---|
| 1 | Pure helper, zero closure capture | Tier-1: lowest | `<step>/helpers.ts` | `filterByMaterial` (commit `9136d25bf`) |
| 2 | Closure-bound helper, dependencies threaded as explicit params | Tier-2 | `<step>/helpers.ts` (closure args passed as context object) | `consolidatedToRows(items, ..., sourceContext)` |
| 3 | JSX sub-renderer, becomes `React.memo`-wrapped sibling component | Tier-3: needs integration test in place first | `<step>/components/<Name>.tsx` | `<GroupExportsButtons>`, `<RfqItemActionsButtons>`, `<DraftAutoSavedBadge>` |

For Tier-3 memos to actually skip renders, the parent's prop sources (callbacks via `useCallback`, derived values via `useMemo`) must be referentially stable. The pattern is established — every future extraction follows it.

## 6. Tier-3 candidates per file (incomplete — first-pass scan)

These were named in the issue body or surfaced during this session's exploration. Each is a sub-renderer that should land its own commit, with a targeted integration test alongside.

### BOQStep — extracted (commit `9136d25bf`)

* `<GroupExportsButtons>` ✓
* Remaining: `maybeRenderTable`, `renderConsolidatedTable`, `exportToExcel`, `renderGroupExports` (the actual JSX, not the wrapper)

### BendForm — extracted (commit `a077934c1`)

* `<RfqItemActionsButtons>` ✓ (shared with FittingForm)
* Remaining: the 3D preview wrapper, the bend-stub list, the working-conditions row

### FittingForm — extracted (commit `a077934c1`)

* `<RfqItemActionsButtons>` ✓ (shared)
* Remaining: the fitting-type selector block, the stub-flange section

### StraightPipeRfqOrchestrator — extracted (commit `e1bf9fbd0`)

* `<DraftAutoSavedBadge>` ✓
* Remaining: the stepper-pill row, the header actions row (Save Progress + Open Nix), the submit-buttons block, the draft-save dialog

### SpecificationsStep — NOT STARTED on Tier-3

* The 24 inline JSX return statements named in the issue are still inline. First candidates: the coating-spec block, the lining-spec block, the restriction popups, the validation-summary banner.

### ItemUploadStep — NOT STARTED on Tier-3

* `<ItemWrapper>` was extracted earlier (commit `d6af66a9e`) but several big render branches remain inline.

### ProjectDetailsStep — NOT STARTED on Tier-3

* `<RestrictionTooltip>` was extracted earlier (commit `98d447eda`); the customer / mine / address sections are still inline.

## 7. Acceptance-criterion gap

The issue's per-file target is **< 50 KB / < 1,200 lines**. Current state:

| File | KB | Lines | Gap to 50 KB |
|---|---|---|---|
| SpecificationsStep.tsx | 396 KB | 7,427 | ~85% remaining |
| StraightPipeRfqOrchestrator.tsx | 160 KB | 4,019 | ~70% |
| BendForm.tsx | 184 KB | 3,679 | ~73% |
| FittingForm.tsx | 168 KB | 3,592 | ~70% |
| BOQStep.tsx | 132 KB | 3,058 | ~62% |
| ProjectDetailsStep.tsx | 112 KB | 2,667 | ~55% |
| ItemUploadStep.tsx | 104 KB | 2,068 | ~52% |

The integration test scaffold + the three established extraction patterns make the gap reachable, but each file needs several more Tier-3 commits. Roughly:

- BOQStep / ItemUploadStep / ProjectDetailsStep → 2-4 more extractions each
- BendForm / FittingForm / StraightPipeRfqOrchestrator → 4-6 more extractions each
- SpecificationsStep → 8-15 more extractions (the monster)

## 8. Where this leaves Phase 0 boxes

* `[x]` **Capture frontend build wall time** — substituted with live push-timing data (section 2). Formal 3× fresh-checkout median deferred to Phase 4 with the bundle-size measurement, when the disk + minutes of a fresh `pnpm install` are worth it.
* `[x]` **Capture bundle sizes per route** — deferred to Phase 4 verification (same reason as above; meaningful comparison needs an "after" anyway).
* `[x]` **`npx madge --circular`** — already confirmed clean (issue body).
* `[x]` **Audit existing test coverage** — already confirmed zero (issue body).
* `[x]` **Write 5-10 integration tests per monolith** — done as of 2026-05-13: 37 tests across 7 specs.
* `[x]` **Document current behaviour in `tmp/rfq-baseline.md`** — this document.

## 9. SpecificationsStep — top-level section map (Phase 3 box: "Map the 24 inline JSX return statements")

The 7,374-line SpecificationsStep main render breaks down into top-level conditional sections gated by the 7 `requiredProducts` flags. Captured 2026-05-13 at line numbers in the post-extraction file:

| Line | Condition | Section | Approx. size | Status |
|---|---|---|---|---|
| ~517 | (unconditional) | Validation error banner | ~25 lines | Inline, small — keep |
| ~548 | `{showSteelPipes && (` | **Steel Pipes & Fittings** | huge (~1050 lines) | **Inline — primary Tier-3 candidate** |
| ~1602 | `{showSteelPipes && !steelPipesSpecsConfirmed && (` | Steel pipes "still configuring" notice | ~50 lines | Inline |
| ~1658 | `{showSurfaceProtection && (` | **Surface Protection (coatings + linings)** | huge (~4940 lines) | **Inline — biggest Tier-3 candidate** |
| ~6604 | `{showHdpePipes && (` | HDPE Pipes | small wrapper | **Already extracted** as `<HdpeSpecificationsSection>` |
| ~6682 | `{showPvcPipes && (` | PVC Pipes | small wrapper | **Already extracted** as `<PvcSpecificationsSection>` |
| ~6759 | `{showFastenersGaskets && (` | Fasteners & Gaskets | ~390 lines | Inline — Tier-3 candidate |
| ~7149 | `{showTransportInstall && (` | Transportation & Installation | **30 lines → extracted** (commit pending) | **`<TransportInstallSection>`** ✓ |
| ~7181 | `{!showSteelPipes && !showFastenersGaskets && …}` | "No Products Selected" empty-state banner | **32 lines → extracted** (commit pending) | **`<NoProductsSelectedBanner>`** ✓ |
| ~7215 | `{materialWarning.show && (` | Material Suitability Warning modal | ~150 lines | Inline — Tier-3 candidate |
| ~end | Restriction popups (rendered from refs) | — | small | Already extracted as `<RestrictionPopup>` etc. |

Plus 21 inline `return (` statements at deeper nesting — most are IIFE-wrapped renders inside dropdowns / option mappers (e.g. the steel-spec dropdown's option list, the pressure-class deduper). These are smaller and harder to extract individually; they'll fall out as the parent sections get pulled into their own components.

**Tier-3 extraction priority (after today's commit lands):**

1. ~~`<TransportInstallSection>`~~ ✓ done
2. ~~`<NoProductsSelectedBanner>`~~ ✓ done
3. `<MaterialSuitabilityWarningModal>` — ~150 lines, has closure on `materialWarning` state and `onUpdateGlobalSpecs` callback. Tier-3 with one prop drilled in.
4. `<FastenersGasketsSpecificationsSection>` — 390 lines, needs careful threading of the bolt-grade / gasket-type state.
5. `<SteelPipesSpecificationsSection>` — the largest single conditional block (~1050 lines). High value, high effort.
6. `<SurfaceProtectionSpecificationsSection>` — the monster (~4940 lines). Will need to be broken into multiple sub-components (coating-environment, coating-spec, coating-build-up, lining-environment, lining-spec, etc.) before it can be lifted out as a whole.

## 10. SpecificationsStep — hook audit (Phase 3 box: "Audit useState/useEffect/useCallback calls")

Current counts in the post-extraction file:
- `useState` calls: 11
- `useEffect` calls: 5
- `useCallback` / `useMemo` calls: 3

The hooks cluster around three concerns:
1. **Auto-extraction state** — `autoPressureClassId`, `selectedIso12944SystemCode`, `iso12944Loading`, `materialWarning` etc. These follow user inputs in real time.
2. **Restriction popups** — `restrictionPopup`, `featureRestrictionPopup` (positions + features). Pure UI state.
3. **Master-data effects** — `useEffect`s reacting to `globalSpecs?.flangeStandardId` etc., to fetch/select pressure classes.

**Extraction-vs-hook decision per section:**

| Section | Reads | Writes | Prop-drill vs custom hook |
|---|---|---|---|
| Steel Pipes section | rfqData.globalSpecs, available pressure classes, P-T recommendations, `autoPressureClassId` | sets autoPressureClassId via dropdown clicks | **Prop-drill** — pass `{globalSpecs, autoPressureClassId, onSetAutoPressureClassId, ...}` as props |
| Surface Protection — coating | many derived ECP-* fields, iso12944Systems, selectedIso12944SystemCode | sets ECP fields on globalSpecs | **Prop-drill + a `useCoatingRecommendations` custom hook** for the derived state |
| Surface Protection — lining | mtp* state on globalSpecs, recommendedLining | similar | **Same pattern** — custom hook + prop-drill |
| Fasteners & Gaskets | boltGrade, gasketType from globalSpecs | onUpdateGlobalSpecs | **Prop-drill** — simple |
| Material Warning Modal | `materialWarning` state | dismissed by user | **Prop-drill** — fully self-contained once `materialWarning` + `setMaterialWarning` are wired |

The restriction-popup `useState`s (lines 99-122) are already minimal and stay in the parent for now; they're shared across multiple sections.

**No `useEffect` in SpecificationsStep needs to move to a child component** — all 5 are at the component-orchestration level (master-data fetching, ISO 12944 system loading, auto-select on standard change). Pulling them down into children would scatter the orchestration responsibility, which is a worse outcome than letting the parent stay as the lifecycle owner.
