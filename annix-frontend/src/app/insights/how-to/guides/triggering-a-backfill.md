---
title: Triggering a manual backfill
slug: triggering-a-backfill
category: Market Data
roles: [insights]
order: 4
tags: [market-data, backfill, troubleshooting]
lastUpdated: 2026-05-12
summary: When to trigger a manual backfill, how to do it, and what to expect.
readingMinutes: 2
relatedPaths:
  - annix-frontend/src/app/insights/assets/[symbol]/page.tsx
  - annix-backend/src/insights/controllers/insights-admin.controller.ts
---

## When you need a manual backfill

The system auto-backfills 20 years of history when you add a symbol to the watchlist. So manual backfill is only needed when:

- The auto-backfill failed (the asset's detail page shows "no price history yet").
- You want to refresh data after a corporate action (split, dividend) — adjusted close values get updated.
- You added the symbol before the auto-backfill feature shipped (early test data).
- Yahoo Finance temporarily failed during the auto-backfill — retry now to see if it recovers.

## How to do it

1. Navigate to `/insights/watchlist`.
2. Click the symbol you want to refresh (or click into its detail page directly: `/insights/assets/{symbol}`).
3. Click the **Backfill** button in the top-right of the chart card. (If the chart is empty, there's a centred **Run backfill now** button instead.)
4. A branded progress modal shows the operation. The estimate is calibrated from previous backfill durations so it gets sharper over time.
5. On success, the chart populates within seconds.

## What the backfill does

`POST /insights/admin/backfill?symbol={symbol}` runs the same code path as the daily cron, but pulls the **full 20-year history** instead of the incremental update. Existing rows are deduped — the unique index on `(asset_id, date)` makes the operation idempotent. So backfill-and-rebackfill is safe.

## When backfill fails

- Check the symbol is right — Yahoo uses `BHP.AX` not `BHP.JSE`; `^GSPC` not `SPX`; `STX40.JO` not `STX40`.
- Try the **Backfill** button again — Yahoo's free endpoints sometimes fail transiently. The retry logic in `YahooMarketDataService` already handles `429`/`503` with exponential backoff, so most flakes recover on their own.
- If Yahoo genuinely doesn't cover the symbol, the only options are to find a Yahoo-supported equivalent or remove the symbol from the watchlist.

## Want to refresh every watchlist asset?

`POST /insights/admin/daily-snapshot/run` is the same code path as the 06:00 SAST cron but you can trigger it manually. There's no UI button for this yet — call it via the API. It returns a summary like `{ totalInserted: 42, failed: ["EXAMPLE.AX"] }`.
