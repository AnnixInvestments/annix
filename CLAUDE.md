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

### Error Handling
- **No empty catches**: Never add `catch {}` or `catch (e) {}` blocks without at least one of:
    - Logging a meaningful message through the appropriate logger, or
    - Returning/falling back to a safe default value
- Prefer small, targeted try/catch blocks close to the failing operation
- When logging errors inside browser evaluation (e.g. Puppeteer), capture messages and surface them to the Node logger after evaluation

## Git Commits
- Write comprehensive, detailed semantic commit messages
- Do not include AI attribution
- Pre-push hook in `.githooks/pre-push` automatically builds both apps and runs migrations before push

## Communication
- Be concise and direct
- Do not use emojis unless requested
