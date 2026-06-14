---
title: Your recruiter command centre
slug: recruiter-command-centre-dashboard
category: Recruiter
roles: [recruiter, admin]
order: 1
tags: [recruiter, dashboard, pipeline, placements, site-ready, compliance]
lastUpdated: 2026-06-14
summary: How the recruiter dashboard works — KPIs, the candidate pipeline funnel, revenue, site-ready compliance alerts, and the Ask Orbit AI search.
readingMinutes: 3
relatedPaths: [annix-frontend/src/app/annix/orbit/recruiter/dashboard/page.tsx, annix-backend/src/annix-orbit/services/recruiter-dashboard.service.ts, annix-backend/src/annix-orbit/controllers/recruiter-dashboard.controller.ts]
---

## What it is

The recruiter dashboard is your command centre — clients, candidates,
submissions, placements, revenue and compliance at a glance. Everything is
scoped to your agency and to the **date range** in the top right; change the
range and every widget updates.

## The widgets

- **KPI cards** — Total Candidates, Active Clients, Active Jobs, Submissions,
  Placements and Revenue, each with a trend arrow comparing this period to the
  one before it.
- **Recruitment Pipeline** — your candidates as a funnel from Identified →
  Placed, with the overall conversion rate. A candidate's stage is the furthest
  of the stage you set manually (Identified / Screened / Shortlisted) and the
  stage implied by their submissions and placement — so the funnel stays
  accurate even if you never touch the stage field.
- **Revenue Overview** — cumulative placement-fee revenue over the range.
- **Top Performing Consultants** — your team ranked by placements and revenue.
  This leaderboard is part of the **Leader** plan.
- **Recent Placements**, **Candidate Source Breakdown** and **Upcoming
  Interviews** (candidates at interview stage, soonest scheduled first).
- **Compliance Alerts** — how many candidates hold an expired or soon-to-expire
  credential, straight from the Skills Passport. Click through to fix them.
- **Tasks** — what's due today.
- **Ask Orbit AI** — type what you need in plain language ("site-ready
  boilermakers in Gauteng available in 30 days") and Orbit searches your talent
  pool, ranked by site-readiness.

## Rules and constraints

- **Date range drives everything.** KPIs, the funnel, revenue and the
  leaderboard all respect the selected window; deltas compare it to the
  immediately preceding window of the same length.
- **Site-readiness comes from the Skills Passport.** Capture each candidate's
  tickets, medicals and certifications (with expiry dates) on their profile —
  the dashboard's compliance alerts and the AI search's "site-ready" filter are
  only as complete as the passport.
- **Plan gates.** Submissions and placement tracking are part of the Recruit
  plan; the consultant leaderboard and advanced analytics are part of the Leader
  plan. Candidates, clients, the Skills Passport and site-ready scoring are
  available on every plan, including the free Scout tier.
