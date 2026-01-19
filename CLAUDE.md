# Claude Code Preferences

## Code Style
- **No comments in code**: Use self-documenting method names instead of inline comments
- **Follow project lint/prettier**: Obey existing eslint and prettier settings (single quotes per .prettierrc)
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

### Error Handling
- **No empty catches**: Never add `catch {}` or `catch (e) {}` blocks without at least one of:
    - Logging a meaningful message through the appropriate logger, or
    - Returning/falling back to a safe default value
- Prefer small, targeted try/catch blocks close to the failing operation
- When logging errors inside browser evaluation (e.g. Puppeteer), capture messages and surface them to the Node logger after evaluation

## Git Commits

### Autonomous Operation Mode
- **Proceed without asking for simple yes/no questions**: The user's answer is always "Yes" for confirmation-type questions
- **Only ask when there are multiple different approaches**: If there are genuinely different outcomes or architectural decisions to choose from, then ask
- **Commits and pushes**: Proceed automatically - do not ask "May I commit?" or "May I push?" - just do it
- **Continue working**: When given a task, complete it fully without stopping to ask for permission to continue

### Commit Process
1. Stage changes with `git add`
2. Create commit with appropriate semantic message
3. Push to remote
4. Report what was done

### Commit Standards
- **Complete features only**: Each commit should represent a complete, logical feature - not intermediate iterations
- **Clean git history**: Avoid cluttering history with iteration commits that don't make sense to others
- **Tests must pass**: Never commit unless all tests pass - commits should take the system from one working state to another
- **Semantic commit messages**: Write comprehensive, detailed semantic commit messages when approved to commit
- **Issue references**: Add issue reference at end of first line: `feat: add navigation (ref #20)`
- **Workflow keywords**: Only use `closes #20`, `fixes #20`, or `resolves #20` when the ticket is actually complete and ready to close by the user
- **No AI attribution**: Do not include AI attribution in commit messages
- **Pre-push hook**: `.githooks/pre-push` automatically builds both apps and runs migrations before push

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
