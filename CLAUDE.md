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

### When you add new shared code

Update `docs/shared-registry.md` in the same commit. Reviewers / pre-push hook will reject PRs that add shared code without updating the registry.

## Code Style
- **No comments in code**: Use self-documenting method names instead of inline comments
- **Follow project lint/biome**: Obey existing Biome formatting (double quotes per biome.json) and ESLint custom rules
- **Minimal changes**: Keep patches targeted and scoped to request
- **Follow existing patterns**: Don't introduce new patterns without discussion
- **No imperative loops**: Replace `for`/`while` constructs with declarative array operations (`map`, `reduce`, `filter`, etc.) so that functions remain side-effect free where possible
- **Structured branching**: Prefer explicit `if / else if / else` chains where each branch returns or handles outcomes inline, instead of scattering multiple early returns throughout the method
- **Method naming**: Never prefix methods with "get" - type system conveys that. Use more meaningful terms:
    - ✅ `user()` - returns user
    - ✅ `queryUsers()` - fetches users from database/API
    - ✅ `createUser()` - creates a new user
    - ✅ `defaultContent()` - returns default content
    - ❌ `getUser()` - redundant "get" prefix
    - ❌ `getUserData()` - redundant "get" prefix
- **Use null instead of undefined**: Always use `null` for absence of value, never `undefined`
- **Prefer const over let**: Always use `const` for variable declarations. Only use `let` when reassignment is genuinely unavoidable (e.g. loop counters, accumulator variables in reduce alternatives). Never use `var`.
- **Immutable operations**: Use immutable ES6+ operations and es-toolkit/compat functions instead of mutating arrays/objects as side effects
    - ✅ `const newArray = array.map()`
    - ✅ `const newMap = map.reduce()`
    - ❌ `array.push()` or `map.set()` when avoidable
- **Functional utilities**: Use es-toolkit/compat functions for comparisons and operations rather than direct primitive or object comparisons
    - ✅ `equals()` from es-toolkit/compat
    - ✅ `isEmpty()`, `isArray()`, `isObject()` etc.
    - ❌ Direct `===` for object comparisons

### SWC-Safe Patterns (Frontend Only)
**This is one of the most common sources of production crashes in this codebase. Read carefully before writing any nullish-coalescing expression on the frontend.**

- **NEVER use bracket access (`obj[key]`) or member access (`obj.prop`) directly inside JSX expressions or as the left-hand side of `??` / `||`**: SWC (both webpack and Turbopack) miscompiles these into undeclared `_obj_key` / `_obj_prop` temps, crashing the page with `ReferenceError: _<something> is not defined`. The error happens even with `||`, and even without any `?.`. This is the #1 production crash pattern in this codebase — treat any `obj[key]` or `obj.prop` inside a `.map()` or JSX block as forbidden unless hoisted to a local const first.
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
    - ✅ `const name = user?.name; const display = name || "Anonymous";`
- **`??` / `||` are only safe on plain identifiers** — local variables or destructured consts. Anything with a `.`, `?.`, or `[...]` on the left must be hoisted first.
- **Why this is strict**: we have fixed this exact bug multiple times by swapping `??` → `||`, and the crash came back because `||` doesn't help. The only reliable fix is hoisting the access into a `const`.
- **No destructuring defaults in function parameters**: SWC miscompiles `({ prop = value }) =>` into broken `_ref` references. Destructure from `props` in the function body and use the rules above for defaults.
    - ✅ `function Foo(props: FooProps) { const size = props.size || "md"; }`
    - ❌ `function Foo({ size = "md" }: FooProps) {}`
- **Rule of thumb when authoring**: if you're about to type `??` and the thing to the left is not a bare identifier, stop and write `||` instead (or hoist to a const first). This rule has been broken repeatedly — treat `??` on member access as forbidden by default.

### Modal / Popup / Dialog Rendering (Frontend Only)
- **All modals MUST use `createPortal` to render at `document.body`**: Never render modal overlays inline in the component tree. The app layouts use `overflow-y-auto` scroll containers that break `fixed` positioning for inline modals, causing them to appear off-screen.
- **Import**: `import { createPortal } from "react-dom";`
- **Pattern**:
    ```tsx
    if (!isOpen) return null;
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" role="dialog" aria-modal="true">
        <div className="fixed inset-0 bg-black/10 backdrop-blur-md" onClick={onClose} aria-hidden="true" />
        <div className="relative bg-white rounded-lg shadow-xl ...">
          {/* Modal content */}
        </div>
      </div>,
      document.body,
    );
    ```
- **z-index**: Always use `z-[9999]` for modals to ensure they appear above all other content
- **Backdrop**: Use `fixed inset-0` (never `absolute inset-0`) for the backdrop overlay
- **Early returns**: Keep `if (!isOpen) return null;` outside the portal — only wrap the actual modal JSX

