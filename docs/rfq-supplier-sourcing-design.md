# RFQ Supplier Sourcing Assistant — Phase 0 Design (Taxonomy + Crosswalk)

Design foundation for GitHub issue #432. Phase 0 output: the locked decisions, the canonical
taxonomy, the vocabulary crosswalk, and the size/pressure/material matching approach that Phase 1
implements. **No production code is written in Phase 0** — this document is the spec Phase 1 builds
against.

> Feature in one line: a user drops a list/drawing into Nix; Nix extracts line items, matches them to
> suppliers, and produces a per-supplier draft email containing only that supplier's relevant items,
> which the user reviews and sends.

## 1. Locked decisions (Phase 0)

| # | Decision | Choice | Consequence for Phase 1 |
|---|---|---|---|
| D1 | Supplier universe | **Both** — registered auto-matched **and** preferred manual-assign | Two match paths, one review UI. Auto-match only runs against `SupplierProfile` + `SupplierCapability`; `CustomerPreferredSupplier` (name/email only) is offered for **manual** assignment, never AI-matched. |
| D2 | Owning app | **RFQ / internal procurement** | Net-new value (RFQ has no direct supplier-send today; it routes through linked BOQs). Lives under the RFQ module. RFQ has no RBAC yet (#413) — sourcing endpoints must be written so an RBAC guard can be dropped in later. |
| D3 | Send model | **Draft-then-send, permanent — architected to allow a future gated auto-send** | Phase 1 ships human-confirm-per-supplier. Persist enough (audit entity, per-supplier decision records) that a future auto-send gate is an additive guard, not a rewrite. |
| D4 | Match depth | **Category + size/pressure/material** | Match is a two-stage funnel: canonical category first (must-match), then size/pressure/material as **narrowing/ranking signals** (see §5). Requires a supplier-field parser. |

## 2. The canonical taxonomy

The canonical category set is the existing **`VALID_CAPABILITIES`** (9 keys) from
`annix-backend/src/boq/config/capability-mapping.ts`. This is deliberately the same vocabulary that
`SupplierCapability.productCategory` already uses (its "new unified" values) — so the match target
needs **no new enum**, and the existing BOQ section→capability map is reused.

```
fabricated_steel      steel pipes, bends, tees, reducers, flanges, fittings, spools
fasteners_gaskets     bolts, nuts, washers, stud sets, gaskets
surface_protection    rubber lining, ceramic lining, coating, painting, galvanizing
hdpe                  HDPE pipe & fittings
pvc                   PVC / uPVC pipe & fittings
structural_steel      structural steelwork, steel structures
valves_instruments    valves + in-line instrumentation
pumps                 pumps, pump parts/spares/repairs/rental
transport_install     service capability (no procurement items map here)
```

**Canonical category is the only MUST-MATCH signal.** Size, pressure and material narrow and rank
*within* a matched category (§5); they never move an item across categories.

### 2.1 Known coarseness (recorded, handled by §5, not by new categories)

- `surface_protection` lumps rubber-lining + ceramic + coating — different suppliers. Narrowed by the
  `liningType` / `coatingSystem` sub-signal, not by adding categories.
- `valves_instruments` lumps valves + instruments — narrowed by item `itemType` (valve vs instrument).
- Adding finer canonical categories is **out of scope** — it would fork from the supplier-side enum
  and break the zero-new-enum property. Refinement lives in the sub-signal layer.

## 3. Source vocabularies being reconciled

Five vocabularies exist today. The crosswalk (§4) maps all item-side vocabularies **into** the
canonical set.

| Vocab | Where | Purpose |
|---|---|---|
| **A. `AiExtractedItem.itemType`** | `nix/ai-providers/ai-provider.interface.ts` | Raw Gemini output. TS union is narrow (`pipe, bend, reducer, tee, flange, expansion_joint, tank_chute, unknown`); the extraction **prompt** emits a wider set (`valve, pump, instrument, consumable, lateral, end_cap` …). Treat as loose string. |
| **B. `ExtractedItem` fields** | `nix/services/excel-extractor.service.ts` | UI/processing shape. Adds `liningType` (`rubber, ceramic, hdpe, pu, glass_flake`) and richer `itemType` values (`valve, pump, instrument, consumable, wrapping, upvc, puddle_pipe, boot, skid`). |
| **C. Nix bundle keys** | `nix/profiles/rfq-piping-profile.handler.ts` → `bundleKeyFor()` | Already collapses A+B+description heuristics into ~20 supplier-oriented buckets. **This is the crosswalk's primary input.** |
| **D. BOQ section types** | `boq/config/capability-mapping.ts` | ~35 section keys already mapped → canonical via `BOQ_SECTION_TO_CAPABILITY`. Reused as-is. |
| **E. `RfqItemType`** | `rfq/entities/rfq-item.entity.ts` | Structured RFQ line-item enum (`straight_pipe, bend, fitting, flange, valve, instrument, pump, surface_protection, tank_chute, fastener, expansion_joint, pipe_steel_work, custom`). |

**Design choice:** the RFQ profile already runs `bundleKeyFor()` in `postExtract`, so the cheapest,
most accurate route to a canonical category is **bundle key → canonical** (vocab C → target). Raw
`itemType` (vocab A/E) is only used as a fallback when no bundle key is available (other profiles).

## 4. The crosswalk

### 4.1 Primary: Nix bundle key → canonical category

| Bundle key (vocab C) | Canonical category | Sub-signal carried forward |
|---|---|---|
| `valves-pinch`, `valves-gate`, `valves-other` | `valves_instruments` | valve pattern (from desc) |
| `valve-accessories` | `valves_instruments` | hand-pump / accessory |
| `instruments` | `valves_instruments` | `instrument` (supply-by-others flag) |
| `consumables-gaskets`, `consumables-bolts` | `fasteners_gaskets` | gasket vs bolt |
| `consumables-coating` | `surface_protection` | coating |
| `consumables-other` | `fasteners_gaskets` | ⚠ review bucket if ambiguous |
| `pipe-wrapping` | `surface_protection` | wrapping |
| `upvc-specials` | `pvc` | — |
| `hdpe-puddle-pipes`, `hdpe-boots`, `hdpe-pipe-fittings` | `hdpe` | — |
| `pu-lined-steel` | `surface_protection` **+** `fabricated_steel` | dual-route (§4.3) |
| `rubber-lined-steel` | `surface_protection` **+** `fabricated_steel` | dual-route (§4.3) |
| `mild-steel` | `fabricated_steel` | — |
| `fabricated-skids` | `fabricated_steel` | — |
| `tanks-chutes` | `fabricated_steel` (or `structural_steel` if `assemblyType` structural) | assembly type |
| `other` | **unmatched review bucket** | — |

### 4.2 Fallback: raw item type → canonical (when no bundle key)

| `itemType` / `RfqItemType` | Canonical category |
|---|---|
| `pipe`, `straight_pipe`, `bend`, `reducer`, `tee`, `flange`, `fitting`, `expansion_joint`, `pipe_steel_work` | `fabricated_steel` |
| `valve`, `instrument` | `valves_instruments` |
| `pump` | `pumps` |
| `consumable`, `fastener` | `fasteners_gaskets` |
| `surface_protection` | `surface_protection` |
| `tank_chute` | `fabricated_steel` |
| `unknown`, `custom`, anything else | **unmatched review bucket** |

Material override: if `materialType` / `material` resolves to HDPE → `hdpe`, PVC/uPVC → `pvc`
(a "pipe" made of HDPE is an `hdpe` item, not `fabricated_steel`).

### 4.3 Dual-route items (lined steel)

A rubber-lined or PU-lined steel pipe legitimately needs **two** suppliers: the steel fabricator
(`fabricated_steel`) **and** the lining applicator (`surface_protection`). The matcher emits the item
into **both** category buckets; the per-supplier split (Phase 1) then places the item on both
suppliers' draft emails, each seeing the same line with a role note ("supply steel" vs "apply
lining"). This is intended, not a bug — flag it clearly in the review UI so the reviewer confirms the
split of scope.

### 4.4 Reused as-is

`BOQ_SECTION_TO_CAPABILITY` (vocab D → canonical) is already correct and stays the source of truth for
any BOQ-originated flow. The new RFQ crosswalk (§4.1/§4.2) is the item-level analogue for
Nix-extracted RFQ items.

## 5. Size / pressure / material matching (D4)

Two-stage funnel. **Stage 1 (category) is a hard filter; Stage 2 narrows and ranks — it never
excludes on missing data** (a supplier with blank size range is not penalised, only un-boosted).

### 5.1 Item-side signals available

| Signal | Item source | Availability |
|---|---|---|
| Diameter (mm) | `AiExtractedItem.diameter` (+ `secondaryDiameter`) | Good — structured |
| Material | `AiExtractedItem.material` / `materialGrade`, `RfqItem.materialType` | Free text — needs normalisation |
| Pressure class | **Not a structured field** — lives in `description` / `schedule` / `wallThickness` | Weak — best-effort parse only |

### 5.2 Supplier-side signals (all free text today — need a parser)

| Field | Example values | Parse to |
|---|---|---|
| `SupplierCapability.sizeRangeDescription` | `"DN15 - DN600"`, `"6\" - 48\""` | `{ minMm, maxMm }` (convert inch→mm ×25.4, DN→mm) |
| `SupplierCapability.pressureRatings` | `"PN10 - PN40"`, `"150# - 600#"` | `{ minClass, maxClass }` on a normalised scale |
| `SupplierCapability.materialSpecializations[]` | enum `carbon_steel, stainless_steel, alloy_steel, hdpe, pvc, rubber, other` | direct enum compare |

### 5.3 Matching rules

- **Diameter:** if the parsed supplier range exists and the item diameter falls outside it → **strong
  demote** (do not silently drop; surface as "size out of range" so the reviewer can override). Inside
  range or range absent → no penalty.
- **Material:** normalise item material to `MaterialSpecialization` (`carbon steel`/`mild steel`/
  `S355`/`API 5L` → `carbon_steel`; `316`/`SS`/`stainless` → `stainless_steel`; `HDPE`/`PE100` →
  `hdpe`; etc.). If the supplier lists specialisations and the item's material isn't among them →
  demote. Empty supplier list → no penalty.
- **Pressure:** best-effort only in Phase 1. Parse a pressure token from the item description/schedule
  when present; if both sides parse and item exceeds supplier max → demote. Missing on either side →
  no penalty. **Documented as coarse** — do not over-invest until real data shows it pays off.
- **Output:** the matcher returns, per (item, supplier) pair, a `matchScore` and a list of
  `matchReasons` / `matchWarnings` (e.g. "size out of range", "material not listed"). The review UI
  shows these so a human ranks/overrides. No pair is auto-dropped on Stage-2 signals alone.

### 5.4 `capabilityScore` reuse

`SupplierCapability.capabilityScore` (0–100) is an existing tiebreak — fold it into ranking so
better-documented/certified suppliers sort first when category+size+material are equal.

## 6. Two-path matching design (D1)

```
extracted items ──▶ canonical category (crosswalk §4)
                      │
      ┌───────────────┴───────────────┐
      ▼                               ▼
 AUTO PATH (registered)          MANUAL PATH (preferred/external)
 SupplierProfile + Capability    CustomerPreferredSupplier (name/email only)
 tenant-scoped join on category  reviewer picks supplier(s) per item bucket
 + §5 size/pressure/material     no AI matching (no capability data to match on)
 − CustomerBlockedSupplier       − CustomerBlockedSupplier
      │                               │
      └───────────────┬───────────────┘
                      ▼
        per-supplier item split (one bucket per supplier)
                      ▼
        draft email per supplier  ──▶  HUMAN REVIEW (per supplier)  ──▶ send
```

**Hard invariants (carried from #432 guardrails, restated because §6 is where they bind):**
- Candidate suppliers for the AUTO path are scoped to the requesting customer's own
  `companyId`-scoped set — **never** the BOQ platform-wide `findApprovedWithSupplier` set.
- The recipient email is resolved **server-side** from the matched/selected supplier record. AI output
  may reference a supplier only by an **index into a server-provided candidate list** — never a
  free-text address, never an address read from the dropped document.
- `CustomerBlockedSupplier` is applied on **both** paths.
- Unmatched / `other` / low-confidence items land in an explicit review bucket, never dropped.

## 7. Future auto-send seam (D3)

Phase 1 persists, per sourcing run: the matched/selected supplier, resolved recipient, item ids in
scope, `matchScore`/warnings, the drafted vs edited body, approver user, and message-id (the audit
entity in #432). A future auto-send gate is then **additive**: replace the human-confirm step with a
policy check (e.g. "auto-send only when every item is category-matched, in size range, above score X,
supplier not blocked, run under N recipients") that writes the same audit record with
`approver = system`. No schema rework — the decision record already exists. Do **not** build the gate
now; just don't design it out.

## 7a. Persistence (annix-devops reviewed)

Storage shape approved by the `annix-devops` gate (overriding the earlier "embed both to save a
collection" lean):

- **Sourcing plan → embedded** as *optional* props on the existing `NixExtractionSession`
  (`src/nix/schemas/nix-extraction-session.schema.ts`). 1:1 with the run, mutable draft state (reviewer
  reassigns until sent), reached via the already-indexed `_id` (a `Number`). Additive only — no new
  required fields, no backfill, no migration.
- **Send-audit → its own core collection** `rfq_sourcing_send_audits`. Embedding an immutable
  POPIA record on a mutable, review-rewritten parent was rejected (unbounded-array growth on a hot doc
  + can't guarantee write-once). One record per email actually sent. **Insert-only, enforced in the
  repository** (no update/delete methods). Core cluster (`MONGODB_URI`), **never** Orbit; the name must
  not start with `orbit_`/`cv_assistant_` or the migration-routing guard trips.
- **One migrate-mongo migration** in `migrations-mongo/` (core) creating 3 non-unique indexes:
  `{companyId:1, createdAt:-1}`, `{sessionId:1}`, `{messageId:1}` — modeled on
  `migrations-mongo/20260625120000-inbound-email-message-id-index.ts` (idempotent `createIndex`/
  `dropIndex().catch()`). Required because the connection runs `autoIndex:false`/`autoCreate:false`.
- **No new env vars / Fly secrets / `fly.toml` change.** +1 collection passes the budget gate freely.
- **Feature-flag the send** — ship the collection + indexes dormant; gate the actual outbound send
  behind a flag so bucketing/matching are validated before any real supplier email goes out.

## 8. Phase 1 hand-off — what this spec turns into

1. A `supplierCategoryForItem(item)` resolver (crosswalk §4) living beside the RFQ profile — bundle
   key first, raw itemType fallback, dual-route aware, unmatched-bucket aware.
2. A capability-field parser (`sizeRangeDescription`, `pressureRatings` → ranges; material
   normaliser) for §5.
3. `RfqSourcingDistributionService`: category join (auto) + manual selection, tenant-scoped, blocked
   excluded, §5 scoring, dual-route split, unmatched bucket. Split persisted as embedded sub-docs on
   the Nix session/extraction (avoid a new collection — M0 cap).
4. Per-supplier review mode in `lib/nix/components/draft/` showing recipient + items + `matchWarnings`
   + editable body; reviewer reassigns/confirms per supplier.
5. Outbound send loop + audit entity + HTML-escaped bodies.

## 9. Open follow-ups surfaced during Phase 0 (not blockers)

- **`AiExtractedItem.itemType` TS union is narrower than the extraction prompt** (missing
  `valve/pump/instrument/consumable`). Not a blocker for us (we key off bundle keys), but worth
  tightening under a separate issue so the type reflects reality.
- **`ProductCategory` still carries legacy values** (`straight_pipe, bends, valves, coating, …`)
  alongside the unified set. Matcher must target the **unified 9** and treat legacy values as aliases
  (map `valves`→`valves_instruments`, `coating`→`surface_protection`, `straight_pipe`/`bends`/
  `flanges`/`fittings`→`fabricated_steel`) so older supplier rows still match.
- **Supplier capability data richness is the live risk** (from the feasibility study): size/pressure
  fields are free text and may be sparse. §5's "missing data never excludes" rule keeps the MVP honest
  until the data improves.
