---
name: annix-devops
description: Run the annix-devops subagent to judge whether a change is safe to deploy on Annix's shared Fly.io infra — backend restart/module-isolation impact, env vars/Fly secrets, migrate-mongo migration safety + core-vs-Orbit cluster routing, rollback plan, monitoring, feature flags and staging-vs-prod separation. Pass the change as arguments, e.g. "/annix-devops the new Orbit index migration and seeker-feed change".
---

# Run the Annix Deployment & DevOps review

Launch the **annix-devops** subagent via the Agent tool (`subagent_type: "annix-devops"`).

1. The target change is in the skill arguments. If none was given, default to "the code changed on the current branch vs origin/main, focused on migrations, fly.toml, env/secrets and shared-backend impact", and say so up front.
2. Build the agent prompt to include:
   - The exact change to assess for deploy safety.
   - A request for its 6-section output (deployment risks → environment requirements → migration/database risks → rollback plan → release recommendation → final verdict).
   - A reminder: one fly.toml serves prod/staging/test (test is NOT scratch); migrations run in release_command for both clusters; Orbit collections must live in migrations-mongo-orbit/; secrets via fly secrets, never source.
3. The agent may run **inspection commands only** (read fly.toml/scripts, `git log/diff`, `fly status`, `gh run list`) — it NEVER deploys, migrates or pushes.
4. When it returns, relay its verdict and release recommendation. Do not push or deploy unless the user says the literal word "push".
