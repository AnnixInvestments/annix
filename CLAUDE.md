# Claude Code Preferences

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

### Error Handling
- **No empty catches**: Never add `catch {}` or `catch (e) {}` blocks without at least one of:
    - Logging a meaningful message through the appropriate logger, or
    - Returning/falling back to a safe default value
- Prefer small, targeted try/catch blocks close to the failing operation
- When logging errors inside browser evaluation (e.g. Puppeteer), capture messages and surface them to the Node logger after evaluation

### Secrets Management
- **Never commit secrets to source control**: No API keys, tokens, or credentials in code or config files
- **No secrets in fly.toml**: Use Fly.io mechanisms instead:
    - Runtime secrets: `fly secrets set KEY=value -a app-name`
    - Build-time secrets: `fly deploy --build-secret KEY=value`
- **Use environment-based secrets**: GitHub Actions secrets or Fly.io secrets only
- **Client-side API keys** (e.g. Google Maps): Still use Fly.io build secrets, not source control

## Git Commits

### Autonomous Operation Mode
- **Proceed without asking for simple yes/no questions**: The user's answer is always "Yes" for confirmation-type questions
- **Only ask when there are multiple different approaches**: If there are genuinely different outcomes or architectural decisions to choose from, then ask

### Branching
- **No pull requests**: This project commits directly to `main`
- **No feature branches**: Unless explicitly requested for worktree-based parallel work
- **Worktrees**: When used, cherry-pick the result onto `main` and clean up the worktree/branch

### Commit Process
1. Stage changes with `git add`
2. Show the user what will be committed (`git status`)
3. Propose a commit message
4. **ASK**: "May I commit with this message?"
5. Wait for explicit "yes" before running `git commit`
6. Only push to remote when user explicitly approves

### Commit Standards
- **Complete features only**: Each commit should represent a complete, logical feature - not intermediate iterations
- **Clean git history**: Avoid cluttering history with iteration commits that don't make sense to others
- **Tests must pass**: Never commit unless all tests pass - commits should take the system from one working state to another
- **Semantic commit messages**: Write comprehensive, detailed semantic commit messages when approved to commit
- **Issue references**: Add issue reference at end of first line: `feat: add navigation (ref #20)`
- **Workflow keywords**: Only use `closes #20`, `fixes #20`, or `resolves #20` when the ticket is actually complete and ready to close by the user
- **No AI attribution**: Do not include AI attribution in commit messages
- **Pre-push hook**: `.githooks/pre-push` automatically builds both apps and runs migrations before push

### Database Schema Changes
- **Never use `synchronize: true`**: All schema changes must go through TypeORM migrations
- **Never modify the database directly**: No manual DDL (CREATE TABLE, ALTER TABLE, etc.) outside of migration files
- **Migration timestamps must respect dependencies**: If migration B references a table created in migration A, then B's timestamp must be higher than A's. Verify this before creating a migration.
- **All DDL must be idempotent**: Use `IF NOT EXISTS` / `IF EXISTS` / `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$` so migrations can safely re-run
- **Test migrations on a fresh database**: Migrations must work when run in strict timestamp order from scratch, not just against an existing schema

## Communication
- Be concise and direct
- Do not use emojis unless requested

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
