---
title: Understanding the six paper portfolios
slug: understanding-paper-portfolios
category: Paper Portfolios
roles: [insights]
order: 5
tags: [paper-portfolios, benchmarks, risk]
lastUpdated: 2026-05-12
summary: What the six paper portfolios are, why they exist, what each one is testing, and how the monthly contribution works.
readingMinutes: 4
relatedPaths:
  - annix-frontend/src/app/insights/paper-portfolios
  - annix-backend/src/insights/services/paper-portfolio.service.ts
  - annix-backend/src/migrations/1820100000084-SeedInsightsPaperPortfolios.ts
---

## Why six portfolios

The whole point of Annix Insights is to answer one question with **real data, not vibes**:

> Is the signal engine actually any good, or would I be better off buying-and-holding an index ETF?

A single signal-driven portfolio can't answer that — you need controls. So six portfolios run in parallel on the same data, the same daily cron, the same starting capital, the same monthly drip. After ~12 months of side-by-side returns the differences become evidence rather than gut feel.

## The six accounts

All six start at **R100,000** and receive **R5,000 every month on the 1st at 06:00 SAST**.

| Slug | Display | What it tests |
|---|---|---|
| `benchmark-spy` | Benchmark · S&P 500 | The "could I have just bought SPY and gone fishing?" baseline. 100% SPY, never sells. |
| `benchmark-jse40` | Benchmark · JSE Top 40 | Same question in ZAR. 100% STX40.JO. |
| `signal-conservative` | Signal · Conservative | Risk-first signal portfolio. Max 10 positions / 5% each / 25% per sector / 30% cash floor in bearish regimes. Confidence ≥ 70. |
| `signal-balanced` | Signal · Balanced | The "honest middle". Max 15 positions / 8% each / 35% per sector / 10% cash floor. Confidence ≥ 60. |
| `signal-commodity-tilt` | Signal · Commodity Tilt | Tests Andy's claimed domain edge in mining / PGM / energy / industrials. +10 score bonus to those sectors; can put up to 30% in any single sector (vs 25%). Confidence ≥ 60. |
| `signal-very-high-risk` | Signal · Very High Risk | Reckless by design. Max 5 positions / 30% each, no sector cap, no cash floor, willing to all-in on leveraged ETFs (TQQQ / SOXL / NUGT). Confidence ≥ 50. |

The very-high-risk account is *deliberately reckless* — it exists so the disciplined portfolios have something concrete to be measured against. If after 12 months it's beaten the conservative one, that's an uncomfortable truth worth knowing. If it gets blown up during a drawdown, that's the data Andy needs to stay disciplined when emotion says "just buy TQQQ".

## Monthly contribution

A cron at `0 6 1 * *` SAST (**06:00 on the 1st of every month**) credits R5,000 cash to every active portfolio and writes a `contribution` row into the trade log with full reasoning text. The cron is named `insights:monthly-contribution` and shows up in Admin → Scheduled Jobs — you can pause it, re-cadence it, or trigger it manually from there.

The monthly drip simulates a realistic disciplined-investor pattern. After 12 months each portfolio has had R100,000 starting + R60,000 contributions = R160,000 deployed (excluding gains/losses). After 24 months it's R220,000.

## What's in this version

Phase 3 is the *infrastructure* — the entities, the seed, the read-side API, the monthly cron. The execution engine that actually buys and sells based on signals lands in Phase 6.

- **Now:** portfolios exist, can be viewed, monthly contributions land.
- **Phase 4:** `benchmark-spy` and `benchmark-jse40` auto-buy on day one. The other four still sit in cash.
- **Phase 5:** signal engine starts scoring assets daily.
- **Phase 6:** the four signal portfolios begin auto-trading on those scores. **This is the riskiest gate in the whole plan** — bugs here corrupt the dataset the entire 6–18 month test depends on.

## Reading the cards on the index page

| Field | What it means |
|---|---|
| Total value | Cash + market value of all holdings. |
| Cash | Uninvested ZAR balance. |
| Invested | Sum of `marketValue` over all holdings. |
| Holdings | Number of distinct assets held. |
| Total return | `(total value − starting capital) / starting capital`. Doesn't deduct monthly contributions yet — Phase 7 will fix that to a contribution-adjusted return. |

## Why the trade log is immutable

The `insights_paper_trades` table has a Postgres `BEFORE UPDATE` trigger that raises an exception. Even a buggy migration or stray `queryRunner.update(...)` cannot mutate a trade row. The audit log is append-only by construction — every decision is preserved with the reasoning the system had at the time. That's the substrate Phase 7's signal-accuracy analytics will chew on.
