# Annix Orbit — Employment Equity feature: how-to

A practical operator's guide for Annix admins and Customer HR rolling out
Employment Equity (EE) compliance. Read alongside the DPIA
(`annix-orbit-ee-dpia.md`) and the customer policy pack
(`annix-orbit-ee-customer-policy-pack.md`).

## Activation flow

1. **Sign the DPIA.** Both Annix's Information Officer and the customer's
   Information Officer countersign `annix-orbit-ee-dpia.md`. Until that
   exists, do not proceed.
2. **Set the DPO email env var.** On the deployment that will host this
   customer, set `ANNIX_EE_DATA_PROTECTION_OFFICER_EMAIL` to the customer's
   DPO mailbox. The disclosure invite email references this address as
   the contact for data-subject queries. If unset, the email falls back to
   `privacy@example.com` and the renderer will warn.
3. **Seed the customer's consent text version.** Either through the existing
   admin endpoints once the customer has supplied their
   attorney-approved wording, or via a one-off SQL `INSERT` into
   `cv_assistant_ee_consent_text_versions` referencing
   `effective_from = NOW()`. Optionally close the previous version by
   setting its `effective_to`.
4. **Seed the customer's sectoral targets.** Use the admin endpoint
   `POST /admin/annix-orbit/ee-sectoral-targets` (one row per sector ×
   occupational level × metric × year) sourced from the Department of
   Employment and Labour gazette. Populate the customer's sector before
   reports will show "vs target" data.
5. **Flip the customer's company flags.** Update the customer's row in
   `cv_assistant_companies`:
   - `is_designated_employer = true`
   - `economic_sector = '<value matching INDUSTRIES.value>'`
   - `eea_reporting_enabled = true`
6. **Flip the global feature flag** `ANNIX_ORBIT_EE_COMPLIANCE_ENABLED` to
   true (admin Feature Flags page, or seeding script).
7. **Confirm with the customer's HR lead** that the EE disclosure invite
   should be sent automatically post-application or manually triggered per
   candidate. Default behaviour is manual: HR clicks "Send EE invite" on a
   candidate.

## HR daily / weekly tasks

- **Reviewing disclosed candidates.** HR users with the appropriate role can
  view a candidate's disclosed EE attributes from the candidate detail page.
  Every read is logged.
- **Running EE reports.** Visit
  `/annix-orbit/portal/compliance/ee-report`, pick a date range, click
  "Run report". Use the CSV / PDF download buttons to produce evidence for
  EEA2 / EEA4 filings. Default window is the past 12 months.
- **Following up on disparate-impact alerts.** The nightly fairness monitor
  audits any 4/5-rule breach as `ee_fairness_breach` in the audit log.
  Until email routing lands (see roadmap), HR / EE compliance officer
  should query the audit log weekly.

## Candidate (seeker) experience

- **First disclosure.** Triggered by HR sending a tokenised email after
  application. Candidate clicks the link (`/annix-orbit/ee-disclosure/[token]`),
  reads the consent text, fills the form (all fields default to "prefer
  not to say"), and submits. Token is single-use; expires in 30 days.
- **Self-service correction or withdrawal.** From the seeker portal at
  `/annix-orbit/seeker/ee-attributes` the candidate can view, update, or
  withdraw their disclosure. Updates apply across every candidacy
  associated with their email. The seeker portal also links to a plain-
  language privacy notice at `/annix-orbit/seeker/ee-attributes/privacy-notice`.

## Architectural firewall — what NOT to do

The AI candidate ranker MUST NOT see EE attributes. Three guarantees enforce
this:

1. The four AI services (`JobMatchService`, `CvScreeningService`,
   `CandidateJobMatchingService`, `EmbeddingService`) do not have EE-related
   repositories injected. Adding one will break the firewall spec test.
2. An ESLint rule scoped to those four files bans imports of any EE entity,
   service, or related table-name string. CI fails on regression.
3. A NOLOGIN Postgres role `annix_cv_ai` has `REVOKE SELECT` on every EE
   table. (Activation pending the second-DataSource wiring; layers 1–2 are
   fully enforced today.)

If a future feature legitimately needs aggregate EE data, it should live in
`analytics.service.ts` (already on the firewall allowlist) or
`ee-report.service.ts`, not in any AI service.

## Common questions

**Why "prefer not to say" everywhere?** POPIA s11 voluntariness — every
field defaults to non-disclosure so a candidate can opt out of any single
question without abandoning the form.

**Why does correction insert a new row instead of updating?** Append-only is
enforced at the database level via a Postgres trigger. This guarantees the
exact text the candidate consented to at any historical point can be
reproduced (POPIA s24 + audit defensibility). Tombstones cannot be reopened.

**Where is the Annix Information Officer email used?** As the from-address /
contact for the disclosure invite email + as a footer on the rejection
explanation email.

**What happens if a candidate withdraws and re-discloses?** The withdrawal
tombstones the active row. A new submission inserts a fresh row. The
historical record is preserved by design. Each event audit-logged.

**How do customers know which sectoral targets apply to them?** They pick
their economic sector via `cv_assistant_companies.economic_sector` (a
string matching `packages/product-data/portals/INDUSTRIES.value`). The EE
report filters `cv_assistant_ee_sectoral_targets` rows by `sector_code`.

## Roadmap

Items deferred from issue #240's Phase A–E delivery:

- Email routing of disparate-impact breach alerts to the customer's EE
  Compliance Officer (currently audit-only).
- Wire the AI services to actually connect as `annix_cv_ai` (second
  TypeORM DataSource).
- Annix-admin UI for editing sectoral targets (REST endpoints already in
  place).
- POPIA s57 prior-authorisation answer + Operator-agreement final wording
  pending lawyer review.
- Bulk-import script for sectoral targets from the gazette PDF.
