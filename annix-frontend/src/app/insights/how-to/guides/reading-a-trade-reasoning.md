---
title: Reading a trade reasoning
slug: reading-a-trade-reasoning
category: Auto-execution
roles: [insights]
order: 11
tags: [trades, reasoning, audit-log]
lastUpdated: 2026-05-12
summary: How to decode the full reasoning string attached to every signal-driven trade — what each piece means and what to look for when a trade surprises you.
readingMinutes: 3
relatedPaths:
  - annix-backend/src/insights/services/allocation-rules-engine.service.ts
  - annix-frontend/src/app/insights/paper-portfolios/[slug]/trades
---

## A real example

```
BUY 5 AGL.JO @ 423.50. opp=78 risk=42 conf=70. Top contributors:
momentum:82, sector:75, drawdown-clearance:68. Allocation: 7.81%
of portfolio, 14.32% of Diversified Mining. Adj-score 67.50 (tilt+10,
lev+0). Rule path: confidence>=60 (got 70) · position<=10% (got 7.81%)
· sector<=30% (got 14.32%).
```

Every piece of that string has a job. From left to right:

## Action + sizing

```
BUY 5 AGL.JO @ 423.50
```

- Action (`BUY` / `SELL`).
- Quantity (integer — fractional shares aren't supported).
- Symbol.
- Estimated execution price (latest close from `insights_price_history`).

## Aggregate scores

```
opp=78 risk=42 conf=70
```

The three aggregate scores at the moment the decision was made. Stored as separate columns on the `PaperTrade` row too — these are duplicated here for human readability.

## Top contributors

```
Top contributors: momentum:82, sector:75, drawdown-clearance:68
```

The three highest signal components. `drawdown-clearance` is `100 − drawdownRisk` (so high = far from peak = headroom to grow).

This tells you *why* the asset ranked highly. In this example, momentum + sector trend + good distance from peak combined to push it to the top of the buy list.

## Allocation

```
Allocation: 7.81% of portfolio, 14.32% of Diversified Mining
```

- Position % of total portfolio value (cash + invested) at execution.
- Cumulative sector % (this position plus any other holdings in the same sector).

Use these to sanity-check the position-cap and sector-cap rules.

## Adjusted score + tilt

```
Adj-score 67.50 (tilt+10, lev+0)
```

The score the engine actually ranked candidates by:

```
adjusted = opportunity − risk × 0.5 + sectorTiltBonus + leverageEtfBonus
```

In this example, `signal-commodity-tilt` added 10 because AGL.JO is in `Diversified Mining`. No leveraged-ETF bonus (it's a stock).

## Rule path

```
Rule path: confidence>=60 (got 70) · position<=10% (got 7.81%) · sector<=30% (got 14.32%)
```

The hard-rule checks the engine ran, with each rule's threshold and the actual measured value. This is the audit trail — if you ever wonder "should this trade have happened?", read the rule path.

## Sell reasoning has a different shape

```
SELL 5 AGL.JO @ 380.20. P/L -10.22%. Signal confidence dropped
(confidence 55 < floor 60). Closing position.
```

Sell strings include the realised P/L on the position and a `confidence-dropped` or `stop-loss` reason code.

Stop-loss example:

```
SELL 5 AGL.JO @ 335.40. Stop-loss triggered: P/L -20.95% <= -20%
and confidence 55 < original-buy confidence 70. Closing position.
```

## Where the breakdown JSON lives

Beyond the reasoning string, the full signal breakdown at execution time is stored in the `signal_snapshot` jsonb column on the `PaperTrade` row. Includes:

- `signalSnapshotId` — link back to the originating signal row.
- `signalSnapshotDate` — what trading-day's signal was used.
- `breakdown` — the full five-component JSON (so months later you can still see the ROC, the SMA crossover, the sector ETF performance, etc. that fed the score).
- `adjustedScore` — the rank score after tilts.

That JSON isn't shown in the trade-log UI today (would clutter the table); it's there for offline audit / future Phase 7 analytics.

## When a trade surprises you

1. Find the trade in `/insights/paper-portfolios/{slug}/trades`.
2. Read the rule path — does the trade satisfy every rule? If not, that's a bug.
3. Read the top contributors — does the breakdown make sense? If a "momentum:82" trade landed on an asset you know is trending down, check what the underlying ROC was (signal_snapshot JSON in the DB).
4. Check the asset's price history on `/insights/assets/{symbol}` — was the latest-close on the trade day actually what we'd expect?
5. If the engine made a *correct* decision that just feels surprising, save the reasoning to the issue tracker as data — Phase 7's signal-accuracy analytics will tell you over time whether the engine's "surprising" decisions are right more often than your gut.
