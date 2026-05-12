---
title: Welcome to Annix Insights
slug: welcome
category: Getting Started
roles: [insights]
order: 1
tags: [getting-started, overview]
lastUpdated: 2026-05-12
summary: What Annix Insights is, what it isn't, and what to expect during the v0.1.0 test phase.
readingMinutes: 2
relatedPaths: [annix-frontend/src/app/insights]
---

## What this is

Annix Insights is a **private, single-user investment intelligence and paper-trading test harness**. It is not a public product. It is not a financial-advice service. It exists so a single human (Andy) can:

- Track a watchlist of assets across global markets
- Pull free historic price data and run a simple signal engine daily
- Auto-trade six paper portfolios in parallel using fake money for 6–18 months
- Decide, with real evidence, whether the signal engine adds value before any real money is committed

## What this is not

- A stock-prediction app
- A trading platform — there is no real-money execution and there will not be in this codebase
- A public product — registration is closed; only the founder account can sign in

## The phased build

The full plan lives in GitHub issue #287. v0.1.0 is reached when Phases 0–7 are complete:

1. **Phase 0** — foundation and single-user lockdown _(you are here)_
2. **Phase 1** — asset / watchlist CRUD
3. **Phase 2** — historic price backfill and daily 06:00 SAST cron
4. **Phase 3** — paper-portfolio infrastructure (six accounts)
5. **Phase 4** — benchmark portfolio auto-execution (SPY + JSE Top 40)
6. **Phase 5** — signal engine v1
7. **Phase 6** — signal-driven auto-execution for the four non-benchmark portfolios
8. **Phase 7** — performance and decision-accuracy analytics

After Phase 7 lands, the test harness runs autonomously for 6–18 months while later phases (news, daily brief, RAG memory, thesis tracker) are built around it.

## Reminders

- Conclusions before ~250 trading days of data are not statistically meaningful.
- The very-high-risk paper portfolio is deliberately reckless to provide a benchmark against disciplined allocation rules — its drawdowns will be ugly.
- Everything you see in this portal is informational only.
