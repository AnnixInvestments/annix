#!/usr/bin/env node
/**
 * Fails if any file under annix-backend/src/annix-orbit/ imports a CORE app's
 * schema or repository.
 *
 * Annix Orbit runs on its own MongoDB cluster (ORBIT_MONGODB_URI). Wiring a
 * core-app schema/repository (RFQ, Stock Control, Stock Management, AU Rubber)
 * into an Orbit module is a data-isolation hazard: today it only works because
 * the MongooseModule.forFeature registration happens to default to the core
 * connection, an invariant that is invisible in review and easy to break — and
 * if that repository ever resolved against ORBIT_CONNECTION, Orbit would
 * read/write core ERP data on the wrong cluster.
 *
 * Orbit must reach core data (if it genuinely needs to) through an explicit
 * core-facing SERVICE, never by importing the schema/repository. This guard
 * mirrors check-migration-routing.ts (the Orbit-collection migration guard).
 *
 * Pure Node so it runs identically on Windows, macOS and Linux (no bash).
 *
 * Wire-in points:
 *   - .githooks/pre-push
 *   - .github/workflows/deploy.yml (test job)
 *
 * Run standalone:
 *   node scripts/check-orbit-core-imports.ts
 */

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ORBIT_DIR = "annix-backend/src/annix-orbit";
const CORE_APP_SCHEMA_OR_REPO_IMPORT =
  /from\s+["'](?:\.\.\/)+(rfq|stock-control|stock-management|rubber-lining)\/[^"']*(?:schema|repository)[^"']*["']/g;

const orbitFiles = (): string[] => {
  try {
    return readdirSync(ORBIT_DIR, { recursive: true, encoding: "utf8" }).filter(
      (name): name is string =>
        typeof name === "string" && name.endsWith(".ts") && !name.endsWith(".spec.ts"),
    );
  } catch {
    return [];
  }
};

const files = orbitFiles();

if (files.length === 0) {
  process.stdout.write("Orbit import boundary OK — no Orbit files to check.\n");
  process.exit(0);
}

const offenders = files
  .map((name) => {
    const path = join(ORBIT_DIR, name);
    const matches = readFileSync(path, "utf8").match(CORE_APP_SCHEMA_OR_REPO_IMPORT);
    if (matches === null) {
      return null;
    }
    return { path, refs: [...new Set(matches)].slice(0, 3).join("; ") };
  })
  .filter((entry) => entry !== null);

if (offenders.length === 0) {
  process.stdout.write(
    "Orbit import boundary OK — no Orbit module imports a core app schema/repository.\n",
  );
  process.exit(0);
}

const lines = offenders.map((o) => `  - ${o.path}\n      ${o.refs}`).join("\n");

process.stderr.write(`
Orbit import boundary check FAILED

These files under ${ORBIT_DIR}/ import a CORE app's schema/repository, which
wires core-cluster data into the Orbit-cluster module:

${lines}

Orbit must access core data through an explicit core-facing SERVICE, not by
importing the schema/repository. Remove the import (if unused) or route the
access via an exported service interface from the owning core module.
`);

process.exit(1);
