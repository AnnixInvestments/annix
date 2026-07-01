---
name: futurepath
description: Build or resume the Annix Orbit "FuturePath" education→funding lifecycle (backend sibling module `annix-orbit-education`, frontend sections under `annix/orbit/education/`) per GitHub issue #304. Use when working on orbit-education: student/parent/teacher roles, education profiles, academic results, guardian consent, per-institution scoring, scholarships, the grounded AI mentor, or the education→candidate hand-off. Carries the decided architecture (gates D1–D6 answered), the reuse map, guardrails, and the phased build plan.
---

# Annix Orbit — FuturePath (orbit-education)

Extends Annix Orbit **upstream** into the school→subjects→career→university→funding→applications→internships lifecycle, feeding graduates into Orbit's existing employment engine (candidate → job-match → interview → employer). Tracked in **issue #304**.

**It is NOT a new app.** No new admin card, no new login, no separate portal. It is **role-scoped sections inside Orbit** (new roles: student / parent / teacher; employer already exists) sharing one data model and Orbit's existing services.

## Decisions (gates D1–D6 — all answered on #304, do not re-litigate without the owner)

- **D1 — FE placement:** Dedicated area `annix-frontend/src/app/annix/orbit/education/` (student/parent/teacher sub-routes). Learner→candidate continuity is the Phase 4 hand-off, not a merged tree.
- **D2 — DB target:** Build on the **current TypeORM/Postgres** stack now (TypeORM entities + `pnpm migration:generate`). #298 (Mongo) is an open proposal only; migrate with the rest if it ever lands.
- **D3 — Identity:** Reuse Orbit's existing **public registration** with a new `student` account type (no new login/signup). Under-18s **invite a guardian** by email who confirms the consent row before any processing; a `guardian_link` row joins them; 18+ proceed without a guardian.
- **D4 — Consent:** **POPIA + GDPR** from day one (jurisdiction-aware: POPIA minor <18, UK-GDPR 13). Build the consent gate **jurisdiction-extensible** — see the FERPA/COPPA follow-up below.
- **D5 — Corridor:** Full corridor — **SA + UK + AU + CA + US + Online.**
- **D6 — Score schemes:** Encode **SA (UCT ~600-pt, Wits 54-pt, Stellenbosch %) + UK UCAS Tariff first**; ATAR (AU), provincial GPA (CA), GPA/SAT/ACT (US) as fast-follows.

### ⚠️ Open follow-up (not yet answered)
D5 includes the **US**, but D4 only covered POPIA+GDPR. Processing **US minors** needs **FERPA/COPPA**. Build the consent machinery jurisdiction-extensible now (POPIA/GDPR live, FERPA/COPPA slot ready); **do not onboard US minors** until FERPA/COPPA consent text + age thresholds are added. US dataset/scoring can be curated in parallel without onboarding US minors.

## Architecture (decided)

- **Backend:** new sibling module `annix-backend/src/annix-orbit-education/` (own `controllers/`, `services/`, `entities/`, `dto/`, `capabilities/`). It **imports and reuses** Orbit services — never duplicates them.
- **Frontend:** new sections under `annix-frontend/src/app/annix/orbit/education/` + `config/version.ts` (`ORBIT_EDUCATION_VERSION`, start `"0.1.0"`).
- **Reference data:** `packages/product-data/orbit-education/` (curricula enums, per-university score-scheme rules, career clusters). Register it in `docs/shared-registry.md` in the same commit.

## Reuse map (discovery confirmed — reuse, do NOT rebuild)

| Need | Reuse |
|---|---|
| Auth / registration | `annix-orbit/controllers/auth.controller.ts` + `services/auth.service.ts` |
| Consent / minors | `annix-orbit/services/popia.service.ts` + `entities/annix-orbit-ee-consent-text-version.entity.ts` |
| AI (Gemini only) | `nix/ai-providers/ai-chat.service.ts` via `NixModule`; parse output with `nix/ai-providers/ai-json.ts` (`parseAiJson`/`parseAiJsonObject`/`parseAiJsonArray`). **Never** add a new AI abstraction or call the Claude/Anthropic API directly. |
| Employment bridge (Phase 4) | `annix-orbit/services/job-match.service.ts`, candidate / seeker-jobs / interview / reference services |
| RBAC | `rbac/entities/` (`app`, `app-role`, `user-app-access`, permissions) — add student/parent/teacher roles to the **existing Orbit app**; don't mint a new app |
| Shared utilities | `annix-backend/src/lib/`: `datetime.ts`, `base-crud.service.ts`, `entity-helpers.ts`, `pdf-builder.ts`, `app-storage-helper.ts`, `reference-data/` |
| Long-running AI ops (FE) | `useAdaptiveExtractionProgress` / `ExtractionProgressModal` (brand `annix-orbit`) per CLAUDE.md |

