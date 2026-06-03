#!/usr/bin/env node
/**
 * Fails if any migration in annix-backend/migrations-mongo/ (the CORE ERP
 * cluster) references Orbit collections.
 *
 * Annix Orbit runs on its own MongoDB cluster (ORBIT_MONGODB_URI). The deploy
 * release command runs migrations in migrations-mongo/ against the core cluster
 * and migrations in migrations-mongo-orbit/ against the Orbit cluster. A
 * migration that touches Orbit collections (cv_assistant_*, orbit_*,
 * tier_invite, seeker_usage_counter) but sits in the core directory runs
 * against the wrong database: at best a no-op, at worst it mutates the core
 * production ERP database.
 *
 * Every migration in the core directory is scanned — the core directory must
 * never contain a migration that references Orbit collections. The core->Orbit
 * data move was done by an out-of-band sync, not by these migrations, so the
 * changelog is not a historical record that needs preserving.
 *
 * Pure Node so it runs identically on Windows, macOS and Linux (no bash).
 *
 * Wire-in points:
 *   - .githooks/pre-push
 *   - .github/workflows/deploy.yml (test job)
 *
 * Run standalone:
 *   node scripts/check-migration-routing.ts
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CORE_DIR = "annix-backend/migrations-mongo";
const ORBIT_DIR = "annix-backend/migrations-mongo-orbit";
const ORBIT_COLLECTION_PATTERN =
  /cv_assistant_[a-z0-9_]+|orbit_[a-z0-9_]+|tier_invites?|seeker_usage_counters?/g;
const MIGRATION_FILE = /^\d.*\.ts$/;

const migrationFiles = (dir: string): string[] => {
  try {
    return readdirSync(dir).filter((name) => MIGRATION_FILE.test(name));
  } catch {
    return [];
  }
};

const files = migrationFiles(CORE_DIR);

if (files.length === 0) {
  process.stdout.write("Migration routing OK — no core migrations to check.\n");
  process.exit(0);
}

const offenders = files
  .map((name) => {
    const path = join(CORE_DIR, name);
    const matches = readFileSync(path, "utf8").match(ORBIT_COLLECTION_PATTERN);
    if (matches === null) {
      return null;
    }
    return { path, refs: [...new Set(matches)].sort().slice(0, 3).join(", ") };
  })
  .filter((entry) => entry !== null);

if (offenders.length === 0) {
  process.stdout.write("Migration routing OK — core migrations reference no Orbit collections.\n");
  process.exit(0);
}

const lines = offenders.map((o) => `  - ${o.path}  (references: ${o.refs})`).join("\n");

process.stderr.write(`
Migration routing check FAILED

These migrations live in ${CORE_DIR}/ (the CORE cluster) but reference Orbit
collections, so the deploy would run them against the wrong database:

${lines}

Orbit migrations belong in ${ORBIT_DIR}/. To fix:
  1. git mv each file into ${ORBIT_DIR}/
  2. create future Orbit migrations with: pnpm migrate:orbit:create <name>
  3. the deploy release command already runs migrate:orbit:up against the
     Orbit cluster (ORBIT_MONGODB_URI) per environment.

Core (ERP) migrations stay in ${CORE_DIR}/ as before.
`);

process.exit(1);
