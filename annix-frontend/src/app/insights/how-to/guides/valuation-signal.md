---
title: How the valuation signal works
slug: valuation-signal
category: Signals
roles: [insights]
order: 6
tags: [valuation, trailing-pe, sector-peer, signal-engine]
lastUpdated: 2026-05-15
summary: The 25% valuation weight in opportunityScore is now driven by sector-peer P/E medians — explains the data flow, the score formula, and the four data-availability states.
readingMinutes: 3
relatedPaths:
  - annix-backend/src/insights/services/signal-engine.service.ts
  - annix-backend/src/insights/services/market-data-ingestion.service.ts
  - annix-backend/src/insights/services/yahoo-market-data.service.ts
  - annix-backend/src/insights/entities/asset.entity.ts
  - annix-backend/src/insights/entities/signal-snapshot.entity.ts
---

## What this signal asks

"Is this asset cheap relative to the other companies in its sector right now?"

Before v0.1.24 the valuation dimension always returned `50` — a neutral placeholder that dragged 25% of `opportunityScore` to the middle for every asset. With sector-peer P/E plumbed in, valuation now actually moves the score.

## Where the data comes from

The daily cron now hits Yahoo Finance's `quoteSummary` endpoint for every active asset, reads `summaryDetail.trailingPE`, and writes it to two new columns on `insights_assets`:

- `trailing_pe NUMERIC(12,4)` — the latest trailing twelve-month P/E, or NULL when Yahoo doesn't have one (indices, commodities, most leveraged ETFs)
- `pe_updated_at TIMESTAMPTZ` — when we last attempted a refresh

Failures don't kill the snapshot — a stale P/E from yesterday is fine; the next cron retries.

## How the score is computed

At the start of each signal run the engine builds a `Map<sector, {median, peerCount}>` by:

1. Walking every active asset
2. Bucketing by `Asset.sector`
3. Taking the median trailing P/E inside each bucket (nulls dropped)

Then per asset, the score is:

```
discountPct = (sectorMedian - assetPe) / sectorMedian
clamped to [-0.5, +0.5]
score = (clamped + 0.5) / 1.0 * 100
```

Concrete: if your asset trades at half its sector's median P/E, you get the maximum cheap score of **100**. At parity you get **50**. At 1.5× the median, you get **0**.

## The four data states

Every signal snapshot stores a `valuation.source` field — the only one that counts as an "available input" for `confidenceScore` is the first:

| `source` | What it means | Score |
|---|---|---|
| `sector-peer-median` | Real signal: asset has a P/E, sector has ≥ 3 peers, score is meaningful | computed |
| `no-asset-pe` | Asset has no P/E (e.g. `^J200` index, leveraged ETFs) | 50 neutral |
| `insufficient-peers` | Sector has < 3 assets with valid P/E to compare against | 50 neutral |
| `no-sector` | `Asset.sector` is null (commodities, FX) | 50 neutral |

## How to audit one score

The full inputs are stored on each signal snapshot at `componentBreakdownJson.valuation`:

```json
{
  "score": 73.4,
  "trailingPe": 11.2,
  "medianPe": 18.5,
  "source": "sector-peer-median",
  "sector": "Banking",
  "peerCount": 5
}
```

If a score looks wrong, this tells you exactly which peers were in the bucket and what the median was.

## Tips

- **Confidence rises as data fills in**. The signal engine's `confidenceScore` ceiling rises by 10 points for every "available input". With valuation now active, the achievable max climbs from 70 to 80 for any asset where Yahoo returns a P/E and the sector has ≥ 3 peers. The aggressive signal portfolios feel this most.
- **Watch for thin sectors**. Add an asset whose sector currently has fewer than 3 P/E-eligible peers and you'll see `source: insufficient-peers` — adding more assets in that sector to the watchlist activates the signal.
- **P/E is unitless**. ZAR assets and USD assets can sit in the same sector bucket — the median works either way.
