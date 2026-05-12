---
title: Reading the trade log
slug: reading-the-trade-log
category: Paper Portfolios
roles: [insights]
order: 6
tags: [paper-portfolios, trade-log, audit]
lastUpdated: 2026-05-12
summary: What each column means, what each action means, and what fields fill in as later phases ship.
readingMinutes: 2
relatedPaths:
  - annix-frontend/src/app/insights/paper-portfolios/[slug]/trades
  - annix-backend/src/insights/entities/paper-trade.entity.ts
---

## How to get there

`/insights/paper-portfolios/{slug}/trades` from the **Full trade log** button on a portfolio detail page. Or click **View all** under the "Recent trades" list.

## What each column means

| Column | Meaning |
|---|---|
| **When** | When the trade was executed (UTC stored, SAST displayed). |
| **Action** | One of four — see below. |
| **Symbol** | The asset acted on. Empty for `contribution` rows (cash credits aren't tied to a symbol). |
| **Qty** | Units bought or sold. Always positive. |
| **Price** | Per-unit price at execution. |
| **Value** | `qty × price`. For contributions, the cash amount credited. |
| **Conf** | The confidence score the engine assigned to the underlying signal at the time. Higher = the engine was surer. **Tracking confidence vs actual outcome is how Phase 7 will tell you whether the engine's confidence calibration is honest.** |
| **Reasoning** | Free-form text. For automated trades it includes a breakdown of which signals fired and why. For contributions it explains the cron source. |

## The four actions

| Action | When it happens |
|---|---|
| `buy` | The execution engine (Phase 6+) opened or increased a position. |
| `sell` | The engine closed or reduced a position. |
| `rebalance` | A planned re-weight rather than a fresh decision (Phase 6+ refinement; not yet emitted). |
| `contribution` | The monthly R5,000 cash credit landed via the `insights:monthly-contribution` cron. |

In Phase 3 (now), the only action you'll see is `contribution`. Buys and sells start landing once Phase 4 fires the benchmarks and Phase 6 wires up the signal-driven portfolios.

## Fields that fill in later

Several fields on a PaperTrade row are nullable today and get populated as later phases ship:

| Field | Phase | What it'll hold |
|---|---|---|
| `opportunityScore` | Phase 5 | Aggregate signal score at execution. |
| `riskScore` | Phase 5 | Aggregate risk score at execution. |
| `confidenceScore` | Phase 5 | Combined confidence (capped lower until news sentiment ships in Phase 8). |
| `marketRegime` | Phase 12 | Classification of the macro environment at execution. |
| `signalSnapshot` | Phase 5 | JSON dump of every signal's component values. |
| `relatedNewsIds` | Phase 8 | Which news items influenced this trade. |

Until then, those columns are `null` and the **Reasoning** text is the source of truth.

## Filtering

The action filter pills at the top of the trade-log page let you isolate one action type at a time. Counts in each pill reflect the (up to) 1,000 most recent trades fetched for the portfolio.

## Immutable by design

You cannot edit or delete a trade row from the UI. Even at the database level, a `BEFORE UPDATE` trigger throws an exception — so a buggy migration or stray `UPDATE` SQL cannot mutate the audit log. Inserts are append-only.

This matters because Phase 7's analytics ("did high-confidence trades actually beat low-confidence trades?") relies on the trade log being a faithful historical record of what the engine knew at execution time. A mutable log would silently let later "corrections" change the answer.
