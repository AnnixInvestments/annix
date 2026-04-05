---
name: discover-shared
description: Run the discovery-first protocol before writing new shared code. Searches the canonical locations (packages/product-data, annix-backend/src/lib, annix-frontend/src/app/components, annix-frontend/src/app/lib) for existing constants, components, services, or utilities that match what the user is about to build. Use proactively when the user asks you to add a lookup table, constant map, shared component, service, DTO, or utility.
---

# Discovery-first protocol

Annix is a monorepo with several apps (Stock Control, AU Rubber, RFQ, Comply SA, FieldFlow, Annix Rep, CV Assistant) that share a backend, a frontend, and a `packages/product-data/` workspace package. Before writing any new shared-ish code, you MUST verify it doesn't already exist.

## When to run this protocol

Run it before writing any of the following:

- A lookup table or constant with 3+ entries
- A React component that isn't trivially app-specific
- A NestJS service, utility, or DTO representing a business concept
- Email / notification / PDF / file-upload / auth / Sage / RBAC / AI logic
- A TypeScript interface representing data that crosses app boundaries

## Steps

1. **Read the registry first.** Open `docs/shared-registry.md` — this is the canonical index of every shared module in the monorepo. If what the user wants is listed there, use it instead of writing new code.

2. **Grep the canonical locations** for keywords from the user's request (entity names, domain terms, constant names):
   - `packages/product-data/` — shared reference data across backend and frontend
   - `annix-backend/src/lib/` — shared backend utilities
   - `annix-backend/src/<concept>/` — standalone NestJS modules (storage, email, ai-chat, notifications, rbac, reference-data, etc.)
   - `annix-frontend/src/app/components/` — shared React components
   - `annix-frontend/src/app/lib/` — shared frontend utilities (datetime, api, auth, validators, query hooks/keys, config)

3. **Also grep app folders** to detect existing per-app copies that should be consolidated:
   - `annix-frontend/src/app/stock-control/`
   - `annix-frontend/src/app/au-rubber/`
   - `annix-frontend/src/app/cv-assistant/`
   - `annix-frontend/src/app/annix-rep/`
   - `annix-frontend/src/app/comply-sa/`
   - `annix-frontend/src/app/fieldflow/`

4. **Report findings to the user** before writing any code:
   - **Exists in canonical location** → use the existing module, do not duplicate
   - **Exists as per-app copy** → propose consolidating into the correct canonical home before adding more copies
   - **Does not exist anywhere** → proceed, and choose the canonical home using the table in `CLAUDE.md` §"Discovery-first protocol"

5. **If you add new shared code**, update `docs/shared-registry.md` in the same commit. The pre-push hook (`scripts/check-inter-app-duplication.sh`) will warn if you don't.

## Canonical homes (cheat sheet)

| What you're writing | Where it goes |
|---|---|
| Reference data used by 2+ apps | `packages/product-data/<domain>/` |
| Backend utility used by 2+ modules | `annix-backend/src/lib/` |
| Backend service used by 2+ modules | `annix-backend/src/<concept>/` (standalone NestJS module) |
| Frontend component used (or potentially used) by 2+ apps | `annix-frontend/src/app/components/` |
| Frontend utility / hook / query key | `annix-frontend/src/app/lib/` |
| Truly app-specific config (navItems, version) | `annix-frontend/src/app/<app>/config/` |

## Forbidden patterns

- Cross-app relative imports (`from "../../../stock-control/..."`) — hard error in the pre-push hook
- Copying a constant table from one app into another with minor tweaks
- Creating `annix-frontend/src/app/<app>/lib/` or `annix-backend/src/<app>/lib/` folders — neither should exist
- Hardcoding values that already live in `packages/product-data/`