## Guardrails (these prevent feature drift — honor in every feature)

- **Honest over impressive** — no fabricated probabilities/fees/deadlines. Show **likelihood bands (Reach / Match / Safe) + uncertainty + sources**, never a fake `%`.
- **Grounded AI only** — the mentor reasons over *our curated DB rows*, never free-hallucinates requirements/deadlines/scholarships. Log every AI answer to `ai_advice_log`. "Not a substitute for a counselor" framing.
- **Consent before data** — no minor's profile processed without a recorded guardian-consent row (jurisdiction-aware).
- **Recommendation firewall** — monetization (lead-gen) NEVER influences ranking. Paid placement, if ever introduced, is labelled and ranking-independent. (`ee-firewall.spec.ts` is the pattern.)
- **Curate, don't scrape-everything** — quality over coverage; **annual** refresh (admission cycles), not daily. Do NOT scrape/commercially use QS/THE rankings (license-restricted).

## Build plan & status

Phase 0 discovery-first protocol is **done** (#304 box ticked). Gates D1–D4 unblock the rest of Phase 0; D5/D6 unblock Phase 1. Build in this order, **commit after each coherent slice**, add a how-to guide + version bump per user-facing feature:

**Phase 0 — Foundation (now buildable):**
1. Scaffold `annix-orbit-education/` module (import Orbit auth/POPIA/profile services + `NixModule`, `MetricsModule`, `StorageModule`).
2. Add student/parent/teacher RBAC roles to the Orbit app + `annix-orbit-education.capabilities.ts`.
3. Entities + first migration `OrbitEducationInit`: `education_profile`, `academic_result`, `guardian_link`, `consent` (extend Orbit's consent-version machinery).
4. Guardian-consent gate (POPIA + GDPR, jurisdiction-extensible) — block processing any under-threshold profile without a valid `consent` row.
5. AI mentor scaffold: inject `AiChatService`; add `ai_advice_log` + a grounding-context builder (curated DB rows only).
6. FE scaffold under `annix/orbit/education/` + `config/version.ts`; `lib/api/orbitEducationApi.ts` + TanStack keys/hooks; first how-to guide.

**Phase 1 — MVP decision engine:** education-profile capture (curriculum enum NSC/IEB/Cambridge/IB/GCSE/A-Level/US-GPA/Other), academic-results capture, `product-data/orbit-education/` schemes (D6 order), per-institution scoring service (flexible requirement spec — NOT one APS integer), curated institutions/programmes + admin CRUD, recommendation engine (Reach/Match/Safe + reasoning + sources, firewall asserted), application tracker, curated scholarships (`lastVerifiedAt`), grounded AI mentor, career-interest flow.

**Phases 2–5:** marks planner, career simulation, alt pathways, ROI/affordability, parent dashboard, geo expansion (AU+CA then US), teacher/cohort + school analytics + per-seat licensing, employment bridge (map `education_profile`→candidate, reuse job-match/employer flows), migration/visa layer + US College Scorecard.

## Non-goals

Separate app/login/admin card · scraping every university or daily refresh · fabricated admission % · QS/THE commercial use · rebuilding employer/jobs (reuse) · a new AI provider or Claude/Anthropic API direct calls (Gemini via `AiChatService` only).

## References

Issue #304 · Orbit BE `annix-backend/src/annix-orbit/` · Orbit FE `annix-frontend/src/app/annix/orbit/` · AI `nix/ai-providers/ai-chat.service.ts` · Consent `annix-orbit/services/popia.service.ts` · Related #298 (Mongo, blocks D2 if revisited), #301/#303 (Orbit in flight).
