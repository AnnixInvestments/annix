---
title: How the macro news feed works
slug: macro-news-feed
category: Signals
roles: [insights]
order: 8
tags: [macro, news, sentiment, gemini, yahoo]
lastUpdated: 2026-05-15
summary: The second daily news pull — broad financial themes the per-symbol Yahoo search misses (Fed, oil, ZAR, China demand). How the queries are chosen, how the daily score is computed, and what it currently does NOT do.
readingMinutes: 4
relatedPaths:
  - annix-backend/src/insights/config/macro-queries.ts
  - annix-backend/src/insights/services/news-ingestion.service.ts
  - annix-backend/src/insights/services/macro-sentiment.service.ts
  - annix-backend/src/insights/controllers/insights-macro.controller.ts
  - annix-backend/src/insights/entities/macro-sentiment-snapshot.entity.ts
  - annix-frontend/src/app/insights/components/MacroSentimentPanel.tsx
---

## Why this exists

The per-asset news pipeline searches Yahoo for articles about each watchlist symbol. That captures earnings, M&A, and corporate-specific news well — but it misses:

- Fed rate decisions (rarely tag a specific ticker)
- Commodity supply shocks ("Indonesia bans nickel exports")
- Geopolitical events that move the JSE / ZAR / commodity basket
- Cross-sector contagion ("China construction slowdown" → mining)

The macro feed is the second pull each cron that goes after exactly that broad context.

## What it actually does

Each 06:00 and 18:00 SAST cron runs:

1. The existing per-asset news pull (unchanged).
2. **The macro pull**: iterates the curated `MACRO_QUERIES` list and calls `yahooFinance.search(query)` for each.
3. The same Gemini extraction pipeline runs on every article — extracting `sentiment`, `impactLevel`, `affectedSectors`, `affectedCommodities`, etc.
4. Macro articles are stored in `insights_news_items` with `feed_type='macro'` and `macro_query` set to the query that brought them in.
5. After both pulls finish, `MacroSentimentService.captureForToday()` summarises the last 48h of macro articles into a daily snapshot.

## The query list (today)

15 curated themes focused on the JSE + commodity + ZAR exposure of the current watchlist:

> Federal Reserve interest rate · SARB monetary policy · South African economy · JSE All Share Index · rand dollar exchange rate · China commodity demand · iron ore price · gold price outlook · platinum demand · copper supply · oil price · US inflation · global trade tensions · emerging markets outlook · S&P 500 outlook

To change it: edit `annix-backend/src/insights/config/macro-queries.ts`. The list is a `ReadonlyArray<string>`. New queries take effect on the next cron run — no migration needed.

## How the daily score is computed

`MacroSentimentService.captureForToday()`:

1. Pull every `feed_type='macro'`, `extraction_status='extracted'` row from the last 48 hours.
2. Compute the impact-weighted mean of Gemini's sentiment scores:
   ```
   overallScore = Σ (sentimentᵢ × wᵢ) / Σ wᵢ
   where w = 4 for "high" impact, 2 for "medium", 1 for "low"
   ```
3. Clamp to `[-1, +1]`.
4. Aggregate `relatedThemes` into two breakdowns:
   - **Commodity** themes (matched against an internal set — gold, copper, iron ore, oil, lithium, etc.)
   - **Sector** themes (everything else — banking, mining, technology, etc.)
   - Each tracks per-key count + mean sentiment.
5. Upsert today's row in `insights_macro_sentiment_snapshots` (deletes the existing same-date row first — re-running the pipeline same-day is safe).

## What the dashboard shows

Top of `/insights`:

- **Overall** — the score, colour-coded: red below −0.15, amber in between, green above +0.15. Plus a 30-day sparkline so today's reading is in context.
- **Top sectors** — the 3 sectors with the most articles in the 48h window. Per-sector mean sentiment + article count.
- **Top commodities** — same shape, commodity-tagged themes only.

If the cron hasn't run today yet, the panel shows a friendly "no snapshot yet" message instead.

## What this currently does NOT do

**The macro score does NOT influence any trade decision yet.** It's visibility-only.

This is deliberate. Wiring macro sentiment into the signal engine has three plausible shapes:

- A new 6th component of `opportunityScore` (alongside momentum / valuation / news / sector / drawdown)
- A confidence-floor modifier (bearish macro → raise confidenceFloor across rules-based portfolios)
- A cash-floor adjuster on signal-driven portfolios (bearish macro → hold more cash)

Picking one before we have 2–4 weeks of macro snapshots to look at would be guessing. The integration is queued as **Phase 8.7**.

## API endpoints (admin / dashboards)

| Verb | Path | Returns |
|---|---|---|
| GET | `/insights/macro/today` | Today's snapshot, or `null` if cron hasn't run |
| GET | `/insights/macro/history?limit=N` | Last N snapshots, ascending date. Default 30, max 90. |

Both require `INSIGHTS_ROLE`.

## Tips

- **Manual trigger**: the existing `POST /insights/admin/cron/run` runs the full pipeline including the macro pull. Useful for testing after editing the query list.
- **Dedup safety**: the URL-hash dedup catches articles that appear in both per-asset and macro pulls — they're stored once with whichever `feed_type` first found them.
- **Cost**: 15 queries × 10 articles = 150 macro candidates per cron, after dedup typically 40–80 new articles → 40–80 extra Gemini calls/day. Negligible against the per-asset volume.
- **Why no "broad financial news" source?** Yahoo's search by topic is good enough at zero marginal cost. We could plug in Bloomberg / Reuters RSS later if the per-query results turn out thin, but the bar for adding a paid source is performance evidence, not just "more news".
