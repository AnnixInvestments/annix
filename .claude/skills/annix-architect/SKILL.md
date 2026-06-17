---
name: annix-architect
description: Run the annix-architect subagent to review system design — module boundaries, RBAC design, the Mongo/Postgres dual-driver and prod/test cluster split, API standards, scaling and tech-debt. Pass the area or question as arguments, e.g. "/annix-architect our MongoDB job-ingestion storage strategy and cost at 50k/250k/1M jobs".
---

# Run the Annix Architect review

Launch the **annix-architect** subagent via the Agent tool (`subagent_type: "annix-architect"`).

1. The area or design question is in the skill arguments. If none was given, default to "an architecture review of the most relevant subsystem to the current conversation", and state which one you chose.
2. Build the agent prompt to include:
   - The exact area/question to evaluate.
   - A request for a **prioritised report** (Critical / High / Medium / Low). Each finding: the problem, why it bites at scale, recommended fix, rough effort estimate, cited as `path:line`.
   - A reminder to weigh scalability, security/performance impact, maintenance burden, data ownership, separation of concerns, and Mongo/Postgres parity — and to use Mermaid diagrams where they clarify structure.
3. This agent is **read-only** — design recommendations only, no production code.
4. Relay its report, then offer next steps (e.g. delegating chosen changes to annix-backend). Do not push unless the user says the literal word "push".
