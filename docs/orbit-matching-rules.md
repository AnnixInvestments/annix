# Annix Orbit — Job-Matching Rules & Rating Sheet

How Orbit ranks external jobs against a seeker's CV/profile, written as a rateable
rule set. Use the **Rating** column to score each rule 1–5 (1 = hurting accuracy,
5 = great) and jot tuning ideas, then we work the low scores.

- **Core code:** `annix-backend/src/annix-orbit/services/candidate-job-matching.service.ts`
- **Embeddings:** `annix-backend/src/annix-orbit/services/embedding.service.ts`
- **Feed / gates / cold-start:** `annix-backend/src/annix-orbit/services/seeker-job-feed.service.ts`
- **Inspect on live data:** `pnpm --filter @annix/backend match:explain <candidate-id|email> [limit]` (read-only, see §6)

> Scores are computed and stored at match time. Changing a rule only affects **new
> matches and re-matches** — trigger a rematch (or use the explain harness) to see
> the effect on an existing seeker.

---

## 1. The scoring formula

```
base   = embedding×0.45 + skills×0.22 + experience×0.15 + location×0.08 + salary×0.10
+work  = min(1, base + workProfileBoost×0.10)          // only if a work profile exists
+cat   = min(1, +work + categoryBoost)                 // cap: soft .06 / medium .10 / hard .12
−dismiss = max(0, +cat − dismissPenalty)               // up to −0.15
final  = −dismiss × travelRadiusMultiplier             // 1.0 inside radius → 0.4 at 2× radius
```

The headline **"Match X%"** badge = `round(final × 100)` (the composite — this is what
ranks the list). The **"Profile similarity: X%"** line in the explanation = the
embedding component alone, correctly labelled as a sub-metric.

| # | Weight / lever | Current | Rating (1–5) | Notes / ideas |
|---|---|---|---|---|
| 1 | Embedding (semantic CV↔job) | **45%** | | Dominant lever. Worth A/B-ing down if exact skill/title hits get out-ranked by vaguely-related jobs. |
| 2 | Skills overlap | **22%** | | Matcher rewritten this pass (§3). |
| 3 | Experience | **15%** | | |
| 4 | Salary | **10%** | | |
| 5 | Location | **8%** | | Low weight, but travel-radius penalty is separate & strong (§4). |

---

## 2. Hard gates (job excluded before scoring)

| Gate | Rule | Rating | Notes |
|---|---|---|---|
| Country | Must be in seeker's `targetCountries` (default `["za"]`) | | |
| Expired / delisted | Dropped | | |
| Dismissed ("Not for me") | Hidden | | |
| Salary floor | If seeker set `expectedSalaryMin`, jobs paying below are dropped (no-salary jobs pass) | | |
| Muted company/category | Hidden | | |
| Source tier visibility | Source only shown to its `visibleTiers` | | |
| Category pool (hard tier) | Hard tier = only the seeker's chosen categories | | |

There is **no minimum-score cutoff** — every surviving job is shown, just ranked.

---

## 3. Component scoring rules

| Component | Rule | Rating | Notes / ideas |
|---|---|---|---|
| **Skills** | `matched ÷ required job skills`. Match = normalise (lowercase, keep `+ # .`, alias map e.g. js→javascript) then **whole-token** match — every significant token (≥2 chars, or contains `+`/`#`) of the shorter skill must appear as a whole token in the longer. No job skills → 0.5 if CV has skills, else 0. | | **Changed this pass** from naive substring. Add aliases to `SKILL_ALIASES` as gaps surface. |
| **Experience** | Years band: ≥5→1.0, 3–4→0.8, 1–2→0.5, <1→0.2, **unknown→0.5**. Then ×seniority-gap: gap 0→1.0, 1→0.85, 2+→0.7. Job seniority is keyword-inferred from title/description. | | unknown **raised 0.3→0.5** this pass. Seniority inference is regex/keyword — noisy. |
| **Location** | By distance: <25km→1.0, <50→0.85, <150→0.6, <400→0.35, else 0.15. No coords → text: same SA metro→0.7, else 0.3, none→0.5. | | Coords from work-profile home pin, else geocoded CV location. |
| **Salary** | Job pay ≥ floor→1.0; below→`0.2 + 0.6×ratio`; either missing→0.5. Floor = `expectedSalaryMin` override else CV-suggested. | | |
| **Work-profile boost** (≤+0.10) | `field×0.6 + role×0.4`. Field: exact target category→1.0, adjacent→0.5. Role: primary-role tokens appear in job→1.0. | | Only if a work profile with fields exists. |
| **Category boost** (≤+0.06/.10/.12) | Tier-dependent nudge toward chosen categories (adjacent = half). | | |
| **Dismiss penalty** (≤−0.15) | If a job's embedding is >0.85 similar to a dismissed job: `min(0.15, sim−0.85)`. | | "Not for me" learning. |
| **Travel-radius penalty** | **Graded** (changed this pass): 1.0 at/inside radius, tapering to 0.40 at 2× radius. | | Was a flat ×0.40 cliff at the boundary. |

