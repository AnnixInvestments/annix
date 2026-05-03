# Claude Code Preferences

## Discovery-first protocol (MANDATORY before writing new shared code)

Annix is a monorepo with several apps (Stock Control, AU Rubber, RFQ, Comply SA, FieldFlow, Annix Rep, CV Assistant) sharing one backend and a `packages/product-data/` workspace. AI-generated code tends to duplicate patterns per-app rather than reuse shared modules. **This has cost the project an estimated 100–200k lines of unnecessary code** (see issue #175). Every Claude session must follow this protocol to stop the drift.

**Before writing any of the following, complete the discovery protocol below — no exceptions, no "I'll check later":**

- A lookup table or constant with 3+ entries
- A React component that isn't trivially app-specific (tables, modals, forms, dropzones, anything you might reasonably call "Base", "Shared", or "Generic")
- A NestJS service, utility, or DTO representing a business concept (Address, Contact, Company, Document, Signature, Currency, Attachment, AuditLog, etc.)
- Email / notification / PDF / file-upload / auth / Sage / RBAC / AI logic
- A TypeScript interface that represents data crossing app boundaries
- Any "utility" or "helper" file

### Discovery protocol (run ALL of these before writing code)

1. **Read `docs/shared-registry.md`** — the canonical index of shared modules. One file, one grep, authoritative.
2. **Grep `packages/product-data/`** for the concept (shared monorepo data)
3. **Grep `annix-backend/src/lib/`** and any `annix-backend/src/<concept>/` standalone modules
4. **Grep `annix-frontend/src/app/components/`** for existing components
5. **Grep `annix-frontend/src/app/lib/`** (datetime, validators, api, auth, query/hooks, query/keys)

If ANY match is found, either **(a)** reuse it as-is, **(b)** extend the existing shared module, or **(c)** explicitly justify in the commit / PR why a parallel implementation is required. "I didn't see it" is not an acceptable justification — the protocol is mandatory.

For complex discovery, invoke the `Explore` subagent with a thorough setting instead of doing the greps manually.

### Canonical homes for new shared code

| Kind | Home | Import path |
|---|---|---|
| Reference data (pipe specs, steel grades, chemistry tables, etc.) | `packages/product-data/<domain>/` | `@annix/product-data/<domain>` |
| Backend utilities (date, encryption, rate limiting) | `annix-backend/src/lib/` | relative |
| Backend services shared across app modules | `annix-backend/src/<concept>/` (standalone NestJS module) | relative / DI |
| Frontend shared components | `annix-frontend/src/app/components/` | `@/app/components/...` |
| Frontend query hooks + keys | `annix-frontend/src/app/lib/query/hooks\|keys/` | `@/app/lib/query/hooks` |
| Frontend utilities (datetime, api, validators, auth) | `annix-frontend/src/app/lib/` | `@/app/lib/...` |

### Forbidden patterns (ESLint + pre-push hook enforce these)

- **Cross-app relative imports** — `import ... from "../../../<other-app>/..."`. Apps must never reach into each other. Move the shared code to a canonical location instead.
- **Copying a constant table with minor tweaks** rather than parameterising the shared one
- **Creating a second utility file** when one already exists at a canonical location
- **App-specific copies of an already-shared concept** (e.g. a new `annix-frontend/src/app/stock-control/lib/datetime.ts` when `@/app/lib/datetime` already exists)

When you add new shared code, update `docs/shared-registry.md` in the same commit. The pre-push hook rejects PRs that add shared code without updating the registry.

## Code Style
- **No comments in code**: use self-documenting method names instead of inline comments
- **Follow project lint/biome**: obey existing Biome formatting (double quotes per biome.json) and ESLint custom rules
- **Minimal changes**: keep patches targeted and scoped to request
- **Follow existing patterns**: don't introduce new patterns without discussion
- **No imperative loops**: replace `for`/`while` with declarative `map` / `reduce` / `filter` where practical
- **Structured branching**: prefer explicit `if / else if / else` chains where each branch returns or handles outcomes inline
- **Method naming**: never prefix methods with "get" — type system conveys that. Use `user()`, `queryUsers()`, `createUser()`, `defaultContent()` — not `getUser()` / `getUserData()`
- **Use `null`, never `undefined`** for absence of value
- **Prefer `const` over `let`**; never use `var`. Only use `let` when reassignment is genuinely unavoidable
- **Immutable operations**: prefer `array.map()` / `map.reduce()` over `array.push()` / `map.set()`
- **Functional utilities**: use es-toolkit/compat (`equals()`, `isEmpty()`, `isArray()`, `isObject()`) rather than direct `===` for object comparisons

### SWC-Safe Patterns (Frontend Only)
**This is the #1 production crash pattern in this codebase. Read carefully before writing any nullish-coalescing expression on the frontend.**

- **NEVER use bracket access (`obj[key]`) or member access (`obj.prop`) directly inside JSX or as the left-hand side of `??` / `||`**: SWC (both webpack and Turbopack) miscompiles these into undeclared `_obj_key` / `_obj_prop` temps, crashing the page with `ReferenceError: _<something> is not defined`. The error happens even with `||`, and even without any `?.`.
    - ❌ `<input value={readings[num] ?? ""} />` → crashes (`_readings_num is not defined`)
    - ❌ `<input value={readings[num] || ""} />` → **also crashes** — swapping `??` for `||` is NOT enough
    - ❌ `{items.map(i => <div>{config[i.key] || "default"}</div>)}` → crashes
    - ❌ `const v = obj?.prop ?? fallback` → crashes (`_obj_prop`)
    - ❌ `const v = arr[i].field ?? fallback` → crashes
    - ✅ Hoist to a local const first, then reference the plain identifier:
      ```tsx
      {READING_ROWS.map((num) => {
        const value = readings[num] || "";
        return <input value={value} />;
      })}
      ```
- **`??` / `||` are only safe on plain identifiers** — local variables or destructured consts. Anything with a `.`, `?.`, or `[...]` on the left must be hoisted first.
- **No destructuring defaults in function parameters**: SWC miscompiles `({ prop = value }) =>` into broken `_ref` references. Destructure from `props` in the function body.
    - ✅ `function Foo(props: FooProps) { const size = props.size || "md"; }`
    - ❌ `function Foo({ size = "md" }: FooProps) {}`
- **Rule of thumb**: if you're about to type `??` and the thing to the left is not a bare identifier, stop and hoist to a const first. We have re-introduced this crash by swapping `??` → `||` — that does NOT help. Hoisting is the only reliable fix.

### Modal / Popup / Dialog Rendering (Frontend Only)
- **All modals MUST use `createPortal` to render at `document.body`**. App layouts use `overflow-y-auto` scroll containers that break `fixed` positioning for inline modals.
- **Pattern**: `if (!isOpen) return null;` outside the portal, then return `createPortal(<div className="fixed inset-0 z-[9999] ...">…</div>, document.body)`. Use `z-[9999]` and `fixed inset-0` (never `absolute`) for the backdrop.
- For yes/no confirmations and form modals, use the existing components (see Confirmations / Alerts below) — do not write a parallel modal.

### Long-Running Operations (MANDATORY — Frontend + Backend)
**Any user-triggered operation that can take more than ~3 seconds must show progress feedback.** A button stuck in a loading state with no UI is unacceptable.

**Frontend:**
- **Bulk operations**: use `useAdaptiveExtractionProgress` from `@/app/lib/hooks/useAdaptiveExtractionProgress`. Orchestrates a per-item loop, drives the centred branded `ExtractionProgressModal`, fetches the persisted average duration up-front, and adaptively recalibrates after each item. Works across all apps (any `ExtractionBrand`).
    ```tsx
    const { runBulk } = useAdaptiveExtractionProgress();
    const result = await runBulk({
      brand: "au-rubber",
      metricCategory: "rubber-coc-extract",
      metricOperation: "COMPOUNDER",
      items: candidateIds,
      itemId: (id) => id,
      itemLabel: (id, i, t) => `Re-extracting CoC ${i + 1} of ${t}…`,
      perItemDelayMs: 500,
      run: async (id) => { /* throw on failure */ },
    });
    ```
- **One-shot long operations**: use `useExtractionProgress` directly.
- **Bulk = orchestrate per-item from the frontend** so progress can update after each item, not as a single long-blocking server-side loop.
- **Error handling**: the `run` callback should throw on failure; the hook collects throws into `result.failed`. Limit per-failure toasts to 3.

**Backend:**
- **All long-running operations must record duration via `ExtractionMetricService.time()` from `MetricsModule`** — this is what makes the frontend's adaptive progress sharper over time.
    ```ts
    return this.extractionMetricService.time(
      "rubber-coc-extract",  // category — must match frontend hook
      cocType,                // operation — sub-classification
      async () => doTheWork(),
      pdfBuffer?.length,      // optional payloadSizeBytes
    );
    ```
- **Stats endpoint**: `GET /metrics/extraction-stats?category=...&operation=...` returns `{ averageMs, sampleSize }` over a 50-row rolling window with 10% top/bottom trim.

### Confirmations / Alerts (Frontend Only — MANDATORY)
**Never use `window.confirm()`, `window.alert()`, or `window.prompt()`.** They trigger the unbranded native dialog and block the main thread.

- **Yes/no confirmations**: use the `useConfirm` hook from `@/app/au-rubber/hooks/useConfirm` (or `@/app/lib/hooks/useConfirm` from non-AU-Rubber pages). Returns `{ confirm, ConfirmDialog }`. `confirm(options)` returns `Promise<boolean>` — drop-in replacement for `window.confirm()`. Render `{ConfirmDialog}` once near the page root.
    ```tsx
    const { confirm, ConfirmDialog } = useConfirm();
    const confirmed = await confirm({
      title: "Delete this CoC?",
      message: "This cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",  // "danger" | "warning" | "info" | "default"
    });
    ```
- **Form-style modals**: use `FormModal` from `@/app/components/modals/FormModal`.
- **Toasts**: use `useToast` from `@/app/components/Toast` — never `alert()`.
- **Underlying component**: `ConfirmModal` at `@/app/components/modals/ConfirmModal` is centred via `createPortal(document.body)`, `z-[9999]`, blurred backdrop, branded, Escape-handled. Do not write a parallel implementation — extend `ConfirmModal` if you need new variants.

### Date/Time Handling
- **Always use Luxon via the datetime module**: never use native `Date`, `Date.now()`, or `Date.parse()`
- **Frontend**: import from `@/app/lib/datetime`. **Backend**: import from `../lib/datetime`. Never import directly from `'luxon'`.
- Default zone is Africa/Johannesburg.
- Common: `now()`, `nowISO()`, `nowMillis()`, `fromISO(s)`, `fromJSDate(d)`, `now().toJSDate()` for TypeORM Date fields, `formatDateZA()`, `formatDateLongZA()`.
- ESLint enforces — native `Date` triggers errors.

### Data Fetching (TanStack Query)
- **All page-level data fetching must use TanStack Query hooks**: never `useEffect` + `useState` + `fetch` in page components.
- **Hook location**: `annix-frontend/src/app/lib/query/hooks/{subject}/use{Subject}.ts`. **Keys**: `keys/{subject}Keys.ts` with shape `{ all, list(params?), detail(id) }`.
- **Barrel exports**: pages always import from `@/app/lib/query/hooks` — never from individual hook files.
- **New hooks**: add key factory → export from `keys/index.ts` → create hook → export from `hooks/index.ts`.
- **Mutations**: `useMutation` with `onSuccess` calling `queryClient.invalidateQueries`.

### AI Provider Policy
- **Gemini only**: all AI extraction, analysis, and chat must use Gemini via `AiChatService` — never call the Anthropic/Claude API directly.
- Never instantiate `ClaudeChatProvider` directly. Never pass `"claude"` as `providerOverride`.
- Use `AiChatService.chatWithImage()` for vision/PDF tasks.
- `GEMINI_API_KEY` required; `ANTHROPIC_API_KEY` is optional fallback only.

### Sage Accounting API Integration
**See [`docs/sage-dla-compliance.md`](docs/sage-dla-compliance.md) for the full Developer License Agreement compliance rules — they are strict and violation-once-keyed can lose API access permanently.**

Quick rules every change must respect:
- All Sage calls go through `sageRateLimiter` (`src/lib/sage-rate-limiter.ts`) — 100 req/min, 2,500/day, 1s spacing per company.
- All Sage calls go through `SageApiService` (Sage One SA) or `SageService` (Sage Cloud) — never `fetch` to a Sage URL directly, never a new HTTP client.
- Adapter services transform data and call those two services; they never call Sage directly.

### Error Handling
- **No empty catches**: never `catch {}` or `catch (e) {}` without (a) a meaningful log via the appropriate logger or (b) a safe fallback value.
- Prefer small, targeted try/catch close to the failing operation.
- For browser evaluation (Puppeteer), capture messages and surface them to the Node logger after evaluation.

### Legal Risk Prevention (ref #149)
The pre-push hook runs `scripts/check-legal-risks.sh`, but catch these at authoring time — do not rely on the hook alone.

- **Email examples / tests / Swagger**: always use `@example.com` (RFC 2606 reserved). Never `.co.za` / `.com` / `.net` for fake emails.
- **Phone numbers**: use `+27 11 000 xxxx` (000 exchange is clearly fictitious). Never `555` (not reserved in SA).
- **Company names in examples**: use generic ("Example Corp", "Test Company A") — never names that could match real SA companies.
- **Standards body data (ASME, API, ASTM, ISO, NACE)**: do not add new verbatim data tables (P-T ratings, chemistry limits, tolerances, test requirements) without confirming reproduction rights. Referencing names/numbers ("per ASME B16.5") is fine. Annix does NOT currently hold reproduction rights for ASME B36.10M, B36.19M, or B16.5 — see `MEMORY.md` → `legal_asme_reproduction_rights.md` and issue #181.
    - **Standing exception (issue #176 Phase 6E.1 / 6E.2, recorded 2026-04-05)**: user authorized refactoring the steel/pipe constants and ASME B16.5 P-T ratings already present in `annix-frontend/src/app/lib/config/rfq/*` or `annix-backend/src/lib/*` to a backend API (`GET /public/reference/pipe-specs` etc.). Does NOT extend to adding new data from these standards or to other standards.
- **External URLs to standards bodies**: do not hardcode astm.org / iso.org / asme.org / api.org / awwa.org / nace.org / en-standard.eu / plasticpipe.org. If needed, store in non-customer-facing config.
- **Trademarks**: when referencing third-party product names (Hardox, KSB), append "equivalent" or "compatible" — never imply endorsement.

### Secrets Management
- **Never commit secrets** to source control — no API keys, tokens, credentials in code or config.
- **No secrets in `fly.toml`**. Use `fly secrets set KEY=value -a app-name` (runtime) or `fly deploy --build-secret KEY=value` (build-time).
- **Use environment-based secrets**: GitHub Actions secrets or Fly.io secrets only.
- Client-side API keys (e.g. Google Maps): Fly.io build secrets, not source control.

### Company Profile (Dynamic Company Details)
- **Never hardcode Annix company details**: legal name, registration number, emails, addresses, domains, director info must not be string literals in code.
- **Backend**: inject `AdminCompanyProfileService` and call `profile()`.
- **Frontend**: use `useAnnixCompanyProfile()` from `@/app/lib/query/hooks`.
- **Public/unauthenticated**: `GET /public/company-profile`.
- `corpId.ts` is for static branding only (colors, fonts, logos) — not legal/contact details.

### File Storage & Workflow SVG
- File storage uses S3 (`STORAGE_TYPE=s3`) via `IStorageService`. Bucket structure, service usage, and the niche `WorkflowStatus.tsx` SVG-rendering notes are in [`docs/storage-architecture.md`](docs/storage-architecture.md).

## Build & Dev Servers — NEVER RUN DURING DEVELOPMENT
- **A Claude Swarm orchestrator manages all builds and dev servers** — agents must NEVER run build or dev commands while developing.
- **NEVER run**: `pnpm run build`, `next build`, `pnpm run dev`, `nest start`, `npm run build`, `npm run dev`, `npm run start:dev`, `./run-dev.sh`, `./kill-dev.sh`.
- Running builds while the dev server is active **corrupts caches**.
- The swarm rebuilds on file changes — just edit files and check the logs:
  - Frontend: `logs/frontend.log` · Backend: `logs/backend.log` · Combined: `logs/annix.log`
- Swarm status: `.claude-swarm/registry.json`.
- **Type-checking only** (`npx tsc --noEmit`) is safe.
- **Pre-push hook** runs builds independently and this is expected — do not bypass.

## Git Commits

### Autonomous Operation Mode
- **Proceed without asking for simple yes/no questions** — answer is always "Yes".
- **Only ask when there are genuinely different approaches** with different outcomes.

### Branching
- **No pull requests**: commit directly to `main`.
- **No feature branches** unless explicitly requested for worktree-based parallel work.
- **Worktrees**: cherry-pick the result onto `main` and clean up.
- **Never use `EnterWorktree` in `@annix/claude-swarm` worktrees**: if branch starts with `claude/`, work directly on the current branch — `@annix/claude-swarm` manages the worktree lifecycle, nesting puts commits on the wrong branch.

### Commit Process
1. **Run Biome before staging**: `npx biome check --write --unsafe` on all files about to be committed. The pre-push hook rejects unformatted files.
2. Stage with `git add` (specific files; don't blanket-add).
3. Show `git status` to the user.
4. Propose a commit message.
5. **ASK**: "May I commit with this message?" — wait for explicit "yes".
6. **NEVER auto-push** — "commit and push" means both; "commit" means commit only. After resolving merge conflicts, rebasing, or amending, do NOT push without instruction.
7. **Always report push timings**: after every successful push, extract and display the pre-push step timings table without being asked.

### Commit Standards
- **Complete features only**: each commit = a complete logical feature, not intermediate iterations.
- **Tests must pass** before committing — commits go from one working state to another.
- **Semantic commit messages** — comprehensive, detailed.
- **Issue references**: only add `(ref #N)` when the commit **directly fixes feedback in that specific issue**. Don't add unrelated refs — GitHub clutters the issue timeline with every referencing commit.
- **Workflow keywords** (`closes #20`, `fixes #20`, `resolves #20`): only when the ticket is actually ready to close.
- **No AI attribution** in commit messages.
- **Pre-push hook**: `.githooks/pre-push` builds both apps and runs migrations.
- **Hook failures**: fix the issue and amend the existing commit — do not create a new commit.

### Scheduled Jobs & Neon Compute Budget
- Neon free tier = 100 CU-hrs/month. Every cron wake-up costs ~8 min compute.
- **Default frequency for new `@Cron` jobs touching Neon = every 6 hours** (`0 */6 * * *`) unless there's clear business justification for higher.
- **Never default to 10-min or 30-min polling** — prevents Neon from suspending and burns the budget.
- **Register in `JOB_METADATA`** in `admin-scheduled-jobs.service.ts` with a `defaultCron` matching the decorator. Frequency is adjustable at runtime via the Admin > Scheduled Jobs page.
- **Cluster daily jobs** at `0 8 * * *` (morning) or `0 2 * * *` (nightly) to share wake-ups.

### Neon Network Transfer Budget
- **Never use `eager: true`** in TypeORM entities — use explicit `relations: [...]` in service queries. ESLint enforces.
- **Paginate unbounded collections**: detail endpoints don't load related collections inline. Use sub-resource endpoints (`/drawings/:id/versions`, etc.). Default page size: 20.
- **TanStack Query `refetchInterval` >= 120_000ms** unless documented justification. Use `usePollingInterval()` for admin-configurable intervals. ESLint warns on all `refetchInterval`.
- **Static reference endpoints** must set `Cache-Control: public, max-age=31536000, immutable`.

### Database Schema Changes
- **Never `synchronize: true`** — all schema changes go through TypeORM migrations.
- **Never modify the database directly** — no manual DDL outside migration files.
- **Migration timestamps must respect dependencies**: if B references a table created in A, B's timestamp > A's.
- **All DDL must be idempotent**: `IF NOT EXISTS` / `IF EXISTS` / `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$`.
- **Test migrations on a fresh database** — they must work in strict timestamp order from scratch.

## App Versioning
All apps follow semantic versioning (major.minor.patch):
- **Patch** (x.x.+1): bug fixes, tweaks, formatting, enhancements to existing features.
- **Minor** (x.+1.0): entirely NEW features or pages — patch resets to 0.
- **Major** (+1.0.0): redesigns, breaking UX, architectural overhauls — minor and patch reset to 0.
- **Overflow**: when patch reaches 100, minor increments and patch resets to 0.
- **When**: bump after completing any update, before committing. Every functional commit must include a version bump as part of the same commit (not separate).

| App | Version File | Constant | Displayed In |
|-----|-------------|----------|--------------|
| Stock Control | `annix-frontend/src/app/stock-control/config/version.ts` | `STOCK_CONTROL_VERSION` | Toolbar header, Settings > App Info |
| RFQ | `annix-frontend/src/app/lib/config/rfq/version.ts` | `RFQ_VERSION` | PortalToolbar (admin/customer/supplier) |
| AU Rubber | `annix-frontend/src/app/au-rubber/config/version.ts` | `AU_RUBBER_VERSION` | AuHeader |
| FieldFlow/Voice | `annix-frontend/src/app/annix-rep/config/version.ts` | `FIELDFLOW_VERSION` | PortalToolbar |
| Annix Rep | `annix-frontend/src/app/annix-rep/config/annix-rep-version.ts` | `ANNIX_REP_VERSION` | PortalToolbar |
| CV Assistant | `annix-frontend/src/app/cv-assistant/config/version.ts` | `CV_ASSISTANT_VERSION` | Portal layout header |

## Stock Control How To Guides
When you change any user-facing Stock Control feature (new button, renamed field, new workflow), check `annix-frontend/src/app/stock-control/how-to/guides/*.md` for guides whose `relatedPaths` include the files you touched. Update the guide and bump `lastUpdated`. The pre-push hook runs `scripts/check-how-to-freshness.mjs` (warns, non-blocking).

### Automatic How To Creation (MANDATORY)
**Every new user-facing feature MUST include a How To guide in the same commit.** Enhancements to existing features should update the relevant existing guide.

Format:
```markdown
---
title: Feature Name
slug: feature-slug
category: Quality | Inventory | Workflow | etc.
roles: [roles that can access this feature]
order: N
tags: [searchable, keywords]
lastUpdated: YYYY-MM-DD
summary: One-line description.
readingMinutes: N
relatedPaths: [paths this guide covers]
---

## What is / How it works
## Step-by-step instructions
## Rules or constraints
## Tips (optional)
```

Place in `annix-frontend/src/app/stock-control/how-to/guides/` with kebab-case filenames. The `relatedPaths` array connects the guide to the code for freshness checking — get it right.

## Communication
- Be concise and direct.
- Do not use emojis unless requested.

### Shorthand Commands
- **`luc`** — list all unpushed commits. Always `git fetch origin main` first so the diff is against the live remote (stale local refs have caused undercounts), then `git log origin/main..HEAD --oneline`. Count the lines actually shown — never approximate.
- **`push`** — push all changes to main and report pre-push step timings
- **`luc + push`** — list unpushed commits, then push immediately without confirmation

## Project Context
This is a piping/fabrication quoting system for industrial suppliers (RFQ, BOQ, weld calculations, ASME/API/NACE compliance). Domain reference, weld math, pricing logic, steel-standards fields, and ASME B16.5 P-T tables live in [`docs/rfq-domain-reference.md`](docs/rfq-domain-reference.md) — read it when working on RFQ/pricing/standards code.
