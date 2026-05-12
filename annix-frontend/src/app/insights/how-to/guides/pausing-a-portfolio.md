---
title: Pausing a portfolio for testing
slug: pausing-a-portfolio
category: Auto-execution
roles: [insights]
order: 12
tags: [pause, execution, troubleshooting]
lastUpdated: 2026-05-12
summary: When to pause a portfolio, what pausing does and doesn't do, and the safe pattern for testing engine changes without polluting the trade log.
readingMinutes: 2
relatedPaths:
  - annix-frontend/src/app/insights/paper-portfolios/[slug]
  - annix-backend/src/insights/controllers/insights-paper-portfolios.controller.ts
---

## How to pause

On `/insights/paper-portfolios/{slug}`, click the **Pause** button next to the "Full trade log" link. Confirmation lands as a toast. A yellow banner appears at the top of the page.

Paused portfolios:

- ❌ Get skipped in stage 4 of the daily cron (no buys or sells).
- ✅ Still get snapshotted in stage 5 (line on the value chart stays continuous).
- ✅ Still get the daily decisions preview (the "Today's decisions" card shows what the engine WOULD have done if unpaused).
- ✅ Still receive the R5,000 monthly contribution.

Click **Resume** to lift the pause. The next 06:00 cron picks it back up.

## Benchmarks can't be paused

`benchmark-spy` and `benchmark-jse40` have `riskProfile: buy-and-hold` and don't show a Pause button. Their execution path is `BenchmarkExecutionService`, not the signal-driven `PaperTradeExecutionService`. Pausing wouldn't make sense — the whole point of the benchmarks is to keep deploying cash continuously.

## When you should pause

1. **You spotted a bug in the engine.** Pause all four signal portfolios. Fix the bug. Read the next morning's decisions preview to verify the fix. Resume only when the preview looks clean.
2. **A trade landed that surprises you and you want time to investigate.** Pause that portfolio. The other three keep running so the comparison continues.
3. **You're tweaking allocation rules.** Edit the rules in the seed migration, run the migration, pause the portfolio, watch the decisions preview for a few days, then resume.
4. **Yahoo Finance is broken / a major data error landed.** Pause everything until prices look sane again. Phase 7 will surface "obvious data error" alerts; for now, manual.

## When you should NOT pause

1. **Because a trade made a loss.** That's the test working. Paper-trading exists to learn from losses without paying for them. Don't intervene unless the *engine* is wrong, not just the *outcome*.
2. **For more than 14 trading days at a stretch.** Long pauses create gaps in the dataset that Phase 7 analytics will struggle with. If you genuinely need to pause that long, mark the portfolio inactive (`isActive: false` — a separate field) so it's properly excluded from comparisons.

## What a paused portfolio looks like in logs

```
[InsightsCronService] Signal-portfolio execution:
  signal-conservative: skipped (portfolio paused) |
  signal-balanced: 0b/0s, deployed 0, raised 0 |
  signal-commodity-tilt: 2b/0s, deployed 9842, raised 0 |
  signal-very-high-risk: 1b/0s, deployed 28500, raised 0
```

Paused portfolios show `skipped (portfolio paused)`. Unpaused portfolios show `{buys}b/{sells}s, deployed N, raised N`.

## API for scripted pausing

If you ever want to pause from a script (e.g. CI job that detects a data anomaly):

```
POST /insights/paper-portfolios/signal-conservative/pause
POST /insights/paper-portfolios/signal-conservative/resume
```

Both require the insights role. Returns the updated `PaperPortfolioSummary` with `isPaused` reflecting the new state.
