# Annix Investments — Brand Positioning

**Last updated:** 2026-05-29

This is the canonical source for Annix Investments' corporate brand positioning — the master tagline, the outcome statements, the vision, and the per-brand strapline system. Draw on it whenever you need a statement about the company, or when populating brand copy anywhere on the site.

## The positioning principle

Annix Investments is positioned by **what it does, not what it owns.**

Holding companies often list industries — *Mining • Software • Education • Investments*. That reads fine today but breaks the moment the next product launches. The Annix portfolio is already broader than any fixed industry list, so the master brand leads with action and outcome instead:

> **Build • Connect • Innovate • Grow**

Every product in the portfolio follows the same structure — **four action words + one outcome sentence** — while keeping its own identity. That repeatable pattern *is* the brand system.

---

## Master brand — Annix Investments

**Strapline (live):**

> Build • Connect • Innovate • Grow

**Outcome statement — Recommended (live):**

> Creating intelligent platforms that help businesses work smarter, move faster, and grow stronger.

The Recommended line is the canonical master statement. The two corporate variants below say the same thing for different audiences — use them where the context calls for it (investor decks, formal corporate copy). They are not stored live in the branding system; pull them from here as needed.

**Outcome statement — Short corporate** (investor / holding-company framing):

> Investing in technology, people, and businesses that create lasting value.

**Outcome statement — Premium corporate** (names the breadth explicitly):

> Building the next generation of intelligent business platforms across industry, education, finance, and technology.

### Vision statement

> Our vision is to create a portfolio of intelligent platforms that simplify complexity, unlock opportunity, and empower people and businesses to achieve more.

---

## Per-brand strapline system

The pattern for every product: **four action words** (the strapline / `tagline`) **+ one outcome sentence** (the `description`).

The table below records the system. **Only the Annix Investments master is currently applied** — the candidate columns for the other brands are proposals kept here for reference, not live values. Several products already carry their own straplines (Orbit, Sentinel), so changing those is a deliberate decision, not a default.

| Brand | Brand code | Strapline (candidate) | Outcome sentence (candidate) | Status |
|---|---|---|---|---|
| **Annix Investments** | `annix-investments` | Build • Connect • Innovate • Grow | Creating intelligent platforms that help businesses work smarter, move faster, and grow stronger. | **Live (master)** |
| Annix Forge | `annix-forge` | Quote • Build • Inspect • Deliver | Where industrial projects take shape. | Candidate |
| Annix Pulse | `annix-rep` | Discover • Connect • Analyze • Win | Transform conversations into customers. | Candidate |
| Annix Orbit | `annix-orbit` | Explore • Plan • Learn • Achieve *(alt: Discover • Prepare • Apply • Succeed)* | — | Candidate — currently live as "Hiring • Talent • Compliance" |
| Annix Insights | `annix-insights` | Analyze • Invest • Monitor • Grow | Making smarter investment decisions through data and AI. | Candidate (marked "eventual") |
| Annix Sentinel | `annix-sentinel` | — | — | Live as "AI-Powered Compliance & Risk Intelligence" |

> Note: "Annix Sync" appears in earlier positioning drafts (*Connect • Automate • Integrate • Scale*) but is **not a registered brand** in the system — the live brand codes are `annix-investments`, `annix-forge`, `annix-rep`, `annix-orbit`, `annix-insights`, `annix-sentinel`. Treat the Sync strapline as aspirational copy until/unless a brand is created for it.

### How the ecosystem reads together

> **Annix Investments** — Build • Connect • Innovate • Grow
> *Creating intelligent platforms that help businesses work smarter, move faster, and grow stronger.*
>
> **Annix Forge** — Quote • Build • Inspect • Deliver
> *Where industrial projects take shape.*
>
> **Annix Pulse** — Discover • Connect • Analyze • Win
> *Transform conversations into customers.*

---

## How this maps to the branding system

This positioning is not hardcoded anywhere — it lives in the dynamic per-app branding system, with `annix-investments` as the master brand that every other brand inherits from.

