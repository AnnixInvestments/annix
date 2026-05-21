# Annix Orbit — Employment Equity disclosure: Data Protection Impact Assessment

**Status:** Draft pending Information Officer sign-off.
**Owner:** Annix Information Officer.
**Last revised:** 2026-05-05.
**Linked issue:** GitHub #240.

This DPIA covers the Employment Equity (EE) disclosure feature in the Annix Orbit
product: the collection, storage, processing, retention, and disclosure of
candidate demographic data (race, gender, disability, nationality status,
reasonable-accommodation requests) for two purposes — Employment Equity Act
55/1998 statutory reporting and AI-screening fairness monitoring under POPIA s71.

A DPIA must be reviewed and signed off by Annix's Information Officer **and**
the customer's Information Officer before the feature is enabled for any
production customer. This document is the template Annix uses; customers may
adapt and re-sign for their own records.

## 1. Processing description

| Question | Answer |
|---|---|
| What personal information is processed? | Population group (race), gender, disability status, nationality status, reasonable-accommodation flag + free-text notes. |
| Special personal information under POPIA s26? | **Yes** — race, ethnic origin, and health (incl. disability) are special personal information. |
| Lawful basis | POPIA s27(1)(a) explicit consent **and** s27(2)(b) statutory carve-out for designated employers under the Employment Equity Act. Both bases are recorded per submission. `[LEGAL REVIEW Q1]` confirms whether vendor (Annix) consent must be named separately. |
| Whose data | Job applicants who voluntarily disclose via the post-application email or the seeker self-service page. |
| Volume / frequency | One row per candidate per disclosure event. Append-only. Typical volume: same order of magnitude as candidate intake. |
| Sources | The candidate themselves, via two channels: (a) post-application tokenised email link, (b) authenticated seeker portal. |
| Recipients | (i) Hiring company HR users, role-gated, audited; (ii) Annix internal aggregate fairness monitor; (iii) the candidate themselves on request. The AI ranker is **architecturally prevented from reading** these fields — see §4. |
| Cross-border transfer | None by default — Annix's primary infrastructure is hosted in Fly.io's JNB region. If a customer's Annix instance is hosted elsewhere, document here. |

## 2. Necessity & proportionality

EE Act 55/1998 (as amended by EE Amendment Act 4/2022) requires designated
employers to file EEA2 (workforce profile) and EEA4 (income differentials)
returns, and from January 2025 to track progress against gazetted sectoral
targets. POPIA s71 requires data subjects to be informed of the underlying
logic of automated decisions affecting them; aggregate fairness monitoring
satisfies this duty without exposing per-candidate demographic data to the
ranker.

POPIA s10 (minimality): we collect the minimum fields needed to satisfy EEA2 +
EEA4 + 4/5-rule fairness monitoring. The four enumerated values per field
(plus "prefer not to say") match EEA2 categories.

POPIA s11 (consent): every submission references a frozen
`cv_assistant_ee_consent_text_versions` row, so the exact text the candidate
agreed to is reproducible at any point in the future.

## 3. Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| AI ranker uses demographic features to discriminate | Without firewall: high. With: low. | Severe (PEPUDA + EE Act s6 liability for both Annix and customer). | Three-layer firewall: DI signature, ESLint rule, Postgres role REVOKE. CI test (`ee-firewall.spec.ts`) blocks regressions. Issue #240 Phase B. |
| Disparate-impact bias undetected | Medium without monitor. Low with. | Severe. | Nightly disparate-impact monitor (analytics.service.ts) applies EEOC 4/5 rule per active job and audits any breach. Issue #240 Phase B. |
| Unauthorised HR access to demographic data | Medium without controls. Low with. | High (POPIA s26 violation). | Per-candidate access requires HR role. Every read audited via `cvAuditService.logEeAttributesAccess`. Per-tenant scoping via `candidate.jobPosting.companyId`. |
| Stale consent text | Low. | Medium. | Append-only consent-text-version table; every disclosure pins a version id. Trigger blocks payload mutation. |
| Data retained beyond legal need | Medium. | Medium (POPIA s14 violation). | Default retention: 5 years from consent date (longer of EE plan duration vs EEA2/EEA4 reporting). Automatic purge cron — see §5. |
| Candidate forgets they disclosed | Low. | Low. | Seeker self-service page at `/annix-orbit/seeker/ee-attributes` shows current disclosure + privacy notice + withdraw button. |
| Foreign-national handling under 2022 amendment | Medium. | Medium (mis-classification under designated-groups definition). | Schema retains `nationality_status` field; reporting separates SA citizens from foreign nationals. `[LEGAL REVIEW Q3, Q9]` to confirm whether the field should narrow further. |
| Information Regulator s57 prior authorisation | Unknown. | Could be a 60-day blocker. | `[LEGAL REVIEW Q7]` — confirm whether pattern triggers prior auth. Feature flag is default-off; activation gated on this answer. |
| Sectoral target data drift | Medium. | Low. | Admin CRUD on `cv_assistant_ee_sectoral_targets` allows refreshing on each gazette without a migration. Reports show "no targets configured" rather than silently substituting stale figures. |