### Long-Running Operations (Frontend Only — MANDATORY)
**Any user-triggered operation that can take more than ~3 seconds must show progress feedback.** A button stuck in a loading state with no UI feedback is unacceptable — the user has no way to tell whether the action is working, frozen, or finished.

- **Use `useExtractionProgress` from `@/app/components/ExtractionProgressModal`** for AI extraction or any other long async operation. It provides a centred branded modal with a progress bar, brand-specific styling (au-rubber, stock-control, etc.), and `showExtraction` / `updateExtraction` / `hideExtraction` methods.
    ```tsx
    const { showExtraction, hideExtraction, updateExtraction } = useExtractionProgress();
    showExtraction({ brand: "au-rubber", label: "Processing 1 of 18…", estimatedDurationMs: 60_000 * 18, itemCount: 18 });
    // for each item:
    updateExtraction({ label: `Processing ${index + 1} of ${total}…` });
    // when done:
    hideExtraction();
    ```
- **Bulk operations must orchestrate per-item from the frontend** so progress can update after each item, not run as a single long-blocking server-side loop. Pattern: backend GET endpoint returns the list of candidate IDs, frontend loops through calling the existing per-item endpoint, updating the progress modal after each.
- **Never hide a long-running operation behind a button label change alone.** "Re-extracting…" with nothing else is the same as no feedback — the user doesn't know how many of how many are done, whether it's stuck, or how long is left.
- **For deterministic-duration operations** (e.g. file upload, PDF generation), set `estimatedDurationMs` accurately so the bar moves at the right rate.

### Confirmations / Alerts (Frontend Only — MANDATORY)
**Never use `window.confirm()`, `window.alert()`, or `window.prompt()` in frontend code.** These trigger the browser's native dialog (left-aligned, anchored to the URL bar, unbranded) and break the app's visual consistency. They also block the JavaScript main thread.

- **For yes/no confirmations** (delete, destructive action, "are you sure"): use the `useConfirm` hook from `@/app/au-rubber/hooks/useConfirm` (or `@/app/lib/hooks/useConfirm` from non-AU-Rubber pages). It returns `{ confirm, ConfirmDialog }`. `confirm(options)` returns a `Promise<boolean>` so it's a drop-in replacement for `window.confirm()`. Render `{ConfirmDialog}` once near the root of your page's JSX.
    ```tsx
    const { confirm, ConfirmDialog } = useConfirm();
    const handleDelete = async () => {
      const confirmed = await confirm({
        title: "Delete this CoC?",
        message: "This cannot be undone.",
        confirmLabel: "Delete",
        cancelLabel: "Cancel",
        variant: "danger",  // "danger" | "warning" | "info" | "default"
      });
      if (!confirmed) return;
      // ... do the destructive thing
    };
    return (
      <div>
        {/* page content */}
        {ConfirmDialog}
      </div>
    );
    ```
- **For form-style modals** (input collection, multi-field): use `FormModal` from `@/app/components/modals/FormModal`.
- **For toasts / non-blocking notifications**: use `useToast` from `@/app/components/Toast` — never `alert()`.
- **Underlying component**: `ConfirmModal` at `@/app/components/modals/ConfirmModal` is already centred via `createPortal(document.body)` with `z-[9999]`, blurred backdrop, branded styling, and Escape-key handling. Do not write a parallel implementation — extend `ConfirmModal` if you need new variants.
- **ESLint should reject `window.confirm` / `window.alert` / `window.prompt` in `annix-frontend/src/app/**/*.tsx`** if a rule isn't already in place; add one if you find a violation.

### Date/Time Handling
- **Always use Luxon via the datetime module**: Never use native `Date`, `Date.now()`, or `Date.parse()`
- **Frontend**: Import from `@/app/lib/datetime`
- **Backend**: Import from `../lib/datetime` (relative to src)
- **Never import directly from 'luxon'**: All Luxon imports must go through the datetime module
- **Default timezone**: Africa/Johannesburg is set as the default zone
- **Common patterns**:
    - `now()` - current DateTime
    - `nowISO()` - current time as ISO string
    - `nowMillis()` - current timestamp in milliseconds
    - `fromISO(string)` - parse ISO date string to DateTime
    - `fromJSDate(date)` - convert JS Date to DateTime
    - `now().toJSDate()` - for TypeORM entity Date fields
    - `formatDateZA()`, `formatDateLongZA()` - localized date formatting
- **ESLint enforces this**: Native Date usage will trigger lint errors

