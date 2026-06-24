---
name: annix-regression
description: Run the annix-regression subagent to trace the blast radius of a change across Orbit/Admin/Pulse/Forge/Sentinel/Stock Control/RFQ/AU Rubber, shared backend, auth/RBAC, Mongo models, uploads, AI services, billing and dashboards — and list what could quietly break, the required tests and safe-release conditions. Pass the change/area as arguments, e.g. "/annix-regression the shared auth token-store change".
---

# Run the Annix Regression Impact analysis

Launch the **annix-regression** subagent via the Agent tool (`subagent_type: "annix-regression"`).

1. The target change/area is in the skill arguments. If none was given, default to "the code changed on the current branch vs origin/main, focused on shared files", and say so up front.
2. Build the agent prompt to include:
   - The exact change/area whose impact to trace.
   - A request for its 6-section output (files/areas touched → possible regressions → high-risk shared logic → required tests → safe release conditions → final verdict).
   - A reminder to follow imports/usages of every changed shared file and to consider existing Mongo documents that won't have any new shape.
3. This agent is **read-only** — it maps impact; it hands actual test-writing to annix-qa.
4. Run it before merging any shared-code change.
5. When it returns, relay its verdict, then offer to delegate the required tests to annix-qa. Do not push unless the user says the literal word "push".
