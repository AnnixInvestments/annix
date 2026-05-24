---
title: Jobs Matched to Your CV
slug: jobs-for-me
category: Job Search
roles: [seeker, individual]
order: 2
tags: [jobs, matching, seeker, adzuna, remotive, executive placements, job placements, jobmail]
lastUpdated: 2026-05-24
summary: How Annix Orbit pulls and ranks jobs from external sources against the CV you uploaded.
readingMinutes: 4
relatedPaths: [annix-frontend/src/app/annix/orbit/seeker/jobs, annix-frontend/src/app/lib/annix-orbit/components/SeekerJobCard.tsx, annix-backend/src/annix-orbit/services/seeker-job-feed.service.ts, annix-backend/src/annix-orbit/controllers/seeker-jobs.controller.ts, annix-backend/src/annix-orbit/services/crawl/sitemap-crawl-ingestion.service.ts, annix-backend/src/annix-orbit/services/remotive.service.ts, annix-backend/src/annix-orbit/services/dpsa-circular.service.ts]
---

## What is it?

The Browse Jobs page shows a personal feed of vacancies pulled from multiple
external sources and ranked against the CV you've uploaded to Annix Orbit.
We currently pull from Adzuna SA, Remotive (remote-friendly roles), and
several open SA job boards crawled directly — Executive Placements, Job
Placements and JobMail. Every card links back to the original posting on the
source site — Annix does not host the application; you apply at the source.

## How matches are ranked

For every job we ingest, the matching engine computes a score against your
CV using:

- 50% — semantic similarity between the job description and your CV (Gemini
  text-embedding-004 vector similarity).
- 25% — overlap between the skills extracted from your CV and the skills
  parsed from the job description.
- 15% — how well your years of experience map to the role's seniority.
- 10% — how close the job is to where you've worked or said you're based.

The number on each card is the combined score (0–100). The text under the
score explains *why* — which skills overlapped, which didn't, and how the
location compared.

## Step-by-step

1. Open **Browse Jobs** from the seeker sidebar.
2. If you haven't uploaded a CV yet, you'll be sent to **My CV** first —
   matching needs that CV.
3. Once your CV has been processed (usually under a minute), come back to
   **Browse Jobs**. Matches typically appear within an hour of the next
   ingestion cycle.
4. Use the search box to narrow by title, company, or location.
5. Use the source dropdown to filter by Adzuna / Remotive / Executive
   Placements / Job Placements / JobMail when more than one source is active.
6. Click **View &amp; apply** on any card to open the job at the source and
   apply there.
7. Click **Not for me** to dismiss a match — it won't show again.

## Filtering matches

The filter row above the cards lets you narrow the list:

- **Search** — title, company, or location free-text.
- **Province / City** — dependent dropdowns. Pick a province first; the city
  dropdown then shows only cities in that province.
- **Category** — populated from the categories actually present in your
  current match list (each source tags jobs differently).
- **Source** — filter by Adzuna / Remotive / Executive Placements / Job
  Placements / JobMail / DPSA when more than one source is active for your
  account.
- **Min salary (ZAR / yr)** — drops jobs whose published salary range is
  below this threshold. Jobs with no salary data are kept regardless.

## Consent

Before we match jobs to your CV, the page asks for explicit POPIA consent
to (a) embed your CV, (b) store match scores against external listings on
our servers, and (c) confirm we don't share your CV with the source until
you click **View &amp; apply**. Decline and the page shows a "consent
required" view with a button to re-prompt; accept and the matches load.
Withdraw any time from **Settings → Privacy → Stop matching me to jobs**.

## What we do and don't share

- **What's shared:** nothing on this page. Inferring fit happens entirely on
  Annix using your CV and the public job listings. The source site only
  hears from you when you click **View &amp; apply** and complete an
  application on their side.
- **POPIA:** matching uses your CV, which is personal information. You
  consented when you signed up; you can withdraw consent at any time from
  **Settings &gt; Privacy**, which clears your CV embedding and your match
  table.

## Tips

- Better skills → better matches. Make sure your CV lists tools, standards,
  and trade tickets explicitly — the matcher reads the literal skills, not
  inferred ones.
- If you change roles or sectors, re-upload your CV. The match table is
  recomputed each time a new CV lands.
- Remote-friendly roles surface through Remotive but Remotive applies a
  24-hour publication delay (their terms), so the freshest remote postings
  show up the day after they go live elsewhere.

## Public Service postings (DPSA)

The matcher also pulls the **weekly DPSA Public Service Vacancy Circular**
(PSVC) every Monday morning. Each circular contains roughly 40-60 posts
spanning national + provincial departments. We extract structured fields
(post number, title, department, centre, salary, closing date, enquiries,
plus a short duties + requirements summary) via Gemini and rank them
alongside the Adzuna / Remotive / SA job-board results.

DPSA posts are kept brief on purpose — for the full vacancy detail
(complete duties list, full requirements, application form), click through
to the source PSVC PDF.

Validation status (last reviewed 2026-05-13 against PSVC 15/2026):
48/48 posts extracted, all 8 fields populated, no duplicates. Validation
script lives at `scripts/annix/orbit/dpsa-validate.mjs` — re-run quarterly
against a fresh PSVC to confirm prompt accuracy.

Toggle: set `DPSA_INGESTION_ENABLED=true` (already on staging; flip on
prod after a clean Monday cycle on staging).
