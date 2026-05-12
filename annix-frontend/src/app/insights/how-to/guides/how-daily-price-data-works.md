---
title: How daily price data works in Insights
slug: how-daily-price-data-works
category: Market Data
roles: [insights]
order: 3
tags: [market-data, yahoo-finance, cron, backfill]
lastUpdated: 2026-05-12
summary: Where Insights gets price history from, when the daily snapshot runs, and how the auto-backfill behaves when you add a new symbol.
readingMinutes: 3
relatedPaths:
  - annix-backend/src/insights/services/market-data-ingestion.service.ts
  - annix-backend/src/insights/services/yahoo-market-data.service.ts
  - annix-backend/src/insights/services/insights-cron.service.ts
---

## Data source

Insights pulls daily OHLCV bars (open, high, low, close, adjusted close, volume) from **Yahoo Finance** via the [`yahoo-finance2`](https://github.com/gadicc/node-yahoo-finance2) MIT-licensed npm package. No API key. No paid tier. Yahoo covers JSE (`.JO` suffix), all major US exchanges, LSE, ASX, HKEX, TSE, indices (`^GSPC`, `^J200`), and most commodity ETFs.

Yahoo is an *unofficial* API — the library reverse-engineers Yahoo's public endpoints. Insights respects this:

- Calls are throttled to **≤ 2 requests / second**, serialised through a chained promise.
- Failed responses with `429` or `503` retry up to 4 times with exponential backoff (1s → 2s → 4s → 8s).
- Other errors fail fast.

## Auto-backfill on watchlist add

When you add a new symbol via the watchlist, the backend fires-and-forgets a backfill in the background. By default it pulls **20 years of daily history**. For a typical symbol on the JSE or US exchanges, that's ~5,000 rows and takes 10–30 seconds.

You can keep using the UI immediately — the backfill happens out-of-band. Refresh the symbol's detail page to see the chart populate.

If the backfill fails (e.g. Yahoo doesn't recognise the ticker), the failure is logged but the watchlist entry stays. You can:

- Trigger a manual backfill from the asset detail page (`/insights/assets/{symbol}` → **Backfill** button).
- Try a different ticker variant (e.g. `BHP.AX` instead of `BHG.JO`).
- Remove the symbol from the watchlist if Yahoo simply doesn't cover it.

## Daily snapshot cron

A `@Cron("0 6 * * *", { timeZone: "Africa/Johannesburg" })` job called **`insights:daily-snapshot`** runs every morning at 06:00 SAST. It:

1. Loads every active asset on the watchlist.
2. For each one, pulls only the dates **after the latest stored row** (incremental).
3. Inserts new rows; existing `(asset_id, date)` pairs are skipped by a UNIQUE index and a defensive `.orIgnore()` on the SQL insert.
4. Per-asset failures are caught — one bad symbol doesn't kill the batch.

By 06:30 SAST yesterday's US close data is settled and clean, and you get ~3 hours' lead time before the JSE opens at 09:00.

The cron is registered in `JOB_METADATA`, so you can pause it, resume it, or change the cadence from **Admin → Scheduled Jobs**.

## Why 06:00 SAST and not another time

- 06:00 already has the `comply-sa:deadline-notifications` cron firing, so Neon is already awake. Adding Insights to the same wake-up window is essentially free compute.
- 22:30 SAST (which would catch US close same-day) falls inside the 12-hour night-suspension window (18:00–06:00 SAST) and is intentionally avoided.
- One cron per day is enough for daily-bar resolution. Intraday data is not collected by Insights — by design.

## Where the data lives

| Table | Purpose |
|---|---|
| `insights_assets` | One row per symbol with name, exchange, currency, asset type, sector. |
| `insights_watchlist_items` | The watchlist itself — at most one row per asset. |
| `insights_price_history` | One row per `(asset_id, trading_date)`. OHLCV in `numeric(18,6)`, volume in `bigint`. |

A `UNIQUE(asset_id, date)` constraint on `insights_price_history` makes every ingestion run idempotent — running the cron twice on the same day is a no-op for already-stored bars.
