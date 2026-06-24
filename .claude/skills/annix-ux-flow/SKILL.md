---
name: annix-ux-flow
description: Run the annix-ux-flow subagent to test a feature as a real user completing a task — flow, clarity, friction, dead-ends, missing empty/loading/error/success/permission states, mobile responsiveness across Seeker/Recruiter/Company/Student/Admin journeys. Pass the flow as arguments, e.g. "/annix-ux-flow the recruiter bulk candidate-enrolment journey".
---

# Run the Annix UX Flow review

Launch the **annix-ux-flow** subagent via the Agent tool (`subagent_type: "annix-ux-flow"`).

1. The target journey is in the skill arguments. If none was given, default to "the user-facing flow changed on the current branch vs origin/main", and say so up front.
2. Build the agent prompt to include:
   - The exact journey and user type(s) to walk.
   - A request for its 6-section output (user journey tested → flow problems → missing states → business logic gaps → required UX fixes → final verdict).
   - A reminder to check house UX rules: createPortal modals, useConfirm/FormModal (no window.confirm/alert), ExtractionProgressModal for long ops, DateInput for dates, TanStack Query for fetching, BrandedErrorScreen for errors, and mobile responsiveness.
3. This agent is **read-only** — it reviews; implementation goes to annix-frontend.
4. When it returns, relay its verdict, then offer to delegate the UX fixes to annix-frontend. Do not push unless the user says the literal word "push".