---

## 4. Embeddings

- **Model:** Gemini `gemini-embedding-001`, 768-dim.
- **CV text:** summary + ESCO-normalised skills + education + certifications + experience years (fallback: raw CV text, 4000 chars).
- **Job text:** title + company + location + category + description (4000 chars) + ESCO skills.
- **Similarity:** cosine.

| Rule | Rating | Notes |
|---|---|---|
| What goes into the CV embedding | | Missing/odd CV extraction → weak embedding → weak ranking (45%). |
| What goes into the job embedding | | |

---

## 5. Cold start (no CV embedding yet)

No scoring — up to 12 recent jobs filtered by SA-province keywords from the CV
summary, with skill overlap shown but **zero score weight**. Rating: ___

---

## 6. The explain harness (read-only)

```
cd annix-backend
pnpm match:explain <candidate-id | email> [limit] [profile|compare]
# e.g. pnpm match:explain seeker@example.com 20
#      pnpm match:explain seeker@example.com 20 skills-forward
#      pnpm match:explain seeker@example.com 20 compare
```

Prints the candidate's profile summary, then for each top match: overall %, embedding
%, skills (matched/total + which), experience, location (+distance), salary, dismiss
& travel penalties, and the full reasoning string. **Nothing is persisted** — it uses
the same `computeMatch()` the live matcher uses, so what you see is exactly how a
rematch would score. Reads whatever DB the local `.env` points at (Orbit cluster).

**Weight A/B (§1 lever):** pass a profile name (`default` / `skills-forward` / `balanced`,
defined in `WEIGHT_PROFILES`) to score under different base weights, or `compare` to see
the **default vs skills-forward ranking side by side** with the rank shift per job — the
direct way to judge whether the 45% embedding weight is too dominant. Profiles change
**only the harness**, never production scoring.

> Note: the harness boots the full app context; there is a pre-existing standalone-boot
> issue on the Mongo driver (a TypeORM `DataSource` dependency for `AiUsageLogRepository`)
> that also affects other `createApplicationContext` scripts — fix that to run the harness
> live. The scoring + A/B logic is unit-tested (`candidate-job-matching.matrix.spec.ts`).

---

## 7. Changes made in this pass

1. **Skills matcher** — naive substring (`"java"`↔`"javascript"`, `"c"`↔everything) →
   normalised whole-token matching + a small alias map. `SKILL_ALIASES`, `skillsMatch()`.
2. **Unknown experience** — `0.3 → 0.5` (neutral, not "no experience"). `UNKNOWN_EXPERIENCE_SCORE`.
3. **Travel-radius penalty** — flat ×0.40 cliff at the boundary → graded taper to ×0.40
   at 2× the radius. `travelRadiusMultiplier()`, `TRAVEL_FULL_PENALTY_FACTOR`.
4. **Scoring split** — pure `computeMatch()` (no persistence) extracted from
   `scoreAndSaveMatch()`, powering the explain harness.

## 8. Known limitations / tuning levers (not yet changed — rate first)

- **Embedding dominance (45%)** — biggest single lever; consider A/B with skills/title.
- **Job seniority inference** is keyword/regex on title+description — noisy; a "Senior"
  in a description can mislabel a junior role.
- **Single-token skill over-match** — e.g. CV "management" can match job "project
  management". The embedding tempers it, but worth watching.
- **Location weight (8%) vs travel penalty** — location barely matters in the base
  score, yet travel distance can still cut the final score; check the balance feels right.