| Concept here | Branding field | Notes |
|---|---|---|
| Strapline (`Build • Connect • Innovate • Grow`) | `tagline` (≤ 200 chars) | Inheritable scalar field |
| Outcome statement | `description` (unlimited text) | Inheritable scalar field |

- **Master record:** `app_branding` document with `_id = "annix-investments"` (`MASTER_BRAND_CODE` in `annix-backend/src/branding/branding.constants.ts`). `tagline` and `description` are both in `INHERITABLE_SCALAR_FIELDS`, so any sub-brand that leaves them blank inherits the master values.
- **Frontend read:** `useBranding("annix-investments")` from `@/app/lib/query/hooks` returns the live `Branding` (`tagline`, `description`, …).
- **Backend read:** `AppBrandingService.branding("annix-investments")`.
- **Public read (unauthenticated):** `GET /public/branding/annix-investments` via `fetchPublicBranding`.

## How to apply / update the live master line

Two ways to set or change the live master positioning:

1. **Brand Center (no code, recommended):** go to `/admin/portal/branding/annix-investments`, set
   - **Tagline** → `Build • Connect • Innovate • Grow`
   - **Description** → the Recommended outcome statement above
   and save. Sub-brands that leave those fields blank inherit it automatically.

2. **Seed script (fresh / non-prod databases):** `scripts/seed-mongo-branding.mjs` upserts the `app_branding` collection. It uses `$setOnInsert`, so it only populates brands that don't yet exist — it will **not** overwrite an existing master record. To change a record that already exists, edit it in the Brand Center (option 1) or run a one-off `$set` update against the `app_branding` document keyed by `_id: "annix-investments"`.

When you change any of the master copy here, also update it in the Brand Center so the live site and this doc stay in sync.

## Annix Forge — submodule naming convention (issue #320 Phase 3)

The platform formerly surfaced as "RFQ" is **Annix Forge**. As the suite grows
(see #319: Projects → Quality → Traceability), the modules read as **Forge
&lt;Module&gt;**: Forge RFQ · Forge BOQ · Forge Projects · Forge Procurement ·
Forge Quality · Forge Trace · Forge Analytics · Forge AI.

**The rule — name the _product_ in the "Forge X" form; keep the _work_
domain-plain.** RFQ and BOQ are recognised industry terms; renaming a list of a
customer's requests from "My RFQs" to "Forge RFQ" loses meaning and churns a
flow Phase 1 deliberately left alone (LIST B). So:

- **Use the `Forge <Module>` form** where you are naming the module *as a
  product or capability*: the admin app hub, marketing / about / onboarding
  copy, docs, and the **landing / intro surface of a module that has no
  established domain term** (Forge Projects, Forge Procurement, Forge Quality,
  Forge Trace, Forge Analytics). Apply it on each such module's first
  user-facing surface *as that module lands*.
- **Keep domain-plain** for navigation labels, action buttons, list/table
  headers, empty states and page `<h1>`s of the existing modules — "My RFQs",
  "New RFQ", "Create RFQ", "BOQ Requests", "Submitted BOQs". These already sit
  under the Forge brand via the toolbar wordmark and the `… | Annix Forge`
  page-title template (Phase 1/2), so the brand framing is present without
  renaming the work itself.
- **Forge AI** is the umbrella name for the AI capability; the in-product
  assistant a user talks to stays **Nix** ("Ask Nix", "Open Nix"). Use "Forge
  AI" only in product/marketing framing, never as the assistant's in-chat name.

Per-module decision (current modules):

| Module | "Forge X" surfaces | Stays domain-plain |
|---|---|---|
| Forge RFQ | admin hub, marketing/docs, page-title template | "My RFQs", "New RFQ", "Create RFQ", RFQ list/empty-state headers |
| Forge BOQ | admin hub, marketing/docs, page-title template | "BOQ Requests", "Submitted BOQs", BOQ list/empty-state headers |
| Forge Projects / Procurement / Quality / Trace / Analytics | the module's landing + nav label, applied as it ships (no domain term to preserve) | — |
| Forge AI | product / marketing framing of the AI capability | the assistant stays "Nix" everywhere a user interacts with it |
