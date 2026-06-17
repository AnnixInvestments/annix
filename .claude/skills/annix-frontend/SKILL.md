---
name: annix-frontend
description: Run the annix-frontend subagent to build or review UI — Next.js pages, React components, Tailwind styling, the dark-navy/orange design system, mobile/responsive, dark mode, accessibility and component reuse. Pass the task as arguments, e.g. "/annix-frontend build a responsive seekers filter bar" or "/annix-frontend audit the admin portal for mobile and accessibility issues".
---

# Run the Annix Frontend engineer

Launch the **annix-frontend** subagent via the Agent tool (`subagent_type: "annix-frontend"`).

1. The task is in the skill arguments. If none was given, ask the user to specify the page/component or audit target.
2. Decide build vs review from the wording ("build/add/fix" = build; "audit/review" = report) and tell the agent which mode.
3. Build the agent prompt to include:
   - The exact task.
   - Annix design system: dark navy + orange, professional industrial SaaS; reuse existing components; mobile-first; verify desktop/tablet/mobile/dark-mode/accessibility.
   - The SWC landmine rule: no member/optional/bracket access on the LEFT of `||`/`??` — hoist to a local const.
   - For builds: verify with `npx tsc --noEmit` and pass the pre-commit gauntlet. For reviews: a prioritised report (Critical/High/Medium/Low) of duplication, inconsistency, responsiveness/a11y gaps and dead code, citing `path:line`.
4. Relay the result. Commit only if the user asked; **never** push unless the user says the literal word "push".
