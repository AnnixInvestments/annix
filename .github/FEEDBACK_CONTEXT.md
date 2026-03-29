# Feedback Issue Context for Claude

When handling issues with the `feedback` label, this context applies.

## How Feedback Issues Are Created

Feedback issues are auto-created by `FeedbackGithubService` when users submit feedback through the in-app widget. The issue body contains:
- Submitter details (name, email, user type, app context)
- The page URL where feedback was submitted
- The full feedback text
- Screenshots (auto-captured and manually attached)

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

## Reading Screenshots

Screenshots show the exact state of the page when the user submitted feedback. Look for:
- Error messages or alerts visible on screen
- Misaligned or broken UI elements
- Missing data or incorrect values
- The URL bar showing the current page route

## Consolidated Feedback Issues

Each app has a single persistent GitHub issue that collects all feedback as comments. These issues must NEVER be closed:

| App | Issue |
|-----|-------|
| au-rubber | #154 |
| customer | #156 |
| admin | #157 |
| stock-control | #158 |
| supplier | #159 |
| cv-assistant | #160 |
| annix-rep | #161 |

## Fix Guidelines

1. Read the feedback content and examine any screenshots
2. Identify the relevant page/component from the app context and page URL
3. Find the root cause in the codebase
4. Make a minimal, targeted fix
5. Follow all rules in the root CLAUDE.md
6. Reference the feedback issue in the commit: `fix(app): description (ref #ISSUE)`
7. **NEVER use `Closes`, `Fixes`, or `Resolves` keywords with feedback tracker issues (#154, #156-#161)** — always use `Ref #ISSUE` instead, as these are persistent trackers that must stay open

## Pre-Commit Quality Checks (MANDATORY)

Before committing ANY code, you MUST run these checks and fix all failures:

1. **Biome lint/format** — run `npx biome check --write --unsafe .` to auto-fix, then `npx biome check .` to verify zero errors remain
2. **Backend type-check** — run `cd annix-backend && npx tsc --noEmit`
3. **Frontend type-check** — run `cd annix-frontend && npx tsc --noEmit`
4. **Backend tests** — run `pnpm test:all`

Do NOT commit or push code that fails any of these checks. If biome reports errors after `--write`, manually fix them before committing.

## Code Style Rules (from CLAUDE.md)

These rules MUST be followed in all fixes:

- **No comments in code** — use self-documenting method names
- **No imperative loops** — use `map`, `filter`, `reduce` instead of `for`/`while`
- **No duplicate properties** — never add the same property twice in an object literal or class
- **Use null, not undefined** — for absence of value
- **Use const** — never `let` unless reassignment is unavoidable
- **SWC safety** — never combine `?.` with `??`, use `||` instead
- **No destructuring defaults in function params** — destructure in function body
- **Dates via Luxon only** — import from `@/app/lib/datetime` (frontend) or `../lib/datetime` (backend)
- **Method naming** — never prefix with "get", use meaningful names like `user()`, `queryUsers()`
- **Biome formatting** — double quotes per biome.json
- **No AI attribution** — do not include AI attribution (e.g. "Co-Authored-By: Claude") in commit messages