### Data Fetching (TanStack Query)
- **All page-level data fetching must use TanStack Query hooks**: Never use `useEffect` + `useState` + `fetch` in page components
- **Hook location**: `annix-frontend/src/app/lib/query/hooks/{subject}/use{Subject}.ts`
  - Subjects: `admin`, `boq`, `customer`, `drawing`, `rfq`, `supplier`
- **Query key factories**: `annix-frontend/src/app/lib/query/keys/{subject}Keys.ts`
  - Pattern: `{ all: [...], list: (params?) => [...], detail: (id) => [...] }`
- **Barrel exports**: All hooks and types export through `hooks/index.ts` and `keys/index.ts`
  - Pages always import from `@/app/lib/query/hooks` - never from individual hook files
- **Creating new hooks**:
  1. Add query key factory in `keys/{subject}Keys.ts`
  2. Export from `keys/index.ts`
  3. Create hook in `hooks/{subject}/use{Subject}.ts`
  4. Export from `hooks/index.ts`
- **Mutations**: Use `useMutation` with `onSuccess` that calls `queryClient.invalidateQueries`
- **Fetch is the internal transport**: Hooks use `fetch` internally as the `queryFn` - this is expected
- **ESLint enforces this**: Importing `browserBaseUrl`/`getAuthHeaders` in page.tsx files triggers a warning

### AI Provider Policy
- **Gemini only**: All AI extraction, analysis, and chat functions must use Gemini (via `AiChatService`) — never use the Anthropic/Claude API directly
- **Never instantiate `ClaudeChatProvider` directly**: Always inject `AiChatService` which routes through Gemini by default with Claude as fallback only
- **No `"claude"` provider overrides**: Do not pass `"claude"` as the `providerOverride` argument to `AiChatService.chat()` or `streamChat()`
- **Use `chatWithImage()` for vision/PDF tasks**: `AiChatService.chatWithImage()` routes through the same Gemini-first provider selection
- **Environment variable**: `GEMINI_API_KEY` must be set; `ANTHROPIC_API_KEY` is optional fallback only

### Sage Accounting API — DLA Compliance (Developer License Agreement)
All Sage API integration code across ALL Annix apps (Stock Control, AU Rubber, Comply SA, and any future apps) must comply with the Sage Developer License Agreement. **DLA status as of 2026-04-25:** enrolment form + DLA received from Sage on 2026-03-16, NOT yet signed/returned. No sandbox or live API key has been issued — all Sage integration code is currently dormant in production. The rules below apply pre-emptively to anything that touches Sage. Violations once we hold a key can result in revocation and permanent loss of API access. No exceptions.

#### Rate Limits (STRICTLY ENFORCED)
- **100 requests per minute per company** — exceeding this blocks the IP for 1 hour (HTTP 429)
- **Max 1 request per second** recommended spacing
- **2,500 requests per day per company** — not currently enforced but will be, design for it now
- **Heavy API calls must be minimised** — these endpoints degrade Sage infrastructure and excessive use triggers blocking without warning:
  - Detailed Ledger Transaction, Customer/Supplier Ageing, Customer/Supplier Statement, Account Balance, Cash Movement, Item Movement, Outstanding Customer/Supplier Documents, all Transaction Listings, Allocations, Budget, Take On Balance, Trial Balance, Tax Reports
- All Sage API calls MUST go through `sageRateLimiter` from `src/lib/sage-rate-limiter.ts` — never call Sage endpoints directly via `fetch` without rate limiting
- New Sage integrations must use the existing `SageApiService` (Sage One SA) or `SageService` (Sage Cloud) — never create a new direct Sage HTTP client

#### Usage Restrictions
- **Complementary add-on only**: The integration must complement Sage Accounting — never use Sage as a billing engine, mass data storage, or primary database
- **Intended scale**: ~3,000 customers, 3,000 suppliers, 5,000 items, 1,000 customer invoices, 1,000 supplier invoices, 2,000 bank transactions per month
- **No direct database access**: Never circumvent the API to access Sage data directly
- **No data migration to competitors**: Never build functionality that converts/exports Sage user data to a competing accounting product
- **No reverse engineering**: Never reverse engineer, decompile, or copy Sage's UI, operating logic, or database structure

#### Data & Privacy
- **Customer consent required**: Accessing a Sage customer's data requires that customer's explicit consent and must be limited to the purposes they approved
- **Sage credentials in confidence**: API keys, OAuth tokens, and user credentials must be encrypted at rest (already implemented via AES-256-GCM)
- **Sage may monitor**: Sage collects Transaction Data (API usage, frequency, data transmitted) — assume all API calls are logged

#### Branding & IP
- **No Sage Marks without written consent**: Do not use Sage name, logo, or trademarks in the application UI without prior written permission
- **Do not remove proprietary notices**: If Sage API responses include rights notices, preserve them
- **Our application, our responsibility**: Make clear to end users that the integration is Annix's product, not Sage's — Sage has no liability for our application

