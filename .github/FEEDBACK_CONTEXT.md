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

## Fix Guidelines

1. Read the feedback content and examine any screenshots
2. Identify the relevant page/component from the app context and page URL
3. Find the root cause in the codebase
4. Make a minimal, targeted fix
5. Follow all rules in the root CLAUDE.md
6. Reference the feedback issue in the commit: `fix(app): description (ref #ISSUE)`
