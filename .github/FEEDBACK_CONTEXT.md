# Feedback Issue Context for Claude

When handling issues with the `feedback` label, this context applies.

**Your goal is to fix feedback autonomously when it is safe to do so. If it is not safe or not possible, explain the blocker clearly on the issue.**

## How Feedback Issues Work

Feedback is submitted by users through the in-app widget. Each app has a single persistent GitHub issue that collects all feedback as comments:

| App | Issue |
|-----|-------|
| au-rubber | #154 |
| customer | #156 |
| admin | #157 |
| stock-control | #158 |
| supplier | #159 |
| cv-assistant | #160 |
| annix-rep | #161 |

Each comment contains:
- Submitter details (name, email, user type, app context)
- The page URL where feedback was submitted
- The full feedback text
- Screenshots (auto-captured and manually attached)
- AI classification of the feedback type
- In some cases, an AI judgment that the report is an engineering investigation request rather than a direct bug report

Operational notes for this pipeline live in `.github/FEEDBACK_AUTOMATION_OPS.md`.

## App-to-Code Mapping

| App Context | Frontend Path | Backend Path |
|-------------|--------------|--------------|
| `customer` | `annix-frontend/src/app/customer/` | `annix-backend/src/customer/` |
| `admin` | `annix-frontend/src/app/admin/` | `annix-backend/src/admin/` |
| `stock-control` | `annix-frontend/src/app/stock-control/` | `annix-backend/src/stock-control/` |
| `au-rubber` | `annix-frontend/src/app/au-rubber/` | `annix-backend/src/au-rubber/` |
| `supplier` | `annix-frontend/src/app/supplier/` | `annix-backend/src/supplier/` |
| `cv-assistant` | `annix-frontend/src/app/cv-assistant/` | `annix-backend/src/cv-assistant/` |
| `annix-rep` | `annix-frontend/src/app/annix-rep/` | `annix-backend/src/annix-rep/` |

## Page URL Patterns

The `pageUrl` field in feedback maps to Next.js routes:
- `/stock-control/portal/jobs/123` -> `annix-frontend/src/app/stock-control/portal/jobs/[id]/page.tsx`
- `/admin/portal/rfq/456` -> `annix-frontend/src/app/admin/portal/rfq/[id]/page.tsx`
- `/customer/portal/quotes` -> `annix-frontend/src/app/customer/portal/quotes/page.tsx`

The page URL contains the record ID (e.g. `/supplier-cocs/176` means COC ID 176).

## Reading Screenshots

Screenshots show the exact state of the page when the user submitted feedback. Look for:
- Error messages or alerts visible on screen
- Misaligned or broken UI elements
- Missing data or incorrect values
- The URL bar showing the current page route

## Execution Guidelines

1. Read the feedback content and examine any screenshots
2. Identify the relevant page/component from the app context and page URL
3. Read the component code, tracing the data flow from frontend to backend
4. Identify the root cause — pinpoint exact files and line numbers
5. If the feedback asks whether an implementation is DRY, consistent, reused correctly, or follows the same pattern across modules, treat it as an investigation request and inspect the broader code path before deciding whether a safe change is warranted
6. Implement the fix if it is contained, safe, and testable in automation
7. Open a PR targeting `main`, include `Ref #<tracker issue>` in the PR body, and comment on the issue with the outcome

## Scope Discipline (mandatory)

The PR for a feedback item must contain only the fix for that feedback item. Two specific rules — both came from real production-breaking incidents:

### Do not modify `packages/*/package.json` `exports` fields

The shared workspace packages (`@annix/product-data`, `@annix/feedback-sdk`, `@annix/feedback-web`) have `exports` fields tuned for a dual-target build:

- The frontend (`annix-frontend`) resolves the TypeScript source via Next.js `transpilePackages`
- The backend (`annix-backend`) runs plain Node.js in production and resolves the compiled `dist/*.js` output produced by the `product-data-builder` Docker stage

Changing `default` to point at `.ts` source — for example because Turbopack reports "module not found" during local dev when `dist/` hasn't been built — fixes the frontend symptom but **crashes the production backend on startup with `ERR_MODULE_NOT_FOUND`** (Node cannot load `.ts`). The Fly machine boots, the app process exits 1, healthchecks time out at 5 minutes, the deploy fails. This has happened twice. Do not change these `exports` fields without explicit instruction.

If local dev is broken because `dist/` is missing, the right fix is to run `pnpm --filter @annix/product-data build` once, not to redirect runtime resolution.

### Pre-existing build errors are not in scope

If during the fix you encounter an unrelated build error — a SWC landmine in another file, a missing import elsewhere, a deprecated API in a sibling module — do **not** bundle a fix for it into the feedback PR. Instead:

1. Comment on the tracker issue describing what you found, where, and what would fix it
2. Ask whether it should be a separate PR
3. Continue with only the in-scope fix

A feedback PR with three commits — "fix the actual feedback", "fix this other thing I noticed", "fix that other thing too" — is harder to review, harder to revert if any one piece is wrong, and statistically more likely to introduce a regression than a focused single-purpose PR. The two-PR feedback batch on 2026-04-21 (#223 and #224) was blocked for four days because each had bundled an unrelated `packages/product-data/package.json` change that was correct for the frontend but broke the backend.

## What to Include in Your Issue Comment

If you create a PR, include:
- The PR link
- A concise summary of the fix
- Any follow-up action required after merge

If you cannot automate the fix, be thorough and specific:

- **Exact file paths and line numbers** where the problem originates
- **Code snippets** showing the problematic logic
- **Root cause explanation** — why the current behavior differs from expected
- **Recommended fix** — step-by-step description of what needs to change
- **Related files** that may also need updates (types, imports, tests)
- **Risk assessment** — what could go wrong, related features that could be affected
- **Complexity estimate** — trivial / small / medium / large