#### Testing & Distribution
- **Test thoroughly before distribution**: Application must be tested to ensure it does not adversely affect Sage Software functionality
- **Keep up with API versions**: Sage may deprecate API versions — responsibility to migrate to latest

#### Architecture — All Sage Calls Funnel Through Two Services
- `annix-backend/src/sage-export/sage-api.service.ts` — Sage One SA REST client (rate-limited via `sageRateLimiter`)
- `annix-backend/src/comply-sa/comply-integrations/sage/sage.service.ts` — Sage Cloud OAuth client (rate-limited via `sageRateLimiter`)
- `annix-backend/src/lib/sage-rate-limiter.ts` — Shared rate limiter (100/min, 2500/day, 1s spacing per company)
- Adapter services (`rubber-sage-invoice-post`, `rubber-sage-coc-adapter`, `sage-invoice-adapter`, `rubber-sage-contact-sync`) transform data and call the above two services — they do not make direct HTTP calls to Sage
- **Never bypass this architecture** — any new Sage integration must go through the existing services, never direct `fetch` to Sage URLs

### Error Handling
- **No empty catches**: Never add `catch {}` or `catch (e) {}` blocks without at least one of:
    - Logging a meaningful message through the appropriate logger, or
    - Returning/falling back to a safe default value
- Prefer small, targeted try/catch blocks close to the failing operation
- When logging errors inside browser evaluation (e.g. Puppeteer), capture messages and surface them to the Node logger after evaluation

### Legal Risk Prevention (ref #149)
All code changes must avoid introducing content that could create legal exposure for Annix. The pre-push hook runs `scripts/check-legal-risks.sh` automatically, but Claude agents must catch these at authoring time — do not rely on the hook alone.

#### Email addresses in examples, tests, Swagger docs
- **Always use `@example.com`** (RFC 2606 reserved domain, guaranteed safe)
- **Never use `.co.za`, `.com`, `.net`, or any other real TLD** for fake email addresses
- ✅ `procurement@example.com`, `customer@example.com`
- ❌ `procurement@acme-industrial.co.za`, `ops@chemical-plant.co.za`

#### Phone numbers in examples, tests, Swagger docs
- **Use `+27 11 000 xxxx`** (clearly fictitious 000 exchange)
- ❌ `+27 11 555 0123` (555 is not reserved in SA numbering)

#### Company names in examples and test data
- Use clearly generic names: "Example Corp", "Test Company A", "Sample Industries"
- Never use names that could match real South African companies

#### Standards body data (ASME, API, ASTM, ISO, NACE, etc.)
- **Do not add new verbatim data tables** from copyrighted standards without confirming Annix holds a reproduction license
- Referencing standard names and numbers (e.g. "per ASME B16.5") is acceptable
- Adding extracted P-T rating tables, chemical composition limits, tolerance values, or test requirements requires a license
- When in doubt, flag to the user: "This data appears to come from [standard name] — confirm Annix has reproduction rights before adding"
- **Current licence status**: Annix does NOT currently hold reproduction rights for ASME B36.10M, B36.19M, or B16.5. See `MEMORY.md` → `legal_asme_reproduction_rights.md` and GitHub issue #181 for the purchase tracker.
- **Standing exception for issue #176 Phase 6E.1 / 6E.2 (recorded 2026-04-05)**: User explicitly authorized proceeding with the steel/pipe constants → backend API refactor and the ASME B16.5 P-T ratings → backend API refactor *despite* the unlicenced state. Authorization is scoped to (a) consolidating ASME-derived data that is already present in either `annix-frontend/src/app/lib/config/rfq/*` or `annix-backend/src/lib/*` and (b) exposing it via `GET /public/reference/pipe-specs` and related endpoints. The authorization does NOT extend to adding data from these standards that isn't already in the codebase today, or to any other standard. Licence purchase remains required and is tracked in issue #181.

#### External URLs to standards bodies
- Do not hardcode URLs to astm.org, iso.org, asme.org, api.org, awwa.org, nace.org, en-standard.eu, or plasticpipe.org in source files
- If a reference URL is needed, store it in configuration that does not surface in customer-facing output

#### Trademarks
- When referencing third-party product names (e.g. Hardox, KSB), always append "equivalent" or "compatible" — never imply endorsement or affiliation

### Secrets Management
- **Never commit secrets to source control**: No API keys, tokens, or credentials in code or config files
- **No secrets in fly.toml**: Use Fly.io mechanisms instead:
    - Runtime secrets: `fly secrets set KEY=value -a app-name`
    - Build-time secrets: `fly deploy --build-secret KEY=value`
