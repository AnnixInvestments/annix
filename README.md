# Annix

Monorepo for the Annix platform:

- **`annix-backend`** — NestJS REST API (port `4001`, Swagger at `http://localhost:4001/swagger`)
- **`annix-frontend`** — Next.js application (port `3000`) serving Stock Control, RFQ, AU Rubber, Annix Sentinel, FieldFlow, Annix Pulse, Annix Orbit, Annix Insights and the marketing site
- **`packages/product-data`** — shared reference data (`@annix/product-data`)

The database is **MongoDB Atlas** (one core ERP cluster per environment, plus dedicated per-environment Orbit clusters). There is no local database to install — dev profiles connect to Atlas directly.

## Runtime targets

- Node.js **22+** (production images build on `node:22-slim`)
- pnpm **10.x**

## One-time setup

```bash
git config core.hooksPath .githooks
pnpm install
```

Connection strings, per-environment credentials and the full new-developer onboarding guide live in the admin portal under **Secure Documents → "Dev Environment Connections & Onboarding"** — they are deliberately not in this repo.

## Running the dev environment

Dev servers are managed by the **Claude Swarm orchestrator**:

```bash
pnpm claude-swarm
```

Pick an environment at the prompt — Local (your `annix-backend/.env`), staging, test, or production. The staging/test/production profiles fetch their secrets (core and Orbit Mongo URIs included) from the matching Fly.io app, with email delivery disabled locally.

- Frontend: http://localhost:3000 · Backend: http://localhost:4001
- Logs: `logs/frontend.log`, `logs/backend.log`, combined `logs/annix.log`
- Status: `.claude-swarm/registry.json`

Do not run `pnpm dev`, `pnpm build`, or the legacy `run-dev.*` scripts while the swarm is active — it owns the build and dev-server lifecycle, and parallel builds corrupt caches.

## Tests

Run from the repo root:

```bash
pnpm test:all        # backend tests + frontend type check
pnpm test:backend
pnpm test:frontend
pnpm test:coverage
pnpm test:watch
pnpm test:e2e
```

## Database migrations (migrate-mongo, TypeScript, forward-only)

From `annix-backend/`:

```bash
pnpm migrate:status / migrate:create <name> / migrate:up        # core ERP cluster
pnpm migrate:orbit:status / migrate:orbit:create <name> / migrate:orbit:up   # Orbit cluster
```

Migrations touching Orbit collections must live in `migrations-mongo-orbit/` — `scripts/check-migration-routing.ts` enforces this. Both directories run automatically on every Fly deploy via the `release_command`.

## Git workflow

Trunk-based and PR-free: one commit per complete change, straight to `main`. The `pre-push` hook (`.githooks/pre-push`) formats, tests and builds both apps before any push; `git push --no-verify` is for emergencies only and the hook must pass before further work builds on the branch.

Engineering conventions (code style, shared-code discovery protocol, branding, progress popups, resource budgets) are in [CLAUDE.md](CLAUDE.md), with deeper references in [docs/shared-registry.md](docs/shared-registry.md), [docs/frontend-conventions.md](docs/frontend-conventions.md), [docs/storage-architecture.md](docs/storage-architecture.md), [docs/rfq-domain-reference.md](docs/rfq-domain-reference.md) and [docs/sage-dla-compliance.md](docs/sage-dla-compliance.md).

## Deployment

Fly.io apps: `annix-app` (production), `annix-app-staging`, `annix-app-test`, all driven by the single `fly.toml`. Secrets are set per app with `fly secrets set` — never committed to the repo.
