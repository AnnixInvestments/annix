# Claude Code Preferences

## 🚨 Critical Git Rules — read first; these override EVERYTHING below, including Autonomous Operation Mode

1. **NEVER `git push` without an explicit, per-push instruction in the user's current message.** The only things that authorize a push are the user literally asking for one, or the `push` / `luc + push` / `/PBG` shorthand commands (`/PBG` is now equivalent to `push` — the prod deploy gate has been removed, so there is nothing to bypass; a push to `main` deploys prod automatically once the staging smoke-test passes). Do not anticipate, chain, or assume the next step. Pattern-matching on previous flows is not permission — "the last three sessions ended with a push" does not mean this one does.
2. **"Commit" never implies "push".** They are separate actions, each requiring its own explicit instruction. Completing a feature, fixing a bug, resolving a conflict, or finishing a rebase is never, by itself, permission to push.
3. **One push instruction covers exactly one push.** If the pre-push hook fails, fixing the issue, amending, and retrying that same push is still covered. Once the push succeeds (or the user moves on), the authorization is consumed — the next push needs its own instruction.
4. **Autonomous Operation Mode does not extend to git.** "May I commit?" and "may I push?" are never the kind of simple yes/no question whose answer is always yes.
5. **While a commit exists only locally, fold every further fix into it with `git commit --amend`** — one change = one commit, however many iterations it takes. **Once a commit is on `origin/main`, never amend or force-push it**; from that point every change is a new commit.

## Discovery-first protocol (MANDATORY before writing new shared code)