- **Use environment-based secrets**: GitHub Actions secrets or Fly.io secrets only
- **Client-side API keys** (e.g. Google Maps): Still use Fly.io build secrets, not source control

### Company Profile (Dynamic Company Details)
- **Never hardcode Annix company details**: Legal name, registration number, emails, addresses, domains, and director info must not be hardcoded as string literals
- **All company details must come from the company profile API** or be passed as props from a component that fetches it
- **Backend services**: Inject `AdminCompanyProfileService` and call `profile()` instead of using string literals
- **Frontend components**: Use the `useAnnixCompanyProfile()` hook from `@/app/lib/query/hooks`
- **Public/unauthenticated access**: Use `GET /public/company-profile` endpoint
- **`corpId.ts` is only for static branding**: Colors, fonts, logos — not legal/contact details

### Workflow SVG Lines (WorkflowStatus.tsx)
- **Custom step key prefix**: Companies can have steps with a `custom_` prefix (e.g. `custom_reception` instead of `reception`). When querying DOM nodes by `data-bg-step`, always check both `stepKey` and `custom_${stepKey}` variants
- **SVG path rendering**: The main `computePaths` useEffect draws branch lines via `setSvgPaths` state. Adding new overlay lines (like the req-bypass line) should use a **separate SVG element with direct DOM manipulation** (`pathEl.setAttribute("d", ...)`) via its own useEffect — NOT through the main `computePaths` flow. The main flow has timing issues where rapid parent re-renders cancel rAF/setTimeout callbacks before they fire
- **MutationObserver for deferred nodes**: Background step nodes render inside conditionally-positioned branch rows. Use `MutationObserver` + `ResizeObserver` to detect when nodes appear/move, since they may not exist when the effect first runs
- **Key file**: `annix-frontend/src/app/stock-control/components/WorkflowStatus.tsx`

### File Storage Architecture
- **Default storage**: S3 (AWS) - files persist across deployments
- **Local storage**: Deprecated, only for development - files lost on redeploy
- **Storage abstraction**: `IStorageService` interface in `annix-backend/src/storage/`
- **Configuration**: `STORAGE_TYPE=s3` (default) or `STORAGE_TYPE=local`

#### S3 Bucket Structure
All files are stored in a single bucket with area-based prefixes:
```
annix-sync-files/
├── annix-app/           # Core app documents (customers, suppliers, RFQ, drawings)
├── au-rubber/           # AU Rubber documents (CoCs, delivery notes, graphs)
├── fieldflow/           # FieldFlow recordings
├── cv-assistant/        # CV Assistant candidate documents
├── stock-control/       # Stock Control documents (job cards, invoices, signatures)
└── secure-documents/    # Encrypted secure documents
```

#### Storage Service Usage
```typescript
// Inject storage service
constructor(@Inject(STORAGE_SERVICE) private storageService: IStorageService) {}

// Upload with area prefix
const result = await this.storageService.upload(file, `${StorageArea.ANNIX_APP}/customers/${customerId}/documents`);

// Download
const buffer = await this.storageService.download(filePath);

// Generate presigned URL (1 hour default)
const url = await this.storageService.presignedUrl(filePath, 3600);
```

#### Key Files
- `annix-backend/src/storage/storage.interface.ts` - IStorageService interface, StorageArea enum
- `annix-backend/src/storage/s3-storage.service.ts` - S3 implementation
- `annix-backend/src/storage/local-storage.service.ts` - Local filesystem (deprecated)
- `annix-backend/docs/AWS_S3_SETUP_GUIDE.md` - AWS setup instructions
- `annix-backend/scripts/deploy-s3-storage.sh` - Deployment automation

## Build & Dev Servers — NEVER RUN DURING DEVELOPMENT
- **A Claude Swarm orchestrator manages all builds and dev servers during development** — agents must NEVER run build or dev commands while developing
- **NEVER run during development**: `pnpm run build`, `next build`, `pnpm run dev`, `nest start`, `npm run build`, `npm run dev`, `npm run start:dev`, or equivalent
- **NEVER run**: `./run-dev.sh`, `./kill-dev.sh`, or any swarm lifecycle scripts
- Running builds while the dev server is active **corrupts caches** and breaks the app
- The swarm automatically rebuilds on file changes — just edit files and check the logs
- **To verify your changes compiled**: read the swarm logs:
  - Frontend: `logs/frontend.log`
  - Backend: `logs/backend.log`
  - Combined: `logs/annix.log`
- **To check swarm status**: read `.claude-swarm/registry.json`
- **Type checking only** (`npx tsc --noEmit`) is safe — it doesn't interfere with running servers
- **Git hooks** (pre-push) run builds independently and this is expected — do not bypass them

