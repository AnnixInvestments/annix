---
name: annix-backend
description: Run the annix-backend subagent to implement or review backend work — NestJS routes/controllers, DTO validation, services, auth, background jobs, AI integrations and the dual Mongo/Postgres repository layer. Pass the task as arguments, e.g. "/annix-backend add a rate-limit guard to the public branding endpoints" or "/annix-backend review the job-ingestion service for missing validation".
---

# Run the Annix Backend engineer

Launch the **annix-backend** subagent via the Agent tool (`subagent_type: "annix-backend"`).

1. The task is in the skill arguments. If none was given, ask the user to specify (do not guess a backend change to make).
2. Decide build vs review from the wording ("add/implement/fix" = build; "review/audit" = report) and tell the agent which mode.
3. Build the agent prompt to include:
   - The exact task.
   - For builds: follow the dual-driver repository pattern (entity + mongo schema + Postgres migration when adding fields), thin controllers, DTO validation, least-privilege RBAC, error handling and audit logging; verify with `npx tsc --noEmit`; pass the pre-commit gauntlet (biome + eslint + tsc).
   - For reviews: a prioritised remediation report (Critical/High/Medium/Low) citing `path:line`.
4. Relay the result. Commit only if the user asked; **never** push unless the user says the literal word "push".
