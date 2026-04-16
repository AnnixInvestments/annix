# Agent Guidelines

This document provides guidance for AI code assistants working in this repository.

## CRITICAL RULES - READ FIRST

These rules MUST be followed in EVERY session without exception:

### 1. NO CODE COMMENTS
- **NEVER add comments to code** - use self-documenting method names instead
- This includes `//`, `/* */`, and any explanatory text in code
- Avoid sprinkling comments into the source. Favor self-documenting functions, descriptive names, and clean structure.
- When additional context is needed, update this file (or other prompt infrastructure) instead of writing comments directly in code.

### 2. NO AI ATTRIBUTION IN COMMITS
- **NEVER add AI attribution to commit messages**
- This means NO:
    - `Generated with [Claude Code](https://claude.ai/code)`
    - `Co-Authored-By: Claude <noreply@anthropic.com>`
    - Any similar AI tool attribution lines
- Commits should appear as if written by a human developer

## Deployment

GitHub Actions are active on `AnnixInvestments/annix`.

### Push Flow
1. All development happens on `AnnixInvestments/annix` (origin)
2. The `.githooks/pre-push` hook runs local checks (lint, tests, builds, freshness checks)
3. A push to `main` triggers `.github/workflows/deploy.yml`

### PR Flow
1. Open a PR targeting `main`
2. `.github/workflows/deploy-staging.yml` runs on the PR
3. The PR gets a staging deployment comment when staging succeeds
4. Merge the PR normally in GitHub once staging and required checks pass

### Remotes
- `origin` — `https://github.com/AnnixInvestments/annix.git` (only remote)

### Git Hooks
- Hooks live in `.githooks/` — requires `git config core.hooksPath .githooks`
- The pre-push hook runs local validation only; it does not trigger GitHub workflows directly

### Working with Claude — Two Modes

There are two distinct ways Claude can work on this codebase. We use the terms **`claude local`** and **`claude remote`** to distinguish them.

---

#### `claude local` — Claude Code CLI

Claude runs on your machine. Interactive, conversational, commits directly to `main`.

- **How to start**: Run `claude` in the repo directory, or use the VS Code/Cursor extension
- **How it works**: Claude has full access to your local checkout — reads files, writes code, runs tests, commits
- **Output**: Changes go directly onto `main` (per project convention, no PRs)
- **Best for**: Interactive development, debugging, quick fixes, exploratory work, pair-programming
- **Requires**: Claude Code CLI installed locally (`npm install -g @anthropic-ai/claude-code`)

Example: open Claude Code and say _"implement issue #69"_ — Claude reads the issue, makes changes locally, commits when you approve.

---

#### `claude remote` — Claude Code GitHub Action

Claude runs on GitHub's servers. Autonomous, fire-and-forget, opens a PR for review.

- **Trigger options:**
  - comment `@claude` on an issue or PR
  - run `./scripts/claude-issue 69`
  - run `gh workflow run claude.yml --repo AnnixInvestments/annix -f issue_number=69`
  - use **Run workflow** in the GitHub Actions UI

- **How to trigger (terminal)**:

  | Platform | Command |
  |----------|---------|
  | Mac/Linux | `./scripts/claude-issue 69` |
  | Windows (PowerShell) | `.\scripts\claude-issue.ps1 69` |
  | With custom prompt | `./scripts/claude-issue 69 "Focus on the RFQ page first"` |
  | Direct (any OS) | `gh workflow run claude.yml --repo AnnixInvestments/annix -f issue_number=69` |

- **How to trigger (browser — no terminal needed)**:
  1. Go to [Actions → Claude Code → Run workflow](https://github.com/AnnixInvestments/annix/actions/workflows/claude.yml)
  2. Type the issue number
  3. Click **Run workflow**

- **Output**: A PR for review — does not commit directly to `main`
- **Best for**: Larger features, parallel work, delegating without being at a terminal
- **Monitoring**: Watch progress in the [Actions tab](https://github.com/AnnixInvestments/annix/actions)

---

#### `claude local` vs `claude remote` — when to use which

| Scenario | Mode |
|----------|------|
| Quick fix or small change | `claude local` |
| Pair-programming, iterative back-and-forth | `claude local` |
| Large feature you want to review before merging | `claude remote` |
| Delegating work while you do something else | `claude remote` |
| Multiple issues in parallel | `claude remote` — run several at once |
| No dev environment set up | `claude remote` — just needs a browser |

`workflow_dispatch` remains useful for explicit issue-based runs, but it is not the only trigger path. `@claude` issue and PR comments also work.

## Dev Scripts

Run all commands from the repository root.

### Starting the Apps

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start both backend and frontend concurrently |
| `pnpm dev:backend` | Start backend only (NestJS on port 4001) |
| `pnpm dev:frontend` | Start frontend only (Next.js on port 3000) |

### Building

| Command | Description |
|---------|-------------|
| `pnpm build` | Build both backend and frontend |
| `pnpm build:backend` | Build backend only |
| `pnpm build:frontend` | Build frontend only |

### Testing

| Command | Description |
|---------|-------------|
| `pnpm test:all` | Run backend tests + frontend type-check |
| `pnpm test:backend` | Run backend Jest tests |
| `pnpm test:frontend` | Run frontend type-check |
| `pnpm test:watch` | Run backend tests in watch mode |
| `pnpm test:coverage` | Run backend tests with coverage |

### Database

| Command | Description |
|---------|-------------|
| `cd annix-backend && pnpm migration:run` | Run pending migrations |
| `cd annix-backend && pnpm migration:revert` | Revert last migration |
| `cd annix-backend && pnpm migration:create ./src/migrations/MigrationName` | Create new migration |

### Linting & Formatting

| Command | Description |
|---------|-------------|
| `pnpm format` | Format all files with Biome |
| `pnpm format:check` | Check formatting without fixing |
| `pnpm type-check` | Run TypeScript type-check on frontend |

### API Schema

| Command | Description |
|---------|-------------|
| `cd annix-frontend && pnpm codegen` | Regenerate OpenAPI types (backend must be running) |
