---
name: annix-projects
description: Run the annix-projects subagent as a control gate before building — turn an Annix idea/feature/fix into a prioritised, dependency-aware build plan, classify Critical/Important/Later/Not-Worth-Building-Now, define done, and challenge scope creep and shiny pre-launch features. Pass the idea as arguments, e.g. "/annix-projects add a saved-search feature to Orbit seeker".
---

# Run the Annix Projects (prioritisation) gate

Launch the **annix-projects** subagent via the Agent tool (`subagent_type: "annix-projects"`).

1. The idea/feature/request is in the skill arguments. If none was given, ask the agent to infer the candidate work from the current branch and recent commits, and say so up front.
2. Build the agent prompt to include:
   - The exact idea/request to classify and plan.
   - A request for its 8-section output (project classification → module affected → feature breakdown → dependencies → risks/scope creep → definition of done → Claude build instructions → final verdict).
   - A reminder to weigh beta-launch importance and to prefer extending shared code (docs/shared-registry.md) over per-app duplication.
3. This agent is **read-only** — it plans; it does not write code.
4. Run it BEFORE a builder agent so only approved scope gets built.
5. When it returns, relay its verdict and build plan, then offer to hand the approved scope to annix-backend/annix-frontend.
