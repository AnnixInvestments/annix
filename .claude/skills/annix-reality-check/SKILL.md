---
name: annix-reality-check
description: Run the annix-reality-check subagent to verify that proposed/just-written code is grounded in the real Annix repo before merge — confirm files, imports, exports, NestJS routes, env vars and Mongo schema fields exist; catch invented dependencies, placeholder/TODO-only logic, frontend↔backend contract mismatches and broken shared-module changes. Pass the change/diff/area as arguments, e.g. "/annix-reality-check the new recruiter bulk-enrolment endpoint and its frontend hook".
---

# Run the Annix Code Reality Check (verification)

Launch the **annix-reality-check** subagent via the Agent tool (`subagent_type: "annix-reality-check"`).

1. The target change/area is in the skill arguments. If none was given, default to "the code changed on the current branch vs origin/main", and say so up front.
2. Build the agent prompt to include:
   - The exact change/diff/area to verify.
   - A request for its 5-section output (verified real → possible hallucinations → broken connections → required fixes → final verdict).
   - A reminder that persistence is Mongo-only (no TypeORM/Postgres), AI is Gemini-only, shared code has canonical homes, and to confirm every referenced path/import/route/env-var/schema-field actually exists.
3. The agent may run **verification commands only** (`npx tsc --noEmit`, ripgrep, `git diff`) — it never builds, runs dev servers, or pushes.
4. Run this as a reviewer **after a builder agent**, before merge.
5. When it returns, relay its verdict and findings, then offer to delegate the required fixes. Do not push unless the user says the literal word "push".
