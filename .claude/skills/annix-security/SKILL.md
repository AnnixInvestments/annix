---
name: annix-security
description: Run the annix-security subagent to audit auth, RBAC/scope checks, POPIA/PII handling, IDOR and privilege-escalation, data exposure, rate limiting, uploads and AI endpoints for a given area. Pass the target scope as arguments, e.g. "/annix-security the Orbit early-access registration flow".
---

# Run the Annix Security & POPIA review

Launch the **annix-security** subagent via the Agent tool (`subagent_type: "annix-security"`).

1. The target scope is in the skill arguments. If no scope was given, default to "the code changed on the current branch vs origin/main, focused on auth/RBAC/PII", and say so up front.
2. Build the agent prompt to include:
   - The exact scope to review.
   - A request for a **risk-ranked report** (Critical / High / Medium / Low). Each finding must have: location (`path:line`), a concrete exploit/abuse scenario, the recommended fix, and POPIA/business impact.
   - A reminder to check scope-bypass, IDOR/object-ownership, over-fetching, prod/test data isolation, consent/retention, upload safety and AI-endpoint abuse.
3. This agent is **read-only** — it will not modify code.
4. When it returns, relay its report verbatim-in-substance, then offer to action the top findings (I can delegate fixes to annix-backend/annix-frontend). Do not push unless the user says the literal word "push".
