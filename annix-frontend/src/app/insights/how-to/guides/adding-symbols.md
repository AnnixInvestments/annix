---
title: Adding a symbol to the Insights watchlist
slug: adding-symbols
category: Getting Started
roles: [insights]
order: 2
tags: [watchlist, symbols, yahoo-finance]
lastUpdated: 2026-05-12
summary: How to add and remove symbols from the Annix Insights watchlist, and what each field means.
readingMinutes: 3
relatedPaths:
  - annix-frontend/src/app/insights/watchlist
  - annix-frontend/src/app/lib/query/hooks/insights/useWatchlist.ts
  - annix-frontend/src/app/lib/api/insightsApi.ts
  - annix-backend/src/insights/services/watchlist.service.ts
---

## What the watchlist is for

The watchlist is the canonical list of assets that the Insights signal engine will run against every day at 06:00 SAST (once Phases 2–6 land). Anything not on the watchlist is invisible to the system.

## Adding a symbol

1. Open **Watchlist** from the Insights dashboard.
2. Click **Add symbol**.
3. Fill in the fields:
   - **Yahoo symbol** — the Yahoo Finance ticker. Examples:
     - JSE: `AGL.JO`, `IMP.JO`, `STX40.JO`
     - US: `SPY`, `QQQ`, `AAPL`
     - LSE: `BP.L`, `HSBA.L`
     - ASX: `BHP.AX`, `RIO.AX`
     - Indices: `^GSPC` (S&P 500), `^J200` (FTSE/JSE Top 40)
     - Commodities (futures-backed ETFs): `GLD`, `SLV`, `URA`, `COPX`
   - **Display name** — the human-readable name (e.g. "Anglo American"). Shown in tables and trade reasoning text.
   - **Exchange** — listing exchange. Use `INDEX` for raw indices, `COMMODITY` for spot commodity tickers.
   - **Currency** — trading currency. Independent of the exchange (e.g. some LSE shares price in USD).
   - **Asset type** — `Stock`, `ETF`, `Leveraged ETF`, `Commodity`, `Index`, `Forex`, or `Crypto`. The signal engine routes differently based on this.
   - **Sector** _(optional)_ — free-form label used by sector-allocation rules in the paper portfolios.
   - **Why this asset?** _(optional)_ — your thesis at the time of adding. Becomes the seed for the contrarian engine in Phase 11.
   - **Notes** _(optional)_ — anything else you want to record.
4. Click **Add to watchlist**.

## Removing a symbol

1. Click the trash-can button on a row.
2. Confirm.

The asset row itself is preserved in the database (so historic price data for that symbol survives), only the watchlist link is broken. If you re-add the same symbol later, it'll attach to the same `Asset` record.

## Rules

- Symbol must be unique on the watchlist — you can't add the same symbol twice.
- Symbol is automatically uppercased.
- A trimmed empty symbol or empty name is rejected.

## Tips

- Use Yahoo Finance's search to find the right ticker for non-US symbols. The Yahoo API only returns data for symbols Yahoo recognises.
- JSE smaller-caps and some commodity tickers are patchy on the Yahoo free tier. If Phase 2 reports "no history" for an asset, swap to a more liquid proxy or remove it from the watchlist.
- For leveraged ETFs (TQQQ, SOXL, NUGT), pick the `Leveraged ETF` asset type — the very-high-risk paper portfolio (portfolio 6) has special handling for these.
