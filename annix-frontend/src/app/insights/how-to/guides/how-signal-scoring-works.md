---
title: How signal scoring works in v1
slug: how-signal-scoring-works
category: Signal Engine
roles: [insights]
order: 8
tags: [signals, signal-engine, scoring, momentum, valuation]
lastUpdated: 2026-05-12
summary: What the five signals are, how they're computed, how the opportunity / risk / confidence aggregates work, and which dimensions are stubbed in v0.1.0.
readingMinutes: 5
relatedPaths:
  - annix-backend/src/insights/services/signal-engine.service.ts
  - annix-backend/src/insights/config/sector-etf-map.ts
  - annix-backend/src/insights/entities/signal-snapshot.entity.ts
---

## The big picture

Every morning at 06:00 SAST, the daily cron computes five signals for every active asset on the watchlist and writes one immutable `SignalSnapshot` row per asset per day. Each signal is normalised to 0-100. They're combined into three aggregate scores (opportunity / risk / confidence) that Phase 6 will use to drive paper-portfolio trades.

**Phase 5 does not trade.** It only generates and stores the scores. Phase 6 is where the four non-benchmark portfolios start acting on them.

## The five signals

### 1. Momentum (real)

Two components combined 70/30:
- **20-day rate-of-change (ROC):** `(latestClose − close20DaysAgo) / close20DaysAgo × 100`. Clamped to ±25%, then mapped to 0-100.
- **50-day SMA crossover:** `(latestClose − sma50) / sma50 × 100`. Clamped to ±15%, then mapped to 0-100. Skipped (defaults to 50) when fewer than 50 closes are available.

A score near **70+** means strong recent positive momentum. Near **30** means strong negative.

### 2. Valuation (stub)

Returns **50 (neutral)** for every asset in v0.1.0. The plan calls for P/E ratio compared to the asset's own 5-year median, but Insights doesn't store historical P/E (it's not in the price-history schema). This dimension is registered as **missing** in the confidence calculation.

Will become real when Phase 12's valuation engine adds a P/E history store. Don't read anything into a 50 here — it's the placeholder, not a verdict.

### 3. News sentiment (stub)

Returns **50 (neutral)** until Phase 8 lands the Nix-profile news ingestion. Tagged `source: "stub"` in the breakdown JSON so it's obvious you're looking at the placeholder, not real sentiment. Also registered as missing in the confidence calculation.

### 4. Sector trend (real, when mapped)

Looks up the asset's sector → the corresponding ETF (via `annix-backend/src/insights/config/sector-etf-map.ts`), then computes that ETF's **20-day ROC** clamped to ±15% and mapped to 0-100.

Current mappings (extract):
- `Diversified Mining`, `PGM Mining`, `Copper Mining` → COPX
- `Precious Metals`, `Gold Miners (2x)` → GLD
- `Uranium` → URA
- `Energy` → XLE, `Industrials` → XLI, `Financials/Banking` → XLF
- `Technology`, `US Tech`, `Semiconductors` → QQQ
- `US Equity` → SPY, `SA Equity` → STX40.JO
- `Agriculture` → DBA

Unmapped sectors (e.g. `Banking` for JSE-listed SBK or `Telecoms` for MTN) return **50** and register as missing in confidence.

### 5. Drawdown risk (real)

`(52-week peak − latest close) / 52-week peak × 100`, clamped to 0-100. Higher = bigger drop from the recent peak = more downside risk (and less upside left to grab).

This is the only signal where **higher means worse**. The aggregator handles the inversion automatically.

## Aggregate scores

### Opportunity (0-100)

```
opportunity = 0.30 · momentum
            + 0.25 · valuation
            + 0.20 · newsSentiment
            + 0.15 · sectorTrend
            + 0.10 · (100 − drawdownRisk)
```

With valuation + news stubbed at 50, you're effectively scoring on momentum + sector-trend + drawdown-risk only. The 45% weight assigned to the stubs is intentional — the moment Phase 8 and Phase 12 land, those dimensions become real without re-weighting.

### Risk (0-100)

```
risk = 0.5 · drawdownRisk
     + 0.3 · (100 − valuation)
     + 0.2 · volatilityProxy(50)
```

Volatility proxy is fixed at 50 in v0.1.0; will hook into the per-portfolio volatility from PortfolioSnapshotService in Phase 7.

### Confidence (0-100)

```
confidence = 80 − 10 × inputsMissing.length
```

Starts at 80 — a one-input-missing system tops out at 70, two-missing at 60, etc. In v0.1.0, valuation + news are always missing (stubs), so the baseline ceiling is **60-70**. That's intentional — no asset should show 90+ confidence until the signal engine is actually fully wired.

The four portfolios' `confidenceFloor` values (50 / 60 / 70) were set with this in mind:
- `signal-very-high-risk` (floor 50) — almost everything passes the floor.
- `signal-balanced` and `signal-commodity-tilt` (floor 60) — most assets pass.
- `signal-conservative` (floor 70) — only the cleanest signals pass.

This means in Phase 6 the conservative portfolio will trade rarely until news + valuation are real — which is exactly the "conservative" behaviour you want.

## How the breakdown JSON helps you audit

Every `SignalSnapshot` row carries `componentBreakdownJson` with every input value used. Months later, when you want to understand "why did the engine score AGL.JO 75 on opportunity that day?", that JSON has the ROC, the SMA crossover, the sector-ETF ROC, the distance from peak — everything.

The signal table is **immutable** at the DB level (BEFORE UPDATE trigger). Same audit-log discipline as PaperTrade. The score on disk is the score the engine had at execution time, full stop.

## What you'll see in the UI

- `/insights/signals` — sortable table: symbol, name/sector, opportunity bar, risk bar, confidence bar, expandable breakdown row.
- `/insights/assets/[symbol]` — a "Latest signal" card with the three aggregate scores + full breakdown, plus a 90-day opportunity-score sparkline.
- Filter by symbol/name/sector. Sort by any score (ascending or descending toggle).

## Common questions

**Why does everything look mid-50s?** That's the stubbed-dimensions baseline. Once Phase 8 (news) and Phase 12 (valuation) land, scores will diverge much more.

**Why is the conservative portfolio's confidence floor unreachable for now?** By design — it shouldn't trade until the engine is fully wired. Better that than acting on half-real signals.

**The signal table can't be edited?** Right. `BEFORE UPDATE` Postgres trigger raises an exception. The score the engine wrote is the score you'll always see. If a calculation was wrong, you fix the *engine* and the *next* daily snapshot is correct — the historical record stays honest.
