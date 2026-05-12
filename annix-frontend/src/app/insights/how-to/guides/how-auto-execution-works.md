---
title: How auto-execution works
slug: how-auto-execution-works
category: Auto-execution
roles: [insights]
order: 10
tags: [execution, allocation-rules, stop-loss, audit-log]
lastUpdated: 2026-05-12
summary: What the engine does every morning when it auto-trades the four signal portfolios — the order of operations, the rule precedence, and the safety nets.
readingMinutes: 5
relatedPaths:
  - annix-backend/src/insights/services/allocation-rules-engine.service.ts
  - annix-backend/src/insights/services/paper-trade-execution.service.ts
  - annix-backend/src/insights/services/insights-cron.service.ts
---

## The 06:00 SAST cron pipeline

Five stages, in order. Each stage is independently try/catch-wrapped so a transient failure in one doesn't kill the rest:

1. **Market data ingestion** — Yahoo OHLCV for every watchlist asset.
2. **Signal engine** — daily scores for every asset.
3. **Benchmark execution** — `benchmark-spy` and `benchmark-jse40` deploy available cash into SPY / STX40.JO.
4. **Signal execution _(new in Phase 6)_** — `signal-conservative`, `signal-balanced`, `signal-commodity-tilt`, `signal-very-high-risk` auto-trade based on their allocation rules and the latest signals.
5. **Portfolio snapshot** — mark every portfolio to market, write today's `PaperPortfolioSnapshot` rows.

This guide is about stage 4.

## What the engine does for each signal portfolio

```
loop for each active, non-benchmark, non-paused portfolio:
  decisions = AllocationRulesEngineService.evaluateOne(portfolio)

  if decisions is empty:
    write nothing, next portfolio.

  inside ONE database transaction:
    execute sells first (free up cash)
    execute buys next (with the cash that just freed up)
    update portfolio.currentCashBalance
```

If anything fails inside the transaction, the whole portfolio's day rolls back. The trade log stays consistent — you never see "half a day's trades."

## Sell evaluation (runs first, per holding)

For each current holding the engine checks two conditions, in order:

### 1. Confidence dropped below the portfolio's floor

If the latest signal's `confidenceScore < portfolio.allocationRules.confidenceFloor`, the engine sells the entire position. Reasoning code: `confidence-dropped`.

This catches the "the thesis weakened" case — the engine isn't sure enough about this asset to keep risk capital allocated.

### 2. Stop-loss (not for `signal-very-high-risk`)

If the position's mark-to-market P/L is ≤ **−20%** AND the current signal confidence is **lower than the confidence at the original buy** (looked up from the earliest BUY trade for this asset in this portfolio), the engine sells. Reasoning code: `stop-loss`.

`signal-very-high-risk` has no stop-loss by design — that's part of what makes it "very high risk." If a leveraged ETF crashes 40%, that portfolio rides it.

## Buy evaluation (runs after sells)

```
simulated cash = current cash + sum(sell proceeds in this same run)
cash floor = (rules.cashFloorPercent / 100) * totalPortfolioValue
deployable cash = max(0, simulated cash - cash floor)

candidate ranking:
  for each watchlist asset NOT currently held:
    if signal.confidence < portfolio.confidenceFloor → skip
    adjustedScore = opportunity − risk × 0.5
                  + sectorTiltBonus (if portfolio is signal-commodity-tilt
                                     AND asset.sector ∈ tilt sectors)
                  + leverageEtfBonus (if portfolio is signal-very-high-risk
                                      AND asset.assetType = leveraged_etf)

sort desc by adjustedScore

for each candidate in sorted order:
  if buyBudgetSlots = 0 → stop (maxPositions reached)
  if deployableCash < R100 → stop
  position size = min(deployableCash,
                      positionCap% × totalPortfolioValue,
                      sectorRoom)
  qty = floor(size / price)
  if qty <= 0 → skip
  → emit BuyDecision
  deductions: deployableCash, sectorRoom, slot count
```

Note: the engine never sells then re-buys the same asset in the same day. If a sell happens, the asset is excluded from the buy candidates for that run.

## Hard rules enforced per portfolio

| Portfolio | Max positions | Max %/position | Max %/sector | Cash floor | Confidence floor |
|---|---|---|---|---|---|
| `signal-conservative` | 10 | 5% | 25% | 30% | 70 |
| `signal-balanced` | 15 | 8% | 35% | 10% | 60 |
| `signal-commodity-tilt` | 12 | 10% | 30% | 5% | 60 |
| `signal-very-high-risk` | 5 | 30% | (none) | 0% | 50 |

`signal-commodity-tilt` also gets a **+10 score bonus** for assets in tilted sectors (Diversified Mining, PGM Mining, Copper Mining, Gold Miners, Precious Metals, Uranium, Energy, Industrials, Agriculture).

`signal-very-high-risk` gets a **+5 score bonus** for leveraged ETFs (TQQQ, SOXL, NUGT in the seed watchlist).

## Today's decisions preview (no execution)

`GET /insights/paper-portfolios/:slug/decisions/today` returns the exact list of decisions the engine WOULD emit right now, without writing anything. The portfolio detail page surfaces this as the **Today's decisions** card. Use it to:

- Sanity-check what's about to happen before the next cron fires.
- Verify a fix to the rules / signals before unpausing a portfolio.
- Audit *why* the engine didn't do something — the "skip reasons" list shows blocked candidates and the rule that blocked them.

## Per-portfolio pause

Each signal portfolio has a `Pause` / `Resume` button on its detail page. Paused portfolios:

- Show a yellow banner at the top of the detail page.
- Get skipped entirely in stage 4 of the cron — `ExecutionResult.skipped = true, skipReason = "portfolio paused"`.
- Still get snapshotted in stage 5 (so the chart keeps a continuous record while paused).
- Still emit a daily decisions preview, so you can see what the engine WOULD have done.

Pausing is a runtime override — survives restarts, survives deploys. Resume when you're confident.

## Where the safety nets are

1. **Per-portfolio transaction**: one portfolio's bad day can't corrupt another's.
2. **Append-only trade log**: a Postgres `BEFORE UPDATE` trigger rejects mutations. Bug fixes update the engine; old trades stay as they were.
3. **Per-portfolio failure isolation**: `executeAll` swallows per-portfolio crashes into an `ExecutionResult { skipped: true, skipReason: "crashed: …" }`.
4. **Five-stage cron pipeline**: each stage independently try/catch-wrapped — failure in signal engine doesn't kill benchmark execution, etc.
5. **Cash check before each buy**: even mid-transaction, if a buy would overdraw the cash balance, it's skipped with a warning log line.

## The 7-trading-day vigilance gate

After Phase 6 lands, the issue #287 plan requires **7 consecutive trading days with no errors in the trade log** before Phase 7 starts. During that window:

- Watch `logs/annix.log` daily for `ERROR` lines from `InsightsCronService` or `PaperTradeExecutionService`.
- Spot-check the trade log: does every BUY have a sensible reasoning string? Does the average-buy price math look right after a partial add?
- Check `Today's decisions` previews match what landed in the trade log the morning after.

If anything looks off — pause all four portfolios via the UI, fix the engine, and don't unpause until the next day's preview shows clean output.