Annix is a monorepo with several apps (Stock Control, AU Rubber, RFQ, Annix Sentinel, FieldFlow, Annix Pulse, Annix Orbit) sharing one backend and a `packages/product-data/` workspace. AI-generated code tends to duplicate patterns per-app rather than reuse shared modules. **This has cost the project an estimated 100–200k lines of unnecessary code** (see issue #175). Every Claude session must follow this protocol to stop the drift.

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

### Nix UI is shared — never define Nix primitives in app folders

The Nix module (AI document extraction + draft review) is heavily shared across apps. Stock Control, RFQ, Annix Sentinel and any future app that consumes Nix all use the same UI primitives. Concretely:

| Nix surface | Canonical home | App pages do |
|---|---|---|
| Backend extraction | `annix-backend/src/nix/` | nothing — use the registered profile pattern (`profiles/`) |
| Per-app extraction profile | `annix-backend/src/<app>/services/<app>-quote-documents-profile.handler.ts` | register an `IExtractionProfileHandler` against `NixExtractionProfileRegistry` |
| Frontend API client | `annix-frontend/src/app/lib/nix/api.ts` | import `nixApi` |
| Frontend query hooks | `annix-frontend/src/app/lib/query/hooks/nix/` | import the hook |
| Frontend chat UI | `annix-frontend/src/app/lib/nix/components/Nix*.tsx` | mount `<NixAssistant />`, `<NixChatPanel />`, etc. |
| Frontend draft review UI | `annix-frontend/src/app/lib/nix/components/draft/` | mount `<NixDraftReview session={...} brand={...} onSessionChanged={...} />` |

**Forbidden** — the pre-push hook rejects these:
- A file with an unambiguously-Nix filename — `SpecificationCard.tsx`, `CodesEditor.tsx`, `CodesCell.tsx`, `CodeChip.tsx`, `ExtractionCard.tsx`, `ExtractionGroup.tsx`, `NixDraftReview.tsx`, `useSpecLookup.ts`, `Nix*.tsx` — **anywhere inside an app folder** (`stock-control/`, `au-rubber/`, `annix-orbit/`, `annix-rep/`, `annix-sentinel/`, `fieldflow/`).
- An app file that defines a `function SpecificationCard(...)` / `function ExtractionCard(...)` / `function ExtractionGroup(...)` / `function NixDraftReview(...)` / `function CodesEditor(...)` etc. inline — even if the filename is different.

(Generic names like `StatCard`, `DetailsBlock`, `ItemRow`, `EditableCell` are intentionally NOT flagged — apps legitimately have their own non-Nix versions of these. But if you're adding one for **Nix data**, it belongs in `lib/nix/components/draft/`.)

**The rule:** if you find yourself reaching for `useState` to manage Nix extraction state inside an app page, stop and extend the shared component instead. App pages are thin shells that mount `<NixDraftReview />` and pass branding + session data; everything else is shared.

**To add a new feature to the Nix draft view (e.g. a new column, a new spec field renderer):**
1. Edit the file in `lib/nix/components/draft/` (e.g. `SpecificationCard.tsx`).
2. Update `docs/shared-registry.md` if a new top-level export was added.
3. Every app picks up the change automatically — Stock Control, RFQ, Annix Sentinel — without any app-page edits.

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
**The #1 production crash pattern in this codebase.** SWC (webpack + Turbopack) miscompiles bracket/member access on the left of `??` / `||` (and inside JSX) into undeclared `_obj_key` temps → `ReferenceError: _<x> is not defined`. Crashes even with `||`, even without `?.`. Swapping `??` → `||` does NOT help.
- **`??` / `||` are only safe on plain identifiers** (local vars / destructured consts). Anything with a `.`, `?.`, or `[...]` on the left — `obj.prop`, `obj?.prop`, `arr[i]`, `readings[num]`, `query.data` — must be **hoisted to a const first**, then reference the bare identifier. This is the only reliable fix.
- **No destructuring defaults in function parameters** (`({ prop = value }) =>` breaks into `_ref`). Destructure from `props` in the body: `function Foo(props: FooProps) { const size = props.size || "md"; }`.
- Worked examples: [`docs/frontend-conventions.md`](docs/frontend-conventions.md#swc-safe-patterns).

### Modal / Popup / Dialog Rendering (Frontend Only)
- **All modals MUST use `createPortal` to render at `document.body`**. App layouts use `overflow-y-auto` scroll containers that break `fixed` positioning for inline modals.
- **Pattern**: `if (!isOpen) return null;` outside the portal, then return `createPortal(<div className="fixed inset-0 z-[9999] ...">…</div>, document.body)`. Use `z-[9999]` and `fixed inset-0` (never `absolute`) for the backdrop.
- For yes/no confirmations and form modals, use the existing components (see Confirmations / Alerts below) — do not write a parallel modal.

### Long-Running Operations (MANDATORY — Frontend + Backend)
**Any user-triggered operation that can take more than ~3 seconds must show progress feedback.** A button stuck in a loading state with no UI is unacceptable.

**Frontend:**
- **Bulk operations**: use `useAdaptiveExtractionProgress` from `@/app/lib/hooks/useAdaptiveExtractionProgress` — orchestrates a per-item loop, drives the centred branded `ExtractionProgressModal`, and adaptively recalibrates per item. Works across all apps. **One-shot / background**: use `useExtractionProgress` directly.
- **EVERY progress popup MUST learn its timing — NEVER hardcode `estimatedDurationMs`.** Repo-wide, all apps. Seed the estimate from the rolling average via `metricsApi.extractionStats(category, operation)` (constant fallback only when there's no history), AND have the backend op record its duration with `ExtractionMetricService.time(category, operation, fn)` so the estimate sharpens every run. `useAdaptiveExtractionProgress` does both for bulk loops; for one-shot/background work fetch the stat yourself. Background popups may also poll for real completion, but the *estimate* still comes from the learned average.
- **Bulk = orchestrate per-item from the frontend** so progress updates after each item, not as one long server-side loop.
- **Error handling**: the `run` callback throws on failure; the hook collects throws into `result.failed`. Limit per-failure toasts to 3.

**Backend:**
- **All long-running operations must record duration via `ExtractionMetricService.time()` from `MetricsModule`** — this sharpens the frontend's adaptive progress over time. Stats: `GET /metrics/extraction-stats?category=...&operation=...` → `{ averageMs, sampleSize }` over a 50-row rolling window with 10% top/bottom trim.
- Worked examples (`runBulk`, `ExtractionMetricService.time`): [`docs/frontend-conventions.md`](docs/frontend-conventions.md#long-running-operations).

**Enforcement — applies to EVERY session, EVERY app, retroactively (MANDATORY):**
- This rule is not just for new code. Any document **extraction / AI-analyze / re-extract / reanalyze**, or **certificate/PDF generation + sending** action that exists *anywhere* in any app and runs with only a button spinner (no popup) is a bug to be fixed — past, present, or future. Do not assume existing buttons already comply; many predate this directive. (Sending a *generated document* counts; sending a chat message / verification email does not.)
- **Whenever you touch a page/modal that has an extract / analyze / re-extract / reanalyze / generate / send-document action, actively verify it shows the `ExtractionProgressModal`** (or a bespoke step-progress popup) and wire it in if not. Treat a missing progress popup as in-scope for your change even if it wasn't the original ask.
- **Audit tool**: run `node scripts/audit-extraction-progress.mjs` to list extraction/analyze call-sites with no nearby progress feedback across the whole frontend (pass file paths to scan a subset). It also runs **non-blocking on every commit** over staged `.tsx` files and prints any offenders — when you see that warning, fix the listed call-sites before moving on. The known backlog at the time of writing lives in `admin/`, `drawings/`, and `stock-control/` invoice/quality pages; chip away at these whenever you're in those files.

### Confirmations / Alerts (Frontend Only — MANDATORY)
**Never use `window.confirm()`, `window.alert()`, or `window.prompt()`.** They trigger the unbranded native dialog and block the main thread.

- **Yes/no confirmations**: use the `useConfirm` hook from `@/app/au-rubber/hooks/useConfirm` (or `@/app/lib/hooks/useConfirm` from non-AU-Rubber pages). Returns `{ confirm, ConfirmDialog }`; `confirm(options)` returns `Promise<boolean>` — drop-in for `window.confirm()`. Render `{ConfirmDialog}` once near the page root. `variant`: `"danger" | "warning" | "info" | "default"`. Example: [`docs/frontend-conventions.md`](docs/frontend-conventions.md#confirmations--useconfirm).
- **Form-style modals**: use `FormModal` from `@/app/components/modals/FormModal`.
- **Toasts**: use `useToast` from `@/app/components/Toast` — never `alert()`.
- **Underlying component**: `ConfirmModal` at `@/app/components/modals/ConfirmModal` is centred via `createPortal(document.body)`, `z-[9999]`, blurred backdrop, branded, Escape-handled. Do not write a parallel implementation — extend `ConfirmModal` if you need new variants.

### Date/Time Handling
- **Always use Luxon via the datetime module**: never use native `Date`, `Date.now()`, or `Date.parse()`
- **Frontend**: import from `@/app/lib/datetime`. **Backend**: import from `../lib/datetime`. Never import directly from `'luxon'`.
- Default zone is Africa/Johannesburg.
- Common: `now()`, `nowISO()`, `nowMillis()`, `fromISO(s)`, `fromJSDate(d)`, `now().toJSDate()` for TypeORM Date fields, `formatDateZA()`, `formatDateLongZA()`.
- ESLint enforces — native `Date` triggers errors.

### Date Inputs (Frontend — MANDATORY, DRY)
- **Every date field uses the shared `DateInput`** from `@/app/components/ui/DateInput` — a native date control that carries the browser's **calendar-picker icon** with consistent branded styling. Never ship a bare `<input type="date">` (inconsistent styling) or a free-text box for a date.
- Value in/out is a `yyyy-MM-dd` string (empty when cleared); it coerces ISO dates, bare years, and unparseable AI-extracted strings via `@/app/lib/datetime`. Props: `value`, `onChange(value)`, optional `min`/`max`/`disabled`/`required`/`ariaLabel`/`id`/`className`.
- **Migrate-on-touch**: when you edit a surface that has an existing `<input type="date">` or a text box used for a date, switch it to `DateInput`. New date fields use it from day one.

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

### User-Facing Error UI (Frontend Only — MANDATORY)
**End users must NEVER see raw `error.message`, `error.stack`, or any other internal exception detail.** Real customers don't know what `ReferenceError: useState is not defined` means and the only thing they take away is "this app is broken". Every React error boundary, every `error.tsx`, every fallback UI must use the shared branded screen.

- **Use `BrandedErrorScreen`** from `@/app/components/BrandedErrorScreen` for every per-route `error.tsx` and every `<ErrorBoundary>` fallback. It renders a friendly headline, a short explanation, a stable **support code** the user can quote when reporting, and a "Try again" / "Back" button pair. Stack traces are gated behind `process.env.NODE_ENV !== "production"` and collapsed by default.
- **Use `AppUpdateNotice`** from `@/app/components/AppUpdateNotice` for the chunk-load-error branch (always means a stale tab against a new build).
- **Global last-resort**: `app/global-error.tsx` uses inline styles (it renders the html shell) but follows the same rules — friendly copy + support code, no raw error.
- **Never** add `{error.message}` or `<pre>{error.stack}</pre>` to a user-facing page. ESLint will flag it (rule planned). If you genuinely need to inspect the error in dev, the `Show technical details (dev only)` disclosure inside `BrandedErrorScreen` is the only acceptable place — don't reinvent it.
- **Toast / inline error messages from API failures**: surface the server-provided friendly message (the `error` field on the JSON body, when `parseErrorBody: true` in `nixRequest` / equivalent), NOT the raw `Error.message` produced from `response.statusText`. If the server didn't send a friendly message, show "Something went wrong — please try again." plus the support code on the underlying error if possible.
- **Backend exception → frontend display rule of thumb**: the user should always see *what* failed (plain English), never *how* it failed (function names, stack frames, library internals).

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
- `corpId.ts` legal/contact details must not be string literals — see Branding below for brand assets.

### Branding (Dynamic — per-app, MANDATORY)
**All branding must come from the per-app branding system — NEVER hardcode brand assets.** Logos, wordmarks, icons, favicons, watermarks, brand/navbar colours, gradients and accents are configured per app on the branding page (`/admin/portal/branding/:app`) and are the single source of truth. Do NOT hardcode app logos, names, hex colours, or Tailwind brand-colour classes in components, constants, or config.
- **Frontend**: `useBranding(appKey)` from `@/app/lib/query/hooks` returns the live `Branding`. Resolve images with `resolveBrandAssetUrl(slot, branding)` (slots: `logoIcon`, `logoLockup`, `wordmark`, `favicon`, `watermark`, `textCrop`) — it serves the admin-uploaded asset, falling back to the registered per-brand default in `BRAND_ASSET_DEFAULTS`. Apply colours via `brandingCssVars(branding)` / the `BrandingProvider` CSS vars (`--brand-navbar`, `--brand-accent`, …), never literal hex or Tailwind brand classes. Helpers: `brandHasAsset()`, `brandingFallback()`.
- **Backend**: the `AppBranding` system; public read at `GET /api/public/branding/:brand` (`fetchPublicBranding`), admin CRUD via `adminApiClient.appBranding` / `updateAppBranding`.
- **`corpId.ts` is legacy** for brand assets — do not add new hardcoded brand assets/colours there.
- **Migrate-on-touch**: existing hardcoded brand styling (e.g. per-brand colour/logo maps like `ExtractionProgressModalView`'s `BRAND_STYLES`) must be moved onto `useBranding` / `resolveBrandAssetUrl` whenever you edit that surface. New surfaces must be dynamic from day one.

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
- **Exception — git:** this mode never applies to `git commit` or `git push`. Those follow the Critical Git Rules at the top of this file, which require explicit per-action instruction.

### Branching
- **No pull requests**: commit directly to `main`.
- **No feature branches** unless explicitly requested for worktree-based parallel work.
- **Worktrees** — cherry-pick **every commit** to `main` immediately, not at the end of the session:
    1. After `git commit` lands on the worktree branch, run `git -C <main-checkout> cherry-pick <sha>` straight away.
    2. The dev swarm runs against `main`, so an un-cherry-picked commit means the swarm is serving stale code and any "test on localhost" the user does will silently miss your change.
    3. Cherry-pick **per commit**, not at end-of-session — the user must be able to test work-in-progress without waiting for a batch sync.
    4. If a cherry-pick conflicts (parallel session touched the same file), resolve it before the next commit so you never have a backlog of un-synced commits.
    5. At end-of-session, the worktree branch is fully reflected on `main`, so cleanup is just `git worktree remove`.
    6. **Cherry-picking to `main` IS this session's handoff — treat the work as landed, not "pending".** Pushing `main` is owned by a separate session/process, never this one. Once a commit is cherry-picked, do not describe it as "not pushed", "pending deploy", or ask the user when to deploy — from this session's perspective the work is complete. (This is messaging only; the Critical Git Rules still forbid this session from pushing without an explicit instruction.)
- **Never use `EnterWorktree` in `@annix/claude-swarm` worktrees**: if branch starts with `claude/`, work directly on the current branch — `@annix/claude-swarm` manages the worktree lifecycle, nesting puts commits on the wrong branch.

### Commit Discipline — defer to push, ONE commit (hard rule)
**Do NOT commit while iterating.** Make changes and verify them (type-check, logs), but do not run `git commit` until the user asks to push. A commit must take the system from one fully working state to the next — never an intermediate step.
- When the user asks to push, create **exactly one** commit for the whole change.
- If a work-in-progress change needs fixes before it ships (lint, version bump, pre-push hook complaints, conflict/rebase resolution), fold them into that single commit with `git commit --amend` — never a follow-up commit.
- If several commits already exist for one piece of work, **squash them into one** before pushing.
- A trail of small commits on `main` is the thing to avoid. One change = one commit = one push.

### Commit Process
1. **Run Biome before staging**: `npx biome check --write --unsafe` on all files about to be committed. The pre-push hook rejects unformatted files.
2. Stage with `git add` (specific files; don't blanket-add).
3. Show `git status` to the user.
4. Propose a commit message.
5. **ASK**: "May I commit with this message?" — wait for explicit "yes".
6. **NEVER auto-push** — "commit and push" means both; "commit" means commit only. After resolving merge conflicts, rebasing, or amending, do NOT push without instruction. (See Critical Git Rules at the top of this file — they take precedence over every other instruction in this document.)
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

### Database / Persistence — MongoDB is the system of record (READ FIRST)
- **Annix runs on MongoDB (Atlas), NOT PostgreSQL.** Production (`annix_production`), staging (`annix_staging`) and test (`annix_test`) all run the Mongo driver. The PostgreSQL / Neon era is over — Neon is retired (production cutover 2026-05-28). When in doubt, the database is Mongo. Do not assume Postgres semantics.
- **Postgres/TypeORM has been fully removed from the codebase (June 2026, issue #369).** There is no dual-driver abstraction, no `DATABASE_DRIVER` env var, no TypeORM entities/repositories/migrations, and the `typeorm`/`@nestjs/typeorm`/`pg` packages are gone. Mongo is the only driver. Entity classes (`*.entity.ts`) are now plain domain-type classes (no decorators); Mongoose schemas (`*.schema.ts`) define persistence.
- **Write data access through the repository abstraction** (`CrudRepository` + per-entity Mongo impls; transactions via `TransactionRunner` + `repo.withTransaction(ctx)`) — heavy reads route through `findPage(...)` so limit/index/`allowDiskUse` policy lives in one place. Mongoose does NOT ignore `undefined` query fields: `findOne({ x: undefined })` returns `null` on Mongo, so never pass undefined query params.
- Performance rules: no unbounded loads, paginate, cache static reference data (Atlas connection/bandwidth limits are real).
- **The connection runs `autoCreate: false` and `autoIndex: false`** (`src/lib/persistence/mongo-connection.module.ts`). Collections are created on first write, never pre-created on boot; indexes are **not** built automatically. So adding an index, backfilling data, or any structural change goes through a Mongo migration (below) — never rely on Mongoose to build an index for you.
- **The Atlas clusters are M0 free tier with a hard 500-collection cap, and we are staying on M0 — do not propose upgrading.** Each `@Schema` / `SchemaFactory.createForClass` class is one collection (~443 today, 57 of headroom). Two things keep us under the cap: the deploy `release_command` sweeps empty (index-free) collections before migrations run, and a nightly cron (`maintenance:drop-empty-collections`) does the same in steady state — both via `cleanupEmptyCollections` in `src/lib/persistence/empty-collection-cleanup.ts`. **New collections are tracked by a pre-push hook** (`scripts/check-collection-budget.sh`): it reports any newly-added `SchemaFactory.createForClass` and the headroom against 500, but only **blocks once the defined count is approaching the cap** (`>= 480`) — below that, new collections pass freely. In the approaching-the-cap zone, first ask whether the data should be an embedded sub-document on an existing schema (counters, config, single-row settings usually should); if a new collection is genuinely right, record it with an `Allow-New-Collection: <reason>` trailer on a pushed commit (or `ALLOW_NEW_COLLECTIONS=1 git push` for a one-off).

### Mongo Migrations (migrate-mongo — the live framework)
- **Mongo migrations are real and run on every deploy.** Forward-only, via `migrate-mongo`, as **TypeScript** (`export const up`/`down`, `db` typed as `mongo.Db` from `mongoose`), run through `ts-node`, tracked in the `_migrations` changelog collection. The repo is TypeScript-only — never add `.js` migrations.
- **TWO migration dirs — route to the right cluster (Annix Orbit runs on its own MongoDB cluster):**
    - `annix-backend/migrations-mongo/` → **core ERP cluster** (`MONGODB_URI` / `MONGO_DATABASE`). Config: `annix-backend/migrate-mongo-config.ts`.
    - `annix-backend/migrations-mongo-orbit/` → **Orbit cluster** (`ORBIT_MONGODB_URI` / `ORBIT_MONGO_DATABASE`).
    - **A migration that touches Orbit collections** (`cv_assistant_*`, `orbit_*`, `tier_invite(s)`, `seeker_usage_counter(s)`) **MUST live in `migrations-mongo-orbit/`.** In the core dir it runs against the wrong DB on deploy — at best a no-op, at worst it mutates the core production ERP database.
    - **Guardrail:** `scripts/check-migration-routing.ts` (pure Node, cross-platform) scans the core dir and **fails the pre-push hook + CI deploy** if a core migration references an Orbit collection. Fix = `git mv` the file into `migrations-mongo-orbit/`. Run standalone: `node scripts/check-migration-routing.ts`.
- **Production is the baseline.** The legacy TypeORM Postgres migrations have been deleted (issue #369); there is no `src/migrations/`. The first Mongo migration is the first change to production's current shape.
- **Commands** (from `annix-backend/`) — **core:** `pnpm migrate:status` · `pnpm migrate:create <name>` · `pnpm migrate:up` · `pnpm migrate:down`. **Orbit cluster:** `pnpm migrate:orbit:status` · `pnpm migrate:orbit:create <name>` · `pnpm migrate:orbit:up` · `pnpm migrate:orbit:down` (these target `migrate-mongo-orbit-config.ts` → `migrations-mongo-orbit/`). Use `migrate:orbit:create` for Orbit migrations so the file lands in the right dir from the start. Run `pnpm biome check --write` on a new migration file before committing.
- **Execution:** the `fly.toml` `release_command` runs `migrate-mongo up` once per deploy, before traffic — **for both dirs**, each against its own cluster (core dir → core DB, orbit dir → Orbit DB) for that environment (one `fly.toml` serves prod/staging/test — each reads its own Fly secrets). Keep `up`/`down` idempotent.

### Resource Budget (Mongo Atlas — was Neon, retired 2026-05-28)
- **New `@Cron` jobs default to every 6 hours** (`0 */6 * * *`) unless justified; never 10-/30-min polling. Register in `JOB_METADATA` (`admin-scheduled-jobs.service.ts`) with a matching `defaultCron` (runtime-adjustable via Admin > Scheduled Jobs). Cluster daily jobs at `0 8 * * *` or `0 2 * * *` to share wake-ups.
- **Paginate unbounded collections** (default page size 20); detail endpoints use sub-resource endpoints (`/drawings/:id/versions`), never inline related collections.
- **TanStack Query `refetchInterval` >= 120_000ms** unless justified — use `usePollingInterval()`. ESLint warns.
- **Static reference endpoints** set `Cache-Control: public, max-age=31536000, immutable`.

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
| Annix Pulse | `annix-frontend/src/app/annix-rep/config/annix-rep-version.ts` | `ANNIX_REP_VERSION` | PortalToolbar |
| Annix Orbit | `annix-frontend/src/app/annix-orbit/config/version.ts` | `ANNIX_ORBIT_VERSION` | Portal layout header |
| Teacher Assistant | `annix-frontend/src/app/teacher-assistant/config/version.ts` | `TEACHER_ASSISTANT_VERSION` | Coming-soon page (Portal layout once built) |
| Annix Insights | `annix-frontend/src/app/insights/config/version.ts` | `INSIGHTS_VERSION` | PortalToolbar |
| Marketing Site (annix.co.za) | `annix-frontend/src/app/config/marketing/version.ts` | `MARKETING_VERSION` | Marketing site footer |

## Stock Control How To Guides
When you change any user-facing Stock Control feature (new button, renamed field, new workflow), check `annix-frontend/src/app/stock-control/how-to/guides/*.md` for guides whose `relatedPaths` include the files you touched. Update the guide and bump `lastUpdated`. The pre-commit hook runs `scripts/howto-pre-commit-prompt.ts` and **blocks the commit** whenever a staged file matches any guide's `relatedPaths` — the prompt offers `edit` / `bump` / `skip` / `draft` (`draft` needs `GEMINI_API_KEY`). `skip` requires a one-line reason which is appended to the commit message as a `Howto-Skip:` trailer. To bypass entirely: `HOWTO_HOOK=skip git commit ...` (preferred) or `git commit --no-verify`.

### Automatic How To Creation (MANDATORY)
**Every new user-facing feature MUST include a How To guide in the same commit.** Enhancements to existing features should update the relevant existing guide. Place guides in `annix-frontend/src/app/stock-control/how-to/guides/` with kebab-case filenames; the `relatedPaths` frontmatter array connects the guide to the code for freshness checking — get it right. Frontmatter + section template: [`docs/frontend-conventions.md`](docs/frontend-conventions.md#stock-control-how-to-guide-format).

## Communication
- Be concise and direct.
- Do not use emojis unless requested.

### Shorthand Commands
- **`luc`** — list all unpushed commits. Always `git fetch origin main` first so the diff is against the live remote (stale local refs have caused undercounts), then `git log origin/main..HEAD --oneline`. Count the lines actually shown — never approximate.
- **`push`** — push all changes to main and report pre-push step timings
- **`push to staging`** — run `node scripts/push-experimental.ts`: push the current HEAD to the `pre-main` scratch branch, which deploys ONLY the staging environment (`annix-app-staging`). Production and test are untouched (test serves real Orbit users — it is NOT scratch space) and the work does not reach `main`. Fails with a clear error if a feedback-widget PR holds the `on-staging` claim. See [docs/single-environment-deploys.md](docs/single-environment-deploys.md). This authorizes exactly one push to `pre-main`, never to `main`.
- **`luc + push`** — list unpushed commits, then push immediately without confirmation. (These shorthands are themselves the explicit push instruction the Critical Git Rules require — they are the ONLY forms of standing push permission, and each use authorizes exactly one push.)

## Project Context
This is a piping/fabrication quoting system for industrial suppliers (RFQ, BOQ, weld calculations, ASME/API/NACE compliance). Domain reference, weld math, pricing logic, steel-standards fields, and ASME B16.5 P-T tables live in [`docs/rfq-domain-reference.md`](docs/rfq-domain-reference.md) — read it when working on RFQ/pricing/standards code.
