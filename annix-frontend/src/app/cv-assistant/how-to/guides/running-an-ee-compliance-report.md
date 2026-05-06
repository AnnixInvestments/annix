---
title: Running an Employment Equity report
slug: running-an-ee-compliance-report
category: Compliance
roles: [admin, recruiter]
order: 1
tags: [compliance, ee, popia, reporting]
lastUpdated: 2026-05-06
summary: Pull the source data for EEA2 / EEA4 statutory submissions, with the right understanding of what the numbers mean.
readingMinutes: 5
relatedPaths: [annix-frontend/src/app/cv-assistant/portal/compliance/ee-report, annix-backend/src/cv-assistant/services/ee-report.service.ts, annix-backend/src/cv-assistant/controllers/compliance.controller.ts]
---

## What this report is for

This page produces the source data the company needs to file annual
**EEA2** (workforce profile) and **EEA4** (income differentials) returns
under the Employment Equity Act 55/1998. It does **not** produce the
official PDF forms — that's still the customer's responsibility, usually
through their existing payroll system. What we deliver is the underlying
applicant + new-hire counts by demographic, with a sectoral-target
comparison and a 3% disability target line, ready to drop into the
official forms or audit-trail.

## Who can see this page

The page is at `/cv-assistant/portal/compliance/ee-report` and is gated
behind the standard CV Assistant auth guard. In practice you should
restrict who in your team has access — the data is "special personal
information" under POPIA s26 and every read is recorded in the audit
log.

## Before you can run a report

Two preconditions must be in place:

1. The customer's company row has `is_designated_employer = true`. The
   endpoint refuses to render the report otherwise. An Annix admin or a
   migration sets this; talk to your Annix contact if you see an
   "EE reporting is only available for companies flagged as designated
   employers" error.
2. Some candidates have actually submitted EE disclosures within the
   date window you're querying. Without disclosures, the report is
   empty (which is correct — disclosure is voluntary under POPIA s11).
   If your candidates haven't been invited, see the "Sending an EE
   disclosure invite" section below.

## Step-by-step

### 1. Open the page

Navigate to **CV Assistant portal → How To → Compliance**, or jump
straight to `/cv-assistant/portal/compliance/ee-report`.

### 2. Pick a date range

The page defaults to the last 12 months (today minus a year, today).
Use the From / To date pickers to change it. The window is applied to
the candidate's `consent_granted_at` timestamp, not their application
date — i.e. you're filtering by when they disclosed, not when they
applied.

### 3. Click "Run report"

The page fires `GET /cv-assistant/compliance/ee-report?dateFrom=…&dateTo=…`
which:

- Joins disclosed candidates × their candidacy × the job posting × the
  company over the window.
- Groups by occupational level × population group × gender × disability.
- Computes new-hire counts (candidates with status = `accepted`) over
  the same window.
- Looks up the company's sector-specific gazetted targets and computes
  actual % vs target % per (level × metric).
- Computes the 3% disability workforce target line (denominator
  excludes "prefer not to say" so non-disclosure doesn't dilute the
  rate).
- Computes the year-over-year delta against the same window minus one
  year.

The whole thing is a single SQL pass; expect a sub-second response on
all but very large customers.

### 4. Read the on-page tables

- **Summary** — company name, sector, total disclosed applicants, total
  new hires.
- **By occupational level** — applicants, new hires, and the three
  headline ratios (Afr. Black %, Female %, Disability %) per level.
  Empty levels are dropped from the table.
- **Sector targets vs actuals** — one row per (level × metric) combo
  the company's sector has gazetted targets for, with a Met / Not-met
  badge.
- **3% disability target** — actual % across declared candidates +
  sample size + Met / Not-met badge.
- **Year-over-year** — previous-period total + absolute delta + percent
  delta.

If "Sector targets vs actuals" shows the empty state ("No sector
targets configured…"), an Annix admin needs to populate the
`cv_assistant_ee_sectoral_targets` table for your sector via the admin
endpoint. This is gazette data that gets re-released; talk to your
Annix contact.

### 5. Download CSV or PDF

- **Download CSV** — opens a multi-section CSV (one per table from
  step 4) at `/cv-assistant/compliance/ee-report.csv?dateFrom=…&dateTo=…`.
  Excel and Google Sheets both ignore the `# `-prefixed comment lines
  cleanly. Use this for filing prep or pivot tables.
- **Download PDF** — opens a single-page A4 PDF at
  `/cv-assistant/compliance/ee-report.pdf?dateFrom=…&dateTo=…`. Use
  this as a filing reference / audit-trail snapshot.

Both downloads route through the same backend service that produced
the on-page tables, so the numbers will match exactly.

## How the disability rate is computed

Important nuance: the 3% disability target is calculated as

```
disability_rate = candidates_with_disability_yes / candidates_who_declared
```

i.e. the denominator EXCLUDES "prefer not to say". Otherwise, a
demographic that opts out of disclosure would artificially deflate the
rate. The sample size shown next to the target is the denominator;
treat low sample sizes as low-confidence.

## What the AI ranker can see

Nothing from this report. The AI candidate ranker is architecturally
prevented from reading EE attributes via three layers:

1. The four AI services (`JobMatchService`, `CvScreeningService`,
   `CandidateJobMatchingService`, `EmbeddingService`) don't have any
   EE-related repository injected.
2. An ESLint rule scoped to those four files bans imports of any EE
   entity, service, or related table-name string.
3. A NOLOGIN Postgres role `annix_cv_ai` has `REVOKE SELECT` on every
   EE table.

Aggregate fairness monitoring (separate from this report) lives in
`analytics.service.ts` which is on the firewall allowlist by design,
and only ever produces aggregate breach signals — never per-row
demographic data.

## Sending an EE disclosure invite to a candidate

Today this is HR-API only — `POST /cv-assistant/candidates/:id/ee-disclosure-invite`.
The candidate gets an email with a tokenised link to
`/cv-assistant/ee-disclosure/[token]`, fills the form (all fields
default to "prefer not to say"), and the disclosure lands in
`cv_assistant_candidate_ee_attributes`. From there it shows up in
this report.

A button in the HR candidate detail page is on the roadmap; today,
talk to your Annix contact to trigger invites in bulk.

## Audit trail

Every EE report run is recorded in the audit log via
`logEeAttributesAccess` with `reason="ee_report"` and a structured
purpose string capturing the company + date range. CSV / PDF downloads
all route through the same audit path. The audit table is queryable
by Annix admins on request — useful if a candidate exercises their
POPIA s23 access right.

## Common questions

**Why are some candidates missing from the report?**
They didn't disclose. Disclosure is voluntary; the report only counts
candidates whose `cv_assistant_candidate_ee_attributes` row is active
(`deleted_at IS NULL`) AND whose `consent_granted_at` falls in the
window.

**Why doesn't the year-over-year column have a percentage?**
The previous period had zero applicants — division-by-zero would be
misleading, so we render `(no prior data)` instead.

**Why are some occupational levels missing?**
The "By occupational level" table drops empty levels. If you expected
"Top management" to appear and it isn't there, no candidate in that
level has disclosed in the window.

**The sector target table says "Not met" but my actual is higher than
my target — what gives?**
"Met" is `actual >= target`. If you're seeing the opposite, the
target_metric in the database may be misconfigured. Talk to your
Annix admin.

## Roadmap

- HR-side button to trigger EE disclosure invites from the candidate
  detail page (currently API-only).
- Email-out of disparate-impact alerts to a configurable EE Compliance
  Officer mailbox (currently audit-log-only).
- Bulk-import script for sectoral targets from the gazette PDF.
- Per-tenant override of the 5-year retention default.
