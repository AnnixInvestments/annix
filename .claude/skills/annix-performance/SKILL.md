---
name: annix-performance
description: Run the annix-performance subagent to review code for speed, scalability and cost — slow/unindexed Mongo queries, unbounded loads, repeated/expensive Gemini calls, upload/S3 bottlenecks, frontend re-renders, large bundles, bad polling, missing caching and rate limiting on Annix's M0 Atlas + shared Fly.io backend. Pass the area as arguments, e.g. "/annix-performance the seeker job-feed query and dashboard".
---

# Run the Annix Performance review

Launch the **annix-performance** subagent via the Agent tool (`subagent_type: "annix-performance"`).

1. The target area is in the skill arguments. If none was given, default to "the code changed on the current branch vs origin/main", and say so up front.
2. Build the agent prompt to include:
   - The exact area to review for performance and cost.
   - A request for its 6-section output (performance risks → database concerns → frontend concerns → AI/API cost concerns → required optimisations → final verdict).
   - A reminder of the constraints: M0 Atlas (no upgrade, `findPage`, indexes via migration), Gemini cost/latency, TanStack `refetchInterval >= 120s`, default page size 20.
3. This agent is **read-only** — it recommends; it does not modify code.
4. Defer whole-system/module-boundary design to annix-architect.
5. When it returns, relay its verdict, then offer to delegate the optimisations. Do not push unless the user says the literal word "push".