## Git Commits

### Autonomous Operation Mode
- **Proceed without asking for simple yes/no questions**: The user's answer is always "Yes" for confirmation-type questions
- **Only ask when there are multiple different approaches**: If there are genuinely different outcomes or architectural decisions to choose from, then ask

### Branching
- **No pull requests**: This project commits directly to `main`
- **No feature branches**: Unless explicitly requested for worktree-based parallel work
- **Worktrees**: When used, cherry-pick the result onto `main` and clean up the worktree/branch
- **Never use `EnterWorktree` in `@annix/claude-swarm` worktrees**: If `@annix/claude-swarm` has already placed this session in a worktree (branch starts with `claude/`), never use the `EnterWorktree` tool — just work directly on the current branch. `@annix/claude-swarm` manages the worktree lifecycle; creating a nested worktree puts commits on the wrong branch.

### Commit Process
1. **Run Biome before staging**: Always run `npx biome check --write --unsafe` on all files you are about to commit. The pre-push hook runs biome on the full source tree and will reject the push if any committed file doesn't match biome's formatting. Running biome first ensures the committed version is already clean.
2. Stage changes with `git add`
3. Show the user what will be committed (`git status`)
4. Propose a commit message
5. **ASK**: "May I commit with this message?"
6. Wait for explicit "yes" before running `git commit`
7. Only push to remote when user explicitly approves
8. **NEVER auto-push**: After committing, do NOT push unless the user explicitly says "push" in their message. "commit and push" means both; "commit" means commit only. After resolving merge conflicts, rebasing, or amending, do NOT push — wait for user instruction. When in doubt, ask.
9. **Always report push timings**: After every successful push, extract and display the pre-push step timings table from the push output. This should be done automatically without the user asking.

### Commit Standards
- **Complete features only**: Each commit should represent a complete, logical feature - not intermediate iterations
- **Clean git history**: Avoid cluttering history with iteration commits that don't make sense to others
- **Tests must pass**: Never commit unless all tests pass - commits should take the system from one working state to another
- **Semantic commit messages**: Write comprehensive, detailed semantic commit messages when approved to commit
- **Issue references**: Only add `(ref #N)` when the commit **directly fixes feedback reported in that specific GitHub issue**. Do NOT add issue references to unrelated commits — GitHub links every referencing commit to the issue timeline, cluttering it with irrelevant entries. If the user has not mentioned a specific issue number, do not add one.
- **Workflow keywords**: Only use `closes #20`, `fixes #20`, or `resolves #20` when the ticket is actually complete and ready to close by the user
- **No AI attribution**: Do not include AI attribution in commit messages
- **Pre-push hook**: `.githooks/pre-push` automatically builds both apps and runs migrations before push
- **Hook failures**: When a pre-push hook fails (e.g. lint error), fix the issue and amend the existing commit — do not create a new commit

### Scheduled Jobs & Neon Compute Budget
- **Neon free tier limit**: 100 CU-hrs/month. Every cron job wake-up costs ~8 min of compute (cold start + query + 5 min auto-suspend)
- **Default frequency for new cron jobs**: Any new `@Cron` job that touches Neon (reads/writes database) must default to **every 6 hours** (`0 */6 * * *`) unless there is a clear business justification for higher frequency
- **Never default to 10-min or 30-min polling**: These intervals prevent Neon from suspending and blow through the compute budget
- **Register in JOB_METADATA**: Every new `@Cron` job must be added to `JOB_METADATA` in `admin-scheduled-jobs.service.ts` with a `defaultCron` matching the decorator
- **Frequency is adjustable at runtime**: The Admin > Scheduled Jobs page allows frequency changes without code deploys — start conservative and increase only if needed
- **Cluster daily jobs**: If the job only needs to run once a day, schedule it at `0 8 * * *` (morning cluster) or `0 2 * * *` (nightly cluster) to share wake-ups with existing jobs

### Neon Network Transfer Budget
- **Never use `eager: true`** in TypeORM entity decorators — it causes unbounded joins on every query touching that entity. Use explicit `relations: [...]` in service queries, loading only what the caller needs. ESLint enforces this.
- **Paginate unbounded collections**: Detail endpoints must not load related collections inline (allocations, versions, comments, etc.). Create separate paginated sub-resource endpoints (e.g. `/drawings/:id/versions`, `/job-cards/:id/allocations`). Default page size: 20 items.
- **TanStack Query `refetchInterval` must be >= 120_000ms** (2 minutes) unless there is a documented justification. Use the `usePollingInterval()` hook for admin-configurable intervals. ESLint warns on all `refetchInterval` usage.
- **Static/reference data endpoints must set** `Cache-Control: public, max-age=31536000, immutable` to prevent repeated fetches of data that rarely changes.

