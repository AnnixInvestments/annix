# Annix Orbit — Match-Score Bias Audit Methodology

This document is the **reproducible methodology** for verifying that the
`CandidateJobMatch.overallScore` distribution is statistically similar across
EE-population groups when controlling for skills and experience.

> Status: **draft, not yet validated**. The script under
> `scripts/annix-orbit/bias-audit.mjs` is the deliverable; the audit itself is
> a stakeholder activity. Do **not** auto-run on every release until a domain
> expert has validated the methodology.

## Why we audit

Embedding similarity (`text-embedding-004`) is the dominant component of
`overallScore` (50% weighting today). Embeddings learn statistical regularities
from their training corpus, which means they can implicitly correlate with
name → demographics. With `ANNIX_ORBIT_EE_COMPLIANCE_ENABLED=true` we are
collecting EE-population attributes (POPIA-gated), so we can verify the score
distribution is independent of population group when skills + experience are
held constant.

## Hypothesis

H0 (null): `matchScore ⊥ population-group | skills, experience`.
H1 (alt):  `matchScore` distribution differs by population group after
controlling for skills and experience.

## Statistical test

For each pair of EE-population groups `(g_a, g_b)` we want a non-parametric
test that doesn't assume normality of the score distribution.

**Primary test:** two-sample Kolmogorov-Smirnov (KS-test) on the residuals of
`overallScore` after regressing out `experienceYears` and skill-overlap fraction
(via OLS or rank-based residualization).

**Effect-size measure:** the maximum vertical distance between the empirical
CDFs (the KS statistic itself, `D`). `D < 0.1` is the operational threshold.

**Pass criterion:** for every pair of EE-population groups with `n_a, n_b >= 30`:
- `p > 0.05` after Bonferroni correction for the number of pairs, OR
- `D < 0.1` if `n_a + n_b > 500` (where p-values are statistically powerful
  enough that small differences become significant without being meaningful)

**Pairs to test:** all `n*(n-1)/2` pairs of `cv_assistant_candidate_ee_attributes.populationGroup`
values that have at least 30 candidates with both an `overallScore` and a CV
embedding.

## Confounders / controls

- **`experienceYears`**: bucketed (0-2, 3-5, 6-10, 10+) and used as a covariate.
- **Skill-overlap fraction**: `match.matchDetails.skillsOverlap` (already
  computed by `CandidateJobMatchingService.calculateSkillsOverlap`).
- **Location**: NOT controlled for. SA labour markets have geographic
  correlation with population group, so controlling for location would mask
  legitimate locality-based score differences. Document any large location-
  population correlation in the report's caveats section.

## Out of scope

- Auditing the dismiss / apply behaviour (those are user actions, not the
  algorithm).
- Auditing salary recommendations (separate module, separate methodology).
- Auditing recruiter screening (recruiter behaviour is outside the scope of an
  algorithmic audit).

## POPIA / EE-Act considerations

- The script aggregates results: it must NEVER surface an individual
  candidate's `overallScore` or population-group attribute in the output.
- The script must run against the `annix_cv_ai` PostgreSQL role, which has
  read-only access to `cv_assistant_candidates` and `cv_assistant_candidate_ee_attributes`,
  not the recruiter-facing tables.
- Output report must be stored in `scripts/annix-orbit/bias-audit-reports/`
  with a date-stamped filename and reviewed by the data protection officer
  before any external distribution.

## How to run

```bash
# Local (against staging DB):
DATABASE_URL="postgresql://annix_cv_ai:..." \
  node scripts/annix-orbit/bias-audit.mjs \
  --output scripts/annix-orbit/bias-audit-reports/$(date +%Y-%m-%d).md
```

The script:
1. Connects with the `annix_cv_ai` read-only role.
2. Pulls `(candidate_id, overallScore, skillsOverlap, experienceYears, populationGroup)`
   for every match with `overallScore IS NOT NULL`.
3. Computes per-pair KS statistic + p-value + effect size.
4. Writes a markdown report with aggregate counts per group, pair-wise test
   results, and any caveats (e.g. small-sample warnings).

## How often to run

**Manually**, before each major model change (Gemini embedding rev, new weight
tuning, ESCO normalisation rollout in #276). Not on every release. The
methodology must be re-validated by a domain expert when EE-Act requirements
change.

## References

- POPIA § 26-29 (special personal information, prohibition + EE-Act exception).
- Equal Employment Opportunity Commission, "Adverse Impact" guidance
  (analogous US framework — useful for the four-fifths rule baseline).
- Kolmogorov-Smirnov two-sample test (non-parametric).

## Open questions

- Is `four-fifths rule` (US EEOC) appropriate as a sanity check alongside KS?
  Stakeholder decision pending.
- Do we need a separate audit per `JobMarketSource.provider`? An Adzuna-only
  distribution might differ from a DPSA-only one, and that's a property of the
  source corpus, not the algorithm.
- Sample-size threshold (currently 30) — verify with a statistician.

When these are resolved, update this document and re-version the script.
