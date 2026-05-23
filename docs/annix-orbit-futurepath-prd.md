# Annix Orbit — FuturePath PRD

**Status:** Draft v0.1 · **Owner:** AnnixInvestments · **Last updated:** 2026-05-23
**Execution tracker:** [#304](https://github.com/AnnixInvestments/annix/issues/304) (live task checklist + decision gates)

> This document is the *rationale and reference*. The phased checklist and the open decision gates live in issue #304 — that is the source of truth for "what to build next." When the two disagree, the issue wins for tasks; this doc wins for *why*.

---

## 1. Vision

Extend **Annix Orbit** upstream into the education→funding half of the student-to-career lifecycle, so a single product carries a person from school subject choices all the way through to employment and career growth.

```
School → Subjects → Career fit → University/Trade/Apprenticeship → Funding/Scholarships
  → Applications → Internships → Graduate jobs → Employment → Career growth
```

Target users: students ~13–25, their parents/guardians, their schools/teachers, and (already served by Orbit) employers.

**Thesis:** the advantage is **decision intelligence** — calibrated, explained, cross-border guidance — **not database size**. Competitive and feasibility research backs this: the crowded incumbents (Unifrog, BridgeU/Cialfo, Naviance/SCOIR, Studyportals) compete on coverage and school licensing; the white space is honest reasoning for the **South-Africa-origin student deciding across SA + UK/AU/CA + online**.

## 2. Why this is part of Orbit, not a new app

Annix Orbit **already implements the employment end** of this exact lifecycle: candidates, individual/trade profiles, job postings, a job market, AI job-matching, interview booking, references, credentials, an employer-facing portal, EE-compliance, a **POPIA service with versioned consent text**, and public/external registration.

FuturePath is the **missing upstream half** that feeds students into that existing engine. Therefore:

- The "user types" (Student / Parent / Teacher / Employer / Admin) are **roles/sections of one product**, not separate apps. Employer already exists; we add Student / Parent / Teacher roles.
- The brief's "Employer Portal / Graduate Jobs / Internship Matching" (its Phase 4/5) is **largely already built** — we *connect* to it, we don't rebuild it.
- No new login, no new admin global-apps card, no cross-app seams.

## 3. Architecture (decided)

| Concern | Decision |
|---|---|
| Backend code | **Sibling module** `annix-backend/src/annix-orbit-education/` (own `controllers/`, `services/`, `entities/`, `dto/`, `capabilities/`) that imports & reuses Orbit services — keeps the already-large `annix-orbit` module maintainable while staying one product. |
| Auth | Reuse Orbit's `auth.controller.ts` / `auth.service.ts`. *(Registration & guardian-linking specifics = decision D3.)* |
| Minors consent | Extend Orbit's `popia.service.ts` + `annix-orbit-ee-consent-text-version` machinery. |
| AI | Inject `NixModule` → `nix/ai-providers/ai-chat.service.ts`. **Gemini only** (CLAUDE.md). The provider abstraction already exists — do not build a new one or call Claude/OpenAI directly. |
| RBAC | Existing `App` / `AppRole` / `UserAppAccess`; add `student` / `parent` / `teacher` roles to the Orbit app. |
| Frontend | New sections under `annix-frontend/src/app/annix/orbit/`. *(Exact placement = decision D1.)* |
| Reference data | `packages/product-data/orbit-education/` (curricula enums, per-university score-scheme rules, career clusters). |
| DB / migrations | TypeORM + migrations (`pnpm migration:generate`). **Pending decision D2** — see #298 (Postgres→Mongo migration proposal). |
| Versioning | `config/version.ts` → `ORBIT_EDUCATION_VERSION`, bump on every functional commit. |
| Deploy | Rides the existing single Fly.io app; secrets via `fly secrets set`; migrations on release. |

## 4. Product principles (anti-drift guardrails)

1. **Honest over impressive.** No fabricated probabilities/fees/deadlines. Show **likelihood bands (Reach / Match / Safe) + uncertainty + sources**, never a fake `%`. Incumbents punt with descriptive scattergrams; our edge is honest explained reasoning. A confidently-wrong number to a minor is a *harm*.
2. **Grounded AI only.** The mentor reasons over *our curated data* (RAG-style); it never free-hallucinates requirements/deadlines/scholarships. Every AI answer is logged (`ai_advice_log`) for auditability. All AI advice carries a "not a substitute for a counselor" framing.
3. **Consent before data, always.** No minor's profile is processed without a recorded guardian-consent row. Jurisdiction-aware (POPIA / GDPR / FERPA / COPPA).
4. **Recommendation firewall.** Monetization (university lead-gen) **never** influences ranking. If paid placement is ever introduced, it is explicitly labelled and ranking-independent. NACAC documents the "fatal flaw" of pay-per-lead steering — this matters more when advising minors.
5. **Curate, don't scrape-everything.** Quality over coverage; launch corridor only; **annual** refresh aligned to admission cycles, not daily jobs.
6. **Reuse the platform.** Discovery-first protocol before any new shared code; reuse Orbit auth/POPIA/profiles/matching and `AiChatService`.

## 5. Data model (Phase 1 entities)

Designed around *"requirements are non-standard"* — store raw marks, evaluate per-institution at match time, model requirements as flexible specs (not one APS integer).

- `education_profile` — age/DOB, country, nationality, languages, school, `curriculum` enum (NSC / IEB / Cambridge / IB / GCSE / A-Level / US-GPA / Other)
- `guardian_link` — minor ↔ guardian account linkage *(shape depends on D3)*
- `consent` — `userId`, `type`, `jurisdiction`, `grantedByGuardianId?`, `grantedAt`, `evidence` (extends Orbit consent-version)
- `academic_result` — subject, mark, `predictedMark?`, year, term
- `career_preference` — interests, AI-flow answers, computed `careerFit`
- `career` *(reference)* — cluster, demand, salary bands by country, AI-risk note
- `institution` — name, country, type (university / TVET / online), modes
- `programme` — institutionId, field, qualification, mode, duration, `applicationUrl`, deadlines
- `programme_requirement` — flexible JSON spec (min subjects/marks, score-scheme ref, UCAS tariff, named grades, free-text) keyed by curriculum
- `scholarship` — type, country, eligibility, amount, url, deadline, `lastVerifiedAt`
- `application` — programmeId, `status` (Interested / Applied / Interview / Accepted / Rejected / Waitlisted), timeline
- `recommendation` *(cache)* — matchScore, `likelihoodBand`, `reasoning`, `generatedAt`
- `ai_advice_log` — prompt, response, `providerUsed`, grounding refs, timestamp

## 6. Phased roadmap

| Phase | Goal | Notes |
|---|---|---|
| **0 — Foundation & Compliance** | Module scaffold, roles, **guardian consent gate**, AI mentor scaffold, FE shell | Nothing student-facing ships without the consent flow. |
| **1 — MVP Decision Engine** | Profile → marks → per-institution scoring → curated **SA+UK+Online** dataset → honest-band recommendations → application tracker → scholarships → grounded mentor | The product's core value. |
| **2 — Differentiation** | Marks-improvement planner, career simulation, alternative pathways, ROI + affordability, **parent dashboard**, geography **AU+CA** | Parent consent already built in P0. |
| **3 — Schools / B2B** | Teacher/cohort dashboards, school analytics, per-seat licensing | Reuse Orbit dashboard/analytics patterns. |
| **4 — Employment bridge** | Map graduating profile → Orbit candidate; internship/grad-job matching; employer recruitment | **Mostly integration** into existing Orbit. |
| **5 — Global** | Migration/visa/work-rights layer; **US (College Scorecard) + Europe** | US data is free → cheap to add late. |

Full task-level checklists live in **#304**.

## 7. Open decisions (gates in #304)

| ID | Decision | Blocks |
|---|---|---|
| **D1** | Frontend section placement under `annix/orbit/` | FE scaffold |
| **D2** | DB target — TypeORM/Postgres now vs. wait for #298 | all entities/migrations |
| **D3** | Student & guardian identity / registration model | auth + profiles |
| **D4** | Consent jurisdictions for MVP (POPIA only vs. +GDPR) | consent gate |
| **D5** | MVP geography corridor | dataset + scoring |
| **D6** | Which institutions' score schemes first | scoring service |

## 8. Data-source reality

- **US:** College Scorecard API — free, official, key-gated (institution + field-of-study level). Cheap to add in Phase 5.
- **UK:** UCAS Tariff API gives points; **course-level entry requirements are non-standard** (tariff *or* named grades *or* free-text) → curation/scraping. HESA publishes entry datasets.
- **South Africa:** APS is **not machine-readable and not standardized** (UCT ~600-pt, Wits 54-pt, Stellenbosch %, others 7-band); per-programme rules live in PDF prospectuses → **manual curation + annual refresh**. This is the maintenance cost *and* the moat.
- **Rankings (QS/THE):** license-restricted (QS data is CC BY-NC-ND; commercial use needs a paid licence). **Do not** scrape/use commercially — replace with our own fit metrics or omit.
- **Scholarships:** no canonical API; high link-rot → curate a small high-quality set, don't aggregate everything.
- **Refresh cadence:** annual (admission cycles), not daily/weekly.

## 9. The hard problems (set expectations)

- **Cross-system score conversion is lossy.** NSC/APS ↔ UCAS tariff ↔ US-GPA ↔ IB have no authoritative bidirectional mapping; many universities don't even use tariff (they state e.g. "36 IB incl. 6,6,5 HL"). We model per-institution requirements, not a universal conversion.
- **Admission-probability prediction is unreliable** (holistic/contextual admissions, undisclosed institutional priorities, year-to-year volatility, small-n per programme). We present **calibrated bands + uncertainty + reasoning**, never false precision.

## 10. Regulatory & trust

- **POPIA (SA):** child = under 18; processing children's data needs **verifiable parental/guardian consent**, opt-in. The Information Regulator is actively enforcing on minors' data. Consent flows are foundational (Phase 0), not an add-on.
- **GDPR (UK/EU):** explicit consent for children (digital-consent age 13–16 by state). **FERPA/COPPA (US):** relevant only if going via US schools / under-13 — deferred.
- **Monetization ethics:** the lead-gen model collides with the "best-for-student" promise. The recommendation firewall (principle #4) is the mitigation; any paid placement must be disclosed.

## 11. Monetization (later phases)

- **Free:** basic recommendations.
- **Premium (D2C):** advanced AI mentoring, application assistance, deeper scholarship/tracking — affordability for SA learners who lack a school subscription (a gap the school-license incumbents ignore).
- **Schools:** per-seat licensing (Phase 3).
- **Employers:** recruitment fees (already part of Orbit).
- **Universities:** lead generation **only** with ethical disclosure and the ranking firewall intact.

## 12. Success metrics

Students registered · profiles completed (with consent) · recommendations generated · applications tracked → submitted · scholarships applied/won · internships secured · transitions into Orbit candidate/employment.

## 13. Non-goals

- ❌ A separate app / new login / new admin card.
- ❌ Scraping every global university or daily refresh jobs.
- ❌ Fabricated admission percentages or QS/THE commercial use.
- ❌ Rebuilding employer/jobs — Orbit already has it (reuse).
- ❌ A new AI provider abstraction, or calling Claude/OpenAI directly — Gemini via `AiChatService` only.

## 14. References

- Orbit backend: `annix-backend/src/annix-orbit/` · Orbit frontend: `annix-frontend/src/app/annix/orbit/`
- AI service: `annix-backend/src/nix/ai-providers/ai-chat.service.ts`
- Consent/POPIA: `annix-backend/src/annix-orbit/services/popia.service.ts`
- Conventions: root `CLAUDE.md`, `docs/shared-registry.md`
- Related issues: #304 (this work), #298 (Postgres→Mongo — blocks D2), #301 & #303 (Orbit work in flight)
