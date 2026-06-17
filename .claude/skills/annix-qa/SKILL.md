---
name: annix-qa
description: Run the annix-qa subagent to find bugs and write tests — functional, regression, user-journey, edge-case and abuse-case coverage, plus coverage-gap analysis for a given flow. Pass the target as arguments, e.g. "/annix-qa the early-access registration and env-gating flow" or "/annix-qa generate a test plan for job ingestion".
---

# Run the Annix QA engineer

Launch the **annix-qa** subagent via the Agent tool (`subagent_type: "annix-qa"`).

1. The target flow/feature is in the skill arguments. If none was given, default to "the code changed on the current branch vs origin/main", and say so.
2. Build the agent prompt to include:
   - The exact target.
   - A request to think as job seeker, recruiter, company admin, compliance officer, sales rep and malicious user; cover functional, edge, abuse and regression cases; pay attention to RBAC/scope boundaries, prod/test isolation and the dual Mongo/Postgres paths.
   - Whether to (a) just report a prioritised test plan + likely bugs (each with severity, `path:line`, repro, expected, actual, suggested fix), or (b) also write tests matching the repo's existing framework and verify with `npx tsc --noEmit`. Default to (a) report-only unless the user asked for tests to be written.
3. Relay the result. Commit only if the user asked; **never** push unless the user says the literal word "push".
