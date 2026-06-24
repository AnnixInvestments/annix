---
name: annix-logicgauge
description: Run the annix-logicgauge subagent as a control gate before code — test whether a proposed Annix feature makes logical, commercial and operational sense. Challenges weak assumptions, broken workflows, pricing loopholes, unclear permissions, unfair/non-auditable AI scoring and weak recruiter/company/seeker/student separation. Pass the feature/decision as arguments, e.g. "/annix-logicgauge tiered pricing with per-recruiter candidate caps".
---

# Run the Annix LogicGauge review

Launch the **annix-logicgauge** subagent via the Agent tool (`subagent_type: "annix-logicgauge"`).

1. The feature/decision is in the skill arguments. If none was given, ask the agent to infer the proposed change from the current branch and say so up front.
2. Build the agent prompt to include:
   - The exact feature/decision to pressure-test.
   - A request for its 7-section output (logic being tested → assumptions found → logic failures → business rule gaps → AI decision risks → required logic fixes → final verdict).
   - A reminder to review the thinking (incentives, pricing loopholes, permission clarity, AI explainability/auditability, user-type separation, POPIA), not just the code.
3. This agent is **read-only** — it reviews reasoning; it does not write code.
4. Run it BEFORE build/approval; pair with annix-projects (Projects decides *what* gets built, LogicGauge decides *whether the idea makes sense*).
5. When it returns, relay its verdict and required logic fixes.
