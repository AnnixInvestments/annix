---
title: The three Nix Discovery portfolios
slug: discovery-portfolios
category: Portfolios
roles: [insights]
order: 7
tags: [nix, ai, gemini, paper-portfolio, discovery]
lastUpdated: 2026-05-15
summary: How nix-pure, nix-hybrid, and nix-picker each use Gemini to make trade decisions, what makes them different, and what to look for when comparing their results.
readingMinutes: 5
relatedPaths:
  - annix-backend/src/insights/services/ai-executor.service.ts
  - annix-backend/src/insights/services/paper-trade-execution.service.ts
  - annix-backend/src/insights/entities/paper-portfolio.entity.ts
  - annix-frontend/src/app/insights/paper-portfolios/components/ExecutorBadge.tsx
---

## What these three portfolios are for

The 4 signal-* portfolios trade off a deterministic rules engine. The 2 benchmark-* portfolios just DCA into a fixed ETF. The three Nix Discovery portfolios are the experimental third leg: **what does it look like when Gemini decides the trades?**

All three start at ZAR 100,000, receive ZAR 5,000 monthly contributions, and run on the same 06:00 + 18:00 SAST cron as everyone else. The only thing that differs between them is *how much of the trade decision the LLM owns*.

| Slug | Display | Executor mode | Gemini's job | Rules engine's job |
|---|---|---|---|---|
| `nix-pure` | Nix · Pure | `ai-pure` | Pick symbols AND set quantities AND write reasoning | Nothing |
| `nix-hybrid` | Nix · Hybrid | `ai-override` | Review every rules-engine decision: keep / drop / change qty | Produce the draft list first |
| `nix-picker` | Nix · Picker | `ai-picker` | Pick which symbols are high-conviction today | Size the positions, enforce risk caps |

## How each one actually decides

### Pure mode (`nix-pure`)

1. Gather context: top 20 signals today, recent 48h news, current holdings, cash balance, allocation rules.
2. Send to Gemini. Strict JSON output: `{decisions: [{action, symbol, qty, reasoning}], rationale}`.
3. Validate every decision — buys must be in the top-20 universe, sells must be currently held.
4. Apply transactionally. Buys are dropped if they'd exceed remaining cash.

Every trade row's `appReasoning` is prefixed `[ai-pure]` and contains Gemini's per-decision reasoning plus the overall rationale verbatim.

### Hybrid / override mode (`nix-hybrid`)

1. Rules engine produces the draft list of buys and sells (the *same* list `signal-balanced` would generate today).
2. Send the draft to Gemini for review along with the full context.
3. Gemini outputs one verdict per draft index: `keep`, `drop`, or `replace-qty` (with a new quantity).
4. Apply the surviving decisions transactionally.

Each kept/modified trade has reasoning that stacks all three voices:
`[ai-override · keep] <Gemini's verdict reasoning> | overall: <Gemini's rationale> | original: <rules engine reasoning>`.

A missing verdict for a draft index defaults to `keep` (defensive — Gemini might forget to address a row).

### Picker mode (`nix-picker`)

1. Gather context.
2. Ask Gemini: "Pick the high-conviction symbols from this universe today, up to `maxPositions`." Strict JSON: `{picks: [SYMBOLS], rationale}`.
3. Rules engine produces its full draft.
4. Filter: keep ALL sells (risk decisions ignore Gemini's opinion), keep buys only if symbol is in the pick set.
5. Apply transactionally.

Each surviving trade reasoning is prefixed `[ai-picker · picked]` or `[ai-picker · sell-pass-through]`.

## What to look for when comparing them

The whole point of running three different architectures in parallel is to find out *where Gemini adds value vs. just adds noise*. Watch for:

- **Pure vs. Hybrid divergence**: if `nix-pure` consistently underperforms `nix-hybrid`, the rules-engine draft is doing more work than Gemini's freeform discovery — i.e. Gemini's idea generation is weaker than the deterministic ranker.
- **Pure vs. Picker divergence**: if `nix-picker` outperforms `nix-pure`, Gemini is good at *idea generation* but bad at *sizing* — letting the rules engine size positions is the right division of labour.
- **Hybrid vs. signal-balanced divergence**: this is the cleanest A/B test. They start from the same draft. Whatever performance gap appears is 100% attributable to Gemini's verdicts.
- **Trade count**: if Gemini is dropping most draft trades and rarely replacing-qty, it's mostly behaving as a brake. If it's modifying often, it's actively shaping the portfolio.
- **Reasoning patterns**: the `appReasoning` column on each trade keeps Gemini's full text. Scan for recurring patterns ("flagged due to commodity volatility…") that hint at how Gemini is thinking.

## Cost and pacing

Each Discovery portfolio makes 1 Gemini call per cron — so 6 calls/day total across the three (3 portfolios × 2 daily crons). At Gemini's free-tier limits this is negligible. The news-ingestion pipeline still dominates the daily LLM volume.

## When *not* to read too much into a result

- 6–18 months is the agreed run length before any conclusions per the issue #287 spec.
- Same-day churn: a 06:00 buy that gets reversed by 18:00 is real on these portfolios and isn't a bug — Gemini saw different inputs in the afternoon. Watch the trade log to confirm.
- A blow-up in one of the three doesn't kill the experiment. It tells you something about that mode's risk profile.

## Tips

- Open each portfolio's trade log to see Gemini's reasoning in full — it's stored verbatim on every trade row.
- The `ExecutorBadge` on the portfolio card colour-codes the mode at a glance: purple = Pure, indigo = Hybrid, fuchsia = Picker.
- All three respect the same `isPaused` toggle as the signal portfolios — pausing one stops its 06:00 / 18:00 execution but leaves the existing holdings in place.
