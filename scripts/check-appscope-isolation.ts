#!/usr/bin/env node
/**
 * Cross-app identity isolation guard (Phase 1).
 *
 * The `user` collection is SHARED across every Annix app, partitioned by
 * `appScope` (`orbit:*` vs non-orbit). Orbit auth/provisioning must NEVER
 * read, claim, or mutate a NON-orbit record — each email holds its own
 * per-app record. The original bug stamped `orbit:seeker` onto a Forge
 * customer's record in auth.service.ts and authenticated Orbit logins against
 * non-orbit records via the un-scoped `findOneByEmail`, hijacking those users.
 *
 * This static check scans annix-orbit/ source and FAILS (exit 1) on either
 * re-introduced footgun:
 *
 *   (a) a MUTATION of `appScope` on a fetched record (`<expr>.appScope =`).
 *       Stamping a scope onto a record read from the DB is the bug, and is
 *       NEVER allowed in an Orbit file — there is no legitimate reason to
 *       reassign appScope on an existing record. (Setting `appScope: "orbit:*"`
 *       as an object-literal field inside `userRepo.create({...})` at an
 *       allowlisted creation file is fine — that mints the app's own record.)
 *
 *   (b) a call to an un-scoped, cross-app lookup
 *       (`findOneByEmail` / `findByEmailWithRoles` /
 *       `findOneByEmailCaseInsensitive`) from an Orbit auth/provision file.
 *       These return NON-orbit records and must never gate Orbit identity.
 *
 * Conservative by design (small allowlist, narrow patterns) to avoid false
 * positives, but it MUST flag the auth.service.ts:956 stamping and the
 * resolveOrbitLoginUser `findOneByEmail` fallback if either returns.
 *
 * Pure Node — runs identically on Windows, macOS and Linux (no bash, no deps).
 *
 * Wire-in points:
 *   - .githooks/pre-push
 *
 * Run standalone:
 *   node scripts/check-appscope-isolation.ts
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ORBIT_DIR = "annix-backend/src/annix-orbit";

/**
 * Files where Orbit user records are FIRST created — the only legitimate place
 * an `appScope: "orbit:*"` literal may be written, because that record is the
 * app's own newly-minted account, never a pre-existing foreign one.
 */
const APPSCOPE_WRITE_ALLOWLIST = ["services/auth.service.ts"];

const UNSCOPED_LOOKUP_PATTERN =
  /\.(findOneByEmail|findByEmailWithRoles|findOneByEmailCaseInsensitive)\b/;
/** Mutation of appScope on a fetched record — `<expr>.appScope = ...`. Always the bug. */
const APPSCOPE_MUTATION_PATTERN = /\.appScope\s*=(?!=)/;
/** Object-literal field `appScope: "orbit:*"` — legitimate only at a creation site. */
const APPSCOPE_LITERAL_PATTERN = /(?<![A-Za-z0-9_.])appScope\s*:/;
const TS_FILE = /\.ts$/;
const SPEC_FILE = /\.spec\.ts$/;

interface Offender {
  file: string;
  line: number;
  text: string;
  reason: string;
}

const walk = (dir: string): string[] => {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return [];
  }
  return entries.flatMap((name) => {
    const path = join(dir, name);
    const info = statSync(path);
    if (info.isDirectory()) {
      return walk(path);
    }
    return TS_FILE.test(name) && !SPEC_FILE.test(name) ? [path] : [];
  });
};

const relativeWithin = (path: string): string =>
  path.slice(ORBIT_DIR.length + 1).replace(/\\/g, "/");

const scanFile = (path: string): Offender[] => {
  const relative = relativeWithin(path);
  const isAppScopeCreationSite = APPSCOPE_WRITE_ALLOWLIST.includes(relative);
  const lines = readFileSync(path, "utf8").split(/\r?\n/);

  return lines.flatMap((rawLine, index) => {
    const line = rawLine.replace(/\/\/.*$/, "");
    const found: Offender[] = [];

    if (UNSCOPED_LOOKUP_PATTERN.test(line)) {
      found.push({
        file: path,
        line: index + 1,
        text: rawLine.trim(),
        reason:
          "un-scoped cross-app lookup (findOneByEmail / findByEmailWithRoles / findOneByEmailCaseInsensitive) returns NON-orbit records",
      });
    }

    if (APPSCOPE_MUTATION_PATTERN.test(line)) {
      found.push({
        file: path,
        line: index + 1,
        text: rawLine.trim(),
        reason:
          "appScope MUTATION on a fetched record — stamping a scope onto an existing user is never allowed in Orbit code",
      });
    }

    if (!isAppScopeCreationSite && APPSCOPE_LITERAL_PATTERN.test(line)) {
      found.push({
        file: path,
        line: index + 1,
        text: rawLine.trim(),
        reason: "appScope literal outside an allowlisted orbit-user creation site",
      });
    }

    return found;
  });
};

const files = walk(ORBIT_DIR);

if (files.length === 0) {
  process.stdout.write("appScope isolation OK — no Orbit source files to check.\n");
  process.exit(0);
}

const offenders = files.flatMap(scanFile);

if (offenders.length === 0) {
  process.stdout.write("appScope isolation OK — Orbit auth never touches non-orbit records.\n");
  process.exit(0);
}

const report = offenders
  .map((o) => `  - ${o.file.replace(/\\/g, "/")}:${o.line}\n      ${o.text}\n      ${o.reason}`)
  .join("\n");

process.stderr.write(`
Cross-app identity isolation check FAILED

The shared \`user\` collection is partitioned by \`appScope\` (orbit:* vs
non-orbit). Orbit auth/provisioning must never read, claim, or mutate a
non-orbit record. These lines re-introduce a cross-app footgun:

${report}

How to fix:
  - Replace un-scoped lookups with the orbit-scoped methods
    (findOrbitUserByEmail / findOneByEmailAndScope) on UserRepository.
  - Only write \`appScope: "orbit:*"\` when CREATING a brand-new orbit user
    (inside userRepo.create at an allowlisted creation site) — never stamp a
    scope onto a record fetched from the DB.

If you are adding a genuinely-new orbit-user creation site, add its path to
APPSCOPE_WRITE_ALLOWLIST in scripts/check-appscope-isolation.ts with a comment.
`);

process.exit(1);
