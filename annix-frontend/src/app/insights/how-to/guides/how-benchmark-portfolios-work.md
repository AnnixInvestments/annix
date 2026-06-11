---
title: How the benchmark portfolios work
slug: how-benchmark-portfolios-work
category: Paper Portfolios
roles: [insights]
order: 7
tags: [paper-portfolios, benchmarks, drawdown, volatility]
lastUpdated: 2026-06-10
summary: What the two benchmark portfolios are testing, how the auto-buy works, and how to read drawdown and volatility.
readingMinutes: 4
relatedPaths:
  - annix-backend/src/insights/services/benchmark-execution.service.ts
  - annix-backend/src/insights/services/portfolio-snapshot.service.ts
---

## Why benchmarks matter

The benchmarks are the **honest yardstick**. The whole point of running four signal-driven portfolios is to see whether they actually beat doing nothing. "Doing nothing" means buy-and-hold an index ETF and re-invest every contribution. That's what `benchmark-spy` and `benchmark-jse40` do.

If after 18 months the signal portfolios haven't beaten the benchmarks, the answer to "is the signal engine adding value?" is **no**. That's the kind of answer that saves you from putting real money in.

## What the auto-buy does

Every morning at 06:00 SAST the daily cron runs three stages in order:

1. **Market-data ingestion** — pulls yesterday's OHLCV bars for every watchlist asset from Yahoo Finance.
2. **Benchmark execution** — for each benchmark portfolio (the ones with `riskProfile: "buy-and-hold"`):
   - Look up the fixed-holding symbol (SPY for `benchmark-spy`, STX40.JO for `benchmark-jse40`).
   - Look up that asset's latest close from `insights_price_history`.
   - `qty = cashBalance / closePrice` rounded down to 6 decimal places — fractional units are allowed, so virtually all available cash deploys every run (a high unit price like the JSE Top 40 proxy no longer strands monthly contributions). Runs are skipped only when cash is below R100.
   - Record a `buy` PaperTrade with full reasoning ("date + price + qty + cash remainder").
   - Decrement cash by the deployed amount.
3. **Snapshot capture** — for every active portfolio (all six):
   - Mark every holding to market (look up the latest close, update `currentPrice` / `marketValue` / `unrealisedGainLoss`).
   - Write a `PaperPortfolioSnapshot` row keyed by `(portfolio_id, today)`. If a row already exists for today (the cron re-ran), the existing one is replaced — the cron is idempotent.

The first time the cron runs after seeding:
- `benchmark-spy` deploys ~R100,000 into SPY at yesterday's close.
- `benchmark-jse40` does the same with STX40.JO.
- Each month on the 1st, R5,000 in fresh cash lands → next 06:00 cron deploys it into more of the benchmark.

After a year you've got ~13 buys per benchmark (1 initial + 12 monthly contributions). Each buy is preserved in the trade log with the reasoning it had at the time.

## How the stats are calculated

### Total return %

`(totalValue − startingCapital) / startingCapital × 100`

Currently doesn't adjust for monthly contributions — this'll look artificially high once a few R5k drips have landed. Phase 7's analytics will replace this with a contribution-adjusted return.

### Max drawdown %

Peak-to-trough over the **last 252 trading days** of snapshots, expressed as a positive percentage:

`((peak − current) / peak) × 100`

Floored at 0 (a portfolio at its all-time high has zero drawdown). Until 252 snapshots exist, it's computed over whatever's there. Less meaningful with <60 days of data.

### Volatility

Population standard deviation of the **last 30 daily returns**, annualised by `× √252`:

`stdev(returns) × √252`

Reported as an annualised percentage. The benchmark-spy portfolio should historically sit around ~18–22%. A figure ≥ 35% suggests something concentrated / leveraged is happening (or the data set is too small — anything under 30 snapshots is noise).

## What you'll see on the page

- **Index card** — value-over-time sparkline (last 30 snapshots), total value, holdings count, current cash, max drawdown, total return.
- **Detail page** — six stats including drawdown + volatility; a full value-over-time chart from every snapshot; the SPY/STX40 holding with marked-to-market P/L; full trade log of every buy + contribution.
- **Trade log** — one `contribution` row per month, one `buy` row per benchmark per cron run that had cash to deploy.

## Why the benchmark values are "wrong" in absolute terms

SPY is priced in USD; STX40.JO is priced in ZAR. The benchmark portfolios are denominated in ZAR. The engine does *not* apply an FX conversion — it deploys cash directly against the listed close price as if 1 unit of cash = 1 unit of price.

For `benchmark-jse40` that's correct (STX40 trades in ZAR). For `benchmark-spy` the absolute ZAR values are fictitious — what's meaningful is the **% change** between snapshots, which is currency-agnostic. The signal portfolios will have the same convention so the comparison stays apples-to-apples.

FX-aware portfolio valuation is a Phase 12 stretch goal under "Currency intelligence." Don't read absolute ZAR values on `benchmark-spy` as anything but a relative measuring stick.
