---
title: Jobs Matched to Your CV
slug: jobs-for-me
category: Job Search
roles: [seeker, individual]
order: 2
tags: [jobs, matching, seeker, adzuna, jooble, remotive]
lastUpdated: 2026-05-10
summary: How CV Assistant pulls and ranks jobs from external sources against the CV you uploaded.
readingMinutes: 4
relatedPaths: [annix-frontend/src/app/cv-assistant/seeker/jobs, annix-frontend/src/app/lib/cv-assistant/components/SeekerJobCard.tsx, annix-backend/src/cv-assistant/services/seeker-job-feed.service.ts, annix-backend/src/cv-assistant/controllers/seeker-jobs.controller.ts, annix-backend/src/cv-assistant/services/jooble.service.ts, annix-backend/src/cv-assistant/services/remotive.service.ts]
---

## What is it?

The Browse Jobs page shows a personal feed of vacancies pulled from multiple
external sources and ranked against the CV you've uploaded to CV Assistant.
We currently pull from Adzuna SA, Jooble (which aggregates PNet, Careers24,
Indeed.co.za and others), and Remotive (remote-friendly roles). Every card
links back to the original posting on the source site — Annix does not host
the application; you apply at the source.

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
5. Use the source dropdown to filter by Adzuna / Jooble / Remotive when
   more than one source is active.
6. Click **View &amp; apply** on any card to open the job at the source and
   apply there.
7. Click **Not for me** to dismiss a match — it won't show again.

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