### Database Schema Changes
- **Never use `synchronize: true`**: All schema changes must go through TypeORM migrations
- **Never modify the database directly**: No manual DDL (CREATE TABLE, ALTER TABLE, etc.) outside of migration files
- **Migration timestamps must respect dependencies**: If migration B references a table created in migration A, then B's timestamp must be higher than A's. Verify this before creating a migration.
- **All DDL must be idempotent**: Use `IF NOT EXISTS` / `IF EXISTS` / `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$` so migrations can safely re-run
- **Test migrations on a fresh database**: Migrations must work when run in strict timestamp order from scratch, not just against an existing schema

## App Versioning
All apps follow the same **semantic versioning** rules (major.minor.patch):
- **Patch** (x.x.+1): Bug fixes, tweaks, formatting, and enhancements/improvements to existing features (e.g. multi-DN linking, inline editing, discount detection are all patches)
- **Minor** (x.+1.0): Entirely NEW features or pages that didn't exist before (e.g. a new "Reports" page, a new module like PosiTector integration) — patch resets to 0
- **Major** (+1.0.0): Major redesigns, breaking UX changes, architectural overhauls — minor and patch reset to 0
- **Overflow rule**: When patch reaches 100, minor increments by 1 and patch resets to 0
- **Reset rule**: Whenever minor increments (for any reason), patch resets to 0
- **When to bump**: After completing any update or feature work on an app, bump the version before committing. Every commit that changes app functionality must include a version bump.
- **Include in commit**: Version bumps should be part of the feature commit, not a separate commit

| App | Version File | Constant | Displayed In |
|-----|-------------|----------|--------------|
| Stock Control | `annix-frontend/src/app/stock-control/config/version.ts` | `STOCK_CONTROL_VERSION` | Toolbar header, Settings > App Info |
| RFQ | `annix-frontend/src/app/lib/config/rfq/version.ts` | `RFQ_VERSION` | PortalToolbar (admin/customer/supplier) |
| AU Rubber | `annix-frontend/src/app/au-rubber/config/version.ts` | `AU_RUBBER_VERSION` | AuHeader |
| FieldFlow/Voice | `annix-frontend/src/app/annix-rep/config/version.ts` | `FIELDFLOW_VERSION` | PortalToolbar |
| Annix Rep | `annix-frontend/src/app/annix-rep/config/annix-rep-version.ts` | `ANNIX_REP_VERSION` | PortalToolbar |
| CV Assistant | `annix-frontend/src/app/cv-assistant/config/version.ts` | `CV_ASSISTANT_VERSION` | Portal layout header |

## Stock Control How To Guides
When you change any user-facing Stock Control feature (new button, renamed field, new workflow, changed flow), check `annix-frontend/src/app/stock-control/how-to/guides/*.md` for guides whose `relatedPaths` include the files you touched. If the guide content is no longer accurate, update it and bump its `lastUpdated` date. The pre-push hook runs `scripts/check-how-to-freshness.mjs` which compares git log against each guide's `lastUpdated` and warns when related paths have moved on without the guide being updated — warnings are non-blocking but should be addressed.

### Automatic How To Creation (MANDATORY)
**Every new user-facing feature MUST include a How To guide in the same commit.** This is not optional — if you add a new page, workflow, button, or feature that a user interacts with, create a guide for it before committing. Enhancements to existing features should update the relevant existing guide instead.

How To guide format:
```markdown
---
title: Feature Name
slug: feature-slug
category: Category (e.g. Quality, Inventory, Workflow)
roles: [roles that can access this feature]
order: N
tags: [searchable, keywords]
lastUpdated: YYYY-MM-DD
summary: One-line description of what the feature does.
readingMinutes: N
relatedPaths: [paths to frontend/backend files this guide covers]
---

## What is / How it works (overview)
## Step-by-step instructions
## Rules or constraints the user should know
## Tips (optional)
```

Place guides in `annix-frontend/src/app/stock-control/how-to/guides/`. Use kebab-case filenames. The `relatedPaths` array is critical — it connects the guide to the code for freshness checking.

## Communication
- Be concise and direct
- Do not use emojis unless requested

### Shorthand Commands
The user may use these shorthand commands instead of full sentences:
- **`luc`** — list all unpushed commits (`git log origin/main..HEAD --oneline`)
- **`push`** — push all changes to main and report pre-push step timings
- **`luc + push`** — list unpushed commits, then push immediately without asking for confirmation

## Project Context