## 4. Architectural firewall (Phase B)

The AI candidate ranker MUST NOT have visibility into EE attributes. Three
independent layers, each fail-loud:

1. **Dependency injection.** The four AI services (`JobMatchService`,
   `CvScreeningService`, `CandidateJobMatchingService`, `EmbeddingService`)
   never receive `AnnixOrbitCandidateEeAttributes`, `PopiaService`, or
   `EeDisclosureService` in their constructors. Constructor signature is the
   contract; reviewing a PR catches violations.
2. **ESLint rule.** A `no-restricted-imports` rule scoped to the four AI
   service paths bans imports of any EE entity, EE service, or related
   table-name string. CI fails on regression.
3. **Postgres role.** A NOLOGIN role `annix_cv_ai` with explicit
   `REVOKE SELECT` on every EE-related table. The intent is that, once the
   second TypeORM `DataSource` is wired (deferred follow-up), AI queries
   connect as this role and the database itself rejects any join attempt.
   Layer is dormant on managed Postgres without superuser; see issue #240
   Phase B commit notes.

A dedicated spec test (`annix-orbit/services/ee-firewall.spec.ts`, 64
assertions across 4 services × 16 forbidden symbols) runs as part of every
push.

Aggregate access (the disparate-impact monitor and the EE report) is
explicitly permitted — those services live in `analytics.service.ts` /
`ee-report.service.ts` which are NOT on the firewall path list.

## 5. Retention & purge

- Disclosures are retained for **5 years from `consent_granted_at`**, in line
  with the longer of (EE Act plan duration ≈ 5y, EEA2/EEA4 minimum 3y). The
  POPIA s14 minimality requirement is satisfied by deletion at 5y.
- The existing Annix Orbit 12-month inactive-candidate purge will cascade
  to EE attribute rows via FK `ON DELETE CASCADE`. **`[LEGAL REVIEW]`
  confirms whether EE-attached candidates should override the 12-month
  default with a 5-year hold** — the safer interpretation today is to extend.
  Until lawyer answer arrives, customers should set their candidate
  retention horizon accordingly.
- Append-only invariant: corrections insert a new row + tombstone the
  prior; no payload UPDATE is ever permitted (Postgres trigger).
- Tombstones are soft-deletes (deleted_at). The 5-year purge job (when
  added) will hard-delete tombstoned rows past the retention horizon.

## 6. Data subject rights

| Right | How exercised |
|---|---|
| Access (POPIA s23) | Seeker page `/annix-orbit/seeker/ee-attributes` shows current disclosure. Data export at `GET /annix-orbit/me/data-export` includes EE attributes per candidacy. |
| Correction (POPIA s24) | Same seeker page — submitting again append-records a new row + tombstones the prior. Trigger preserves the old payload for audit. |
| Withdrawal | "Withdraw disclosure" button on the seeker page tombstones every active EE attribute row across all the user's candidacies. The 5-year retention then applies to the tombstone. Re-disclosure is always permitted. |
| Erasure (POPIA s24 / right to be forgotten) | Account deletion (request-delete flow) cascade-removes the candidate + EE rows via FK. |
| Information Regulator complaint | Standard POPIA complaint route — privacy notice on the seeker page references this. |

## 7. Information Officer / customer responsibilities

Before enabling the feature for a customer, both Information Officers must
confirm:

- [ ] The customer is a designated employer under the EE Act 55/1998.
- [ ] The customer's privacy policy / careers-page footer references EE
      disclosure (Annix supplies POPIA notice text in
      `annix-orbit-ee-customer-policy-pack.md`).
- [ ] The customer has populated `cv_assistant_ee_consent_text_versions`
      with text reviewed by their employment-law practitioner (or accepted
      Annix's `v1-2026-default` placeholder explicitly, in writing).
- [ ] The customer's HR access roles in Annix Orbit correctly scope who can
      view EE attributes.
- [ ] The customer accepts the 4/5-rule disparate-impact alert workflow
      (audit log entry; email routing pending Phase E follow-up).
- [ ] The customer accepts the per-candidacy data export format includes
      their submitted EE attributes.
- [ ] **Sign-off:** Annix Information Officer + Customer Information Officer
      countersign this document before flipping
      `CV_ASSISTANT_EE_COMPLIANCE_ENABLED` to true for the customer's
      tenant **and** flipping `companies.is_designated_employer` +
      `companies.eea_reporting_enabled` to true on their company row.

## 8. Pending legal questions

The 9 questions in issue #240's pinned legal-review comment must each have
a written answer before the feature ships to a paying customer. They are
reproduced inline in the issue body and persisted as a comment so they
remain stable across body edits.

## 9. Sign-off

| Signatory | Role | Date | Signature |
|---|---|---|---|
| | Annix Information Officer | | |
| | Customer Information Officer | | |
| | Annix engineering owner | | |
| | Customer HR / legal owner | | |
