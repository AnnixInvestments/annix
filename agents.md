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

GitHub Actions push triggers are disabled on `AnnixInvestments/annix` because the org owner account (`AnnixApp`) was deleted. A GitHub Support ticket is pending to transfer ownership.

Workflows are triggered via the GitHub API instead:

### Push Flow
1. All development happens on `AnnixInvestments/annix` (origin)
2. The `.githooks/pre-push` hook runs checks (lint, tests, builds, migrations)
3. After the push completes, a background `gh workflow run` API call triggers the deploy workflow

### Remotes
- `origin` — `https://github.com/AnnixInvestments/annix.git` (only remote)

### Git Hooks
- Hooks live in `.githooks/` — requires `git config core.hooksPath .githooks`
- The pre-push hook runs all checks and schedules the deploy trigger

### When This Can Be Simplified
Once GitHub Support transfers org ownership to an active account:
1. Enable GitHub Actions push triggers on `AnnixInvestments/annix`
2. Remove the `gh workflow run` lines from `.githooks/pre-push` (push events will trigger deploys directly)

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
