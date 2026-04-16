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
5. Implement the fix if it is contained, safe, and testable in automation
6. Open a PR targeting `main`, include `Ref #<tracker issue>` in the PR body, and comment on the issue with the outcome

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
