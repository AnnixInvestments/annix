---
title: How news sentiment factors into signals
slug: how-news-sentiment-works
category: Signals
roles: [insights]
order: 5
tags: [news, sentiment, signal-engine, gemini]
lastUpdated: 2026-05-13
summary: How the daily Yahoo Finance news pull feeds the news-sentiment dimension of the signal engine, and how to audit which articles drove each score.
readingMinutes: 3
relatedPaths:
  - annix-backend/src/insights/services/news-ingestion.service.ts
  - annix-backend/src/insights/services/signal-engine.service.ts
  - annix-frontend/src/app/insights/news
---

## What happens at 06:00 SAST

The daily cron pulls fresh news per watchlist symbol from Yahoo Finance, has Gemini extract structured sentiment and impact metadata from each headline, and persists everything to `insights_news_items`. The signal engine then reads recent news per asset when scoring the news-sentiment dimension.

The pipeline order inside the cron:

1. Market data ingestion
2. **News ingestion** ← new in v0.1.x
3. Signal scoring (now uses real news instead of stub-neutral)
4. Benchmark portfolio execution
5. Signal portfolio trade execution
6. Portfolio snapshots

## What Gemini extracts per article

For every new article, Gemini returns a structured JSON object:

- **`event`** — one-sentence summary of what the headline is about
- **`affectedSymbols`** — tickers the article materially mentions (may extend Yahoo's `relatedTickers`)
- **`affectedSectors`** — e.g. `banking`, `mining`, `tech`
- **`affectedCommodities`** — e.g. `copper`, `oil`, `gold`
- **`sentiment`** — a float from `-1.0` (very bearish) to `1.0` (very bullish); `0.0` is neutral
- **`impactLevel`** — `low`, `medium`, or `high`
- **`shortTermImplication`** — expected 1-7 day price effect, one sentence
- **`mediumTermImplication`** — expected 1-3 month structural effect, one sentence

## How the news-sentiment score is computed

When scoring asset `X`, the signal engine:

1. Queries `insights_news_items` for articles where `relatedSymbols` contains `X` and `extraction_status = 'extracted'`, looking back 48 hours.
2. Caps to the 20 most-recent articles.
3. Computes a weighted average sentiment, where `high` impact counts 4×, `medium` counts 2×, and `low` counts 1×.
4. Maps the weighted sentiment from `[-1, 1]` to a `0-100` score (50 = neutral).

If no extracted news matches the symbol, the score falls back to 50 (neutral) and the engine records `source: "no-news"` in `componentBreakdownJson.newsSentiment`. This counts as a missing input and lowers the confidence ceiling.

When real news is available, the engine records:

```json
{
  "score": 64,
  "source": "yahoo-news-extraction",
  "articleCount": 7,
  "articleIds": ["uuid-1", "uuid-2", ...]
}
```

## Auditing what fed a trade

Every `PaperTrade` row carries the full `signalSnapshot` JSON, including the `componentBreakdown.newsSentiment.articleIds[]`. To trace which articles drove a specific buy, join those IDs against `insights_news_items`. The `/insights/news` page lets you filter by symbol.

## Cutover for analytics

Signal snapshots written before this feature shipped carry `source: "stub"` in the news dimension. Anything written after carries either `source: "yahoo-news-extraction"` (real news) or `source: "no-news"` (no recent matching news). Phase 7 performance analytics can partition pre/post-news periods on this field.

## Cost and rate limits

- Yahoo Finance free endpoint, capped at 2 requests/sec by the in-process rate limiter.
- Up to 10 articles per symbol per day. With 30 symbols, max 300 articles surfaced; in steady state typically 30-50 new articles/day after URL dedup.
- Gemini extraction runs only for new (un-deduped) articles. Roughly $0.001 per call → ≤ $1.50/month.

If Gemini fails, the article is still persisted with `extraction_status: 'failed'` so it can be retried later without re-fetching from Yahoo.
