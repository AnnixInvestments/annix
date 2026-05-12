---
title: Reading a signal breakdown
slug: reading-a-signal-breakdown
category: Signal Engine
roles: [insights]
order: 9
tags: [signals, signal-engine, breakdown, debugging]
lastUpdated: 2026-05-12
summary: How to interpret the expandable breakdown row on the Signals table — what each component value means and what counts as a "stubbed" dimension.
readingMinutes: 3
relatedPaths:
  - annix-frontend/src/app/insights/signals
  - annix-frontend/src/app/insights/signals/components/SignalBreakdown.tsx
---

## How to open one

On `/insights/signals`, click any row. The row expands to reveal the **signal breakdown** — five rows, one per component, each with its 0-100 score bar plus the raw inputs used to compute that score.

You can also see the same breakdown on `/insights/assets/[symbol]` under the "Latest signal" card.

## What each line means

### Momentum

```
ROC +3.42%  ·  SMA +1.18%
```

- **ROC** is the 20-day rate-of-change: how much the close moved over the last 20 trading days. `+3.42%` means the asset is 3.42% above where it was 20 days ago.
- **SMA** is the 50-day simple-moving-average crossover: how far the latest close is above (or below) the 50-day SMA, as a percentage. `+1.18%` means the close is 1.18% above its 50-day average — a mildly bullish setup.
- If "SMA —" appears, the asset has fewer than 50 closes stored yet. The momentum score then comes from ROC alone, weighted slightly differently.

### Valuation

```
P/E —  ·  median —
```

In v0.1.0, this is **always** "— · —" because P/E history isn't stored. The score will always be 50 (neutral) and this dimension counts as **missing** in the confidence calculation.

When Phase 12 wires up a P/E store, you'll see e.g. `P/E 13.4 · median 18.6`. A score above 50 means the current P/E is below the 5-year median (cheap vs history). Below 50 means expensive.

### News sentiment

```
source: stub
```

In v0.1.0, **always** `source: stub` → score 50. Confirms the dimension is missing.

When Phase 8 lands, `source` will become e.g. `nix-news-v1` and the score will reflect Gemini-extracted sentiment from yesterday's news for that symbol/sector.

### Sector trend

```
Diversified Mining  ·  ETF COPX  ·  +2.14%
```

- The asset's sector (as stored on the watchlist row).
- The ETF used as the sector proxy (from the static sector → ETF map).
- The ETF's 20-day ROC.

If you see `no sector` or `ETF —`, the asset either has no sector tag or its sector isn't in the map. The score then defaults to 50 (neutral) and counts as **missing**.

To fix an unmapped sector permanently, update `annix-backend/src/insights/config/sector-etf-map.ts` and the next 06:00 cron picks it up. Make sure the chosen ETF is also on the watchlist (so its price history actually exists).

### Drawdown risk

```
peak 1287.50  ·  4.32% below
```

- The 52-week peak close (in the asset's quoted units).
- How far below that peak the latest close sits, as a positive percentage.

This line uses the **risk** colour (red) on the score bar because higher = worse. A score of **0** means the asset is at its 52-week high (no downside-from-peak risk). A score of **40** means it's already 40% off its peak — a big drawdown's worth of downside risk has materialised.

## The "stubbed dimensions" warning

At the bottom of the breakdown, you may see a yellow line like:

> Stubbed dimensions: valuation, news, sector-etf — confidence ceiling is 50.

That's the engine being honest. Each stubbed/missing dimension drops the max possible confidence by 10. In v0.1.0:
- Valuation is always stubbed → -10
- News is always stubbed → -10
- Sector-ETF is sometimes missing → -10

Three missing → confidence ceiling is 50. Two missing (everything mapped properly to a sector ETF) → ceiling is 60.

Read confidence as **"how much of my full input model fired"**, not "how sure am I". The conservative portfolio's 70 floor is intentionally above the current ceiling so it doesn't trade until Phase 8+12 ship.

## When the breakdown is empty

If you don't see a signal row at all for an asset, the cron skipped it. Common reasons:

- **< 21 price-history rows** stored. Trigger a backfill from the asset detail page (`/insights/assets/[symbol]` → **Backfill**).
- **Asset is `isActive: false`** — only active assets are scored.
- **Today's cron hasn't run yet** — if you're looking before 06:00 SAST, the latest snapshot is yesterday's.

Re-runs of the cron on the same day are idempotent (existing row deleted + new one inserted). You can manually re-run via `POST /insights/admin/daily-snapshot/run` if you want to refresh.
