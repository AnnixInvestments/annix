# Mongo migrations

Forward-only schema and data migrations for the live MongoDB database, run with
[`migrate-mongo`](https://github.com/seppevs/migrate-mongo).

## Baseline

The **production database is the baseline.** The PostgreSQL/TypeORM migration
history under `src/migrations/` is legacy and is not replayed against Mongo —
those files target the retired Neon database. This directory starts empty: the
first migration here is the first change made to production's current shape.

## Why this exists

The app runs with `autoCreate: false` and `autoIndex: false` (see
`src/lib/persistence/mongo-connection.module.ts`). Collections are created on
first write and indexes are **not** built automatically. Any new index, backfill,
or structural change therefore has to be applied through a migration here.

## Commands (run from `annix-backend/`)

```bash
pnpm migrate:status   # show applied + pending migrations
pnpm migrate:create add-some-index
pnpm migrate:up       # apply all pending migrations
pnpm migrate:down     # roll back the last applied migration
```

`MONGODB_URI` and `MONGO_DATABASE` come from the environment (the same vars the
app uses), so the target cluster is whichever environment's secrets are loaded.

## When migrations run

On every Fly deploy, the `release_command` in `fly.toml` runs `migrate-mongo up`
once, before the new version takes traffic, against that environment's own
database. Locally, run `pnpm migrate:up` by hand.

## Writing a migration

Migrations are **TypeScript** files exporting `up` and `down`, typed with the
Mongo driver `Db` (re-exported from `mongoose` so no extra dependency is needed).
Keep both idempotent. `migrate:create` scaffolds a file; rewrite it to the typed
form below.

```ts
import type { mongo } from "mongoose";

export const up = async (db: mongo.Db): Promise<void> => {
  await db
    .collection("orbit_education_profiles")
    .createIndex({ email: 1 }, { unique: true, name: "email_unique" });
};

export const down = async (db: mongo.Db): Promise<void> => {
  await db.collection("orbit_education_profiles").dropIndex("email_unique");
};
```

`migrate-mongo` runs the `.ts` files via `ts-node` (configured in the `migrate:*`
scripts and the Fly `release_command`). Run `pnpm biome check --write` on new
migration files before committing.

## Baseline migration

`20260530140000-baseline-production-indexes.ts` recreates the one secondary index
production carried before `autoIndex: false` (`provider_1` unique on
`cv_assistant_source_respect_ranks`). It is idempotent - a no-op where the index
already exists, and the way a fresh environment reproduces production's index set.