### Domain
This is a piping/fabrication quoting system for industrial suppliers. Key concepts:
- **RFQ (Request for Quote)**: Customer requests containing pipe specifications
- **BOQ (Bill of Quantities)**: Consolidated view of RFQ items for supplier pricing
- **Item Types**: Straight pipes, bends (segmented/smooth), fittings (tees, laterals, reducers)

### Weld Calculations
Weld linear meterage is calculated per item type:
- **Flange welds**: 2 welds per flanged connection (inside + outside) × circumference
- **Butt welds**: Where tangents connect to bends (numberOfTangents × circumference)
- **Mitre welds**: For segmented bends (numberOfSegments - 1) × circumference
- **Tee welds**: Where stubs/branches connect to main pipe (stub circumference)
- **Tack welds**: 8 × 20mm per loose flange

### Pricing Calculations
Fabricated item pricing uses:
- Steel weight × price per kg
- Flange weight × price per kg (by weight, not count)
- Weld linear meters × price per meter
- Labour & extras percentage (typically 3.5%)

### Key Config Files
- `annix-frontend/src/app/lib/config/rfq/pipeEndOptions.ts` - End configurations and weld counts
- `annix-frontend/src/app/lib/config/rfq/flangeWeights.ts` - NB to OD lookup, flange weights by NB
- `annix-frontend/src/app/lib/config/rfq/b16PressureTemperature.ts` - B16.5 P-T ratings and interpolation
- `annix-frontend/src/app/lib/config/rfq/complianceValidation.ts` - PSL2/NACE compliance validation
- `annix-frontend/src/app/lib/config/rfq/pipeTolerances.ts` - ASME B36.10M/B36.19M tolerances

### Steel Pipe Standards Fields

#### API 5L PSL Levels
| Field | PSL1 | PSL2 |
|-------|------|------|
| `pslLevel` | "PSL1" | "PSL2" |
| `cvnTestTemperatureC` | Optional | Required |
| `cvnAverageJoules` | Optional | Required (≥27J typical) |
| `cvnMinimumJoules` | Optional | Required (≥20J typical) |
| `ndtCoveragePct` | Optional | Required (100%) |

**PSL2 vs PSL1 Key Differences:**
- PSL2 requires mandatory CVN (Charpy V-notch) impact testing
- PSL2 requires 100% NDT coverage (vs 10% for PSL1)
- PSL2 has tighter chemistry limits (lower sulfur/phosphorus)
- PSL2 requires full traceability

#### NACE MR0175/ISO 15156 (Sour Service)
| Field | Description | Limit |
|-------|-------------|-------|
| `naceCompliant` | Boolean flag | true/false |
| `h2sZone` | H2S severity zone | 1 (severe), 2 (moderate), 3 (mild) |
| `maxHardnessHrc` | Max hardness | ≤22 HRC for carbon/low-alloy steel |
| `sscTested` | SSC testing performed | Required for Zone 1 |
| `carbonEquivalent` | CE value | ≤0.43 for weldability |

#### Pipe Length Types
| `lengthType` | Label | Range |
|--------------|-------|-------|
| "SRL" | Single Random Length | 4.88m - 6.71m |
| "DRL" | Double Random Length | 10.67m - 12.8m |
| "Custom" | Custom Length | 0 - 24m |

### ASME B16.5 P-T Ratings

#### Material Groups
- **Group 1.x**: Carbon and low-alloy steels (A105, A350 LF2, etc.)
- **Group 2.x**: Austenitic stainless steels (304, 316, 321, 347)
- **Group 3.x**: Chrome-moly steels and duplex (P11, P22, P91, 2205)

#### Pressure Classes
Standard classes: 150, 300, 400, 600, 900, 1500, 2500

#### P-T Rating Interpolation Rules
1. **Exact temperature match**: Use tabulated value directly
2. **Between table values**: Linear interpolation between adjacent points
   ```
   P = P_lower + (P_upper - P_lower) × (T - T_lower) / (T_upper - T_lower)
   ```
3. **Below minimum temperature**: Use rating at minimum table temperature
4. **Above maximum temperature**: Rating = 0 (no rating available)

#### Class Selection Logic
`selectRequiredClass(pressureBar, temperatureC, materialGroup)` returns:
- Minimum pressure class that satisfies the P-T requirement
- Margin percentage above design pressure
- All alternatives with their ratings

### Testing/Certification Fields
| Field | Entity | Type | Description |
|-------|--------|------|-------------|
| `hydrotestPressureMultiplier` | All RFQs | decimal(3,2) | e.g., 1.50 for 1.5× design |
| `hydrotestHoldMin` | All RFQs | int | Hold time in minutes |
| `ndtMethods` | All RFQs | JSON string[] | ["RT", "UT", "MT", "PT", "VT"] |
| `lengthType` | Straight pipe only | varchar(10) | "SRL", "DRL", "Custom" |
