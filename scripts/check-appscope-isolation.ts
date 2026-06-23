#!/usr/bin/env node
/**
 * Cross-app identity isolation guard (issue #389, Phase 1 + Phase 2).
 *
 * The `user` collection is SHARED across every Annix app, partitioned by the
 * string `appScope`. Each app has its OWN registration + login: the same email
 * may hold a SEPARATE account per app, and provisioning into app B must never
 * read, mutate, or authenticate a record owned by app A.
 *
 * This static check scans every app's source tree and FAILS (exit 1) on any
 * re-introduced footgun:
 *
 *   (a) a MUTATION of `appScope` on a fetched record (`<expr>.appScope =`).
 *       Stamping a scope onto a record read from the DB is the original bug and
 *       is NEVER allowed — there is no legitimate reason to reassign appScope on
 *       an existing record.
 *
 *   (b) an `appScope: "<value>"` object-literal whose value belongs to a
 *       DIFFERENT app — minting/claiming a record under a foreign scope. Each
 *       app may only write its OWN scope, and only at an allowlisted creation
 *       site.
 *
 *   (c) a call to an un-scoped, cross-app lookup (`findOneByEmail` /
 *       `findByEmailWithRoles` / `findOneByEmailCaseInsensitive` /
 *       `findOneByEmailCaseInsensitiveWithRoles`) from an app auth/provision
 *       file. These return another app's records and must never gate identity.
 *       Use the scoped variants (`findOneByEmailAndScope`,
 *       `findByEmailWithRolesAndScope`) instead.
 *
 * Conservative by design (per-app allowlists, narrow patterns) to avoid false
 * positives, but it MUST flag a cross-app scope stamp or an un-scoped identity
 * lookup in any app's auth path.
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

const SRC = "annix-backend/src";

interface AppRule {
  /** Directory (relative to SRC) the app's identity code lives in. */
  dir: string;
  /** Scope value(s) this app legitimately owns. */
  ownScopes: string[];
  /**
   * Files (relative to the app dir) allowed to read with an un-scoped lookup —
   * read-only cross-app features (e.g. job feeds) that legitimately resolve a
   * person across apps and never gate auth on the result.
   */
  unscopedLookupAllowlist: string[];
}

/**
 * Canonical scopes — MUST match annix-backend/src/rbac/app-scope.ts and the
 * backfill migration. Listed here so the guard can tell an app's own scope from
 * a foreign one without importing TypeScript at lint time.
 */
const ALL_SCOPES = [
  "forge:customer",
  "forge:supplier",
  "annix:admin",
  "pulse:rep",
  "sentinel:user",
  "stock-control",
  "orbit:seeker",
  "orbit:company",
  "orbit:recruiter",
  "orbit:student",
  "teacher-assistant",
];

const APPS: AppRule[] = [
  { dir: "customer", ownScopes: ["forge:customer"], unscopedLookupAllowlist: [] },
  { dir: "supplier", ownScopes: ["forge:supplier"], unscopedLookupAllowlist: [] },
  {
    dir: "admin",
    ownScopes: ["annix:admin"],
    unscopedLookupAllowlist: [],
  },
  { dir: "annix-rep", ownScopes: ["pulse:rep"], unscopedLookupAllowlist: [] },
  { dir: "annix-sentinel", ownScopes: ["sentinel:user"], unscopedLookupAllowlist: [] },
  {
    dir: "annix-orbit",
    ownScopes: ["orbit:seeker", "orbit:company", "orbit:recruiter", "orbit:student"],
    // Read-only cross-app feed: resolves a person by email across apps, never
    // authenticates on the result.
    unscopedLookupAllowlist: ["services/seeker-job-feed.service.ts"],
  },
  {
    dir: "teacher-assistant",
    ownScopes: ["teacher-assistant"],
    unscopedLookupAllowlist: [],
  },
];

const UNSCOPED_LOOKUP_PATTERN =
  /\.(findOneByEmail|findByEmailWithRoles|findOneByEmailCaseInsensitive|findOneByEmailCaseInsensitiveWithRoles)\b(?!AndScope)/;
/** Mutation of appScope on a fetched record — `<expr>.appScope = ...`. Always the bug. */
const APPSCOPE_MUTATION_PATTERN = /\.appScope\s*=(?!=)/;
/** Object-literal field `appScope: "<value>"`. */
const APPSCOPE_LITERAL_PATTERN =
  /(?<![A-Za-z0-9_.])appScope\s*:\s*(?:"([^"]*)"|'([^']*)'|AppScope\.(\w+))/;
const TS_FILE = /\.ts$/;
const SPEC_FILE = /\.spec\.ts$/;

const APPSCOPE_ENUM_TO_VALUE: Record<string, string> = {
  FORGE_CUSTOMER: "forge:customer",
  FORGE_SUPPLIER: "forge:supplier",
  ANNIX_ADMIN: "annix:admin",
  PULSE_REP: "pulse:rep",
  SENTINEL_USER: "sentinel:user",
  STOCK_CONTROL: "stock-control",
  ORBIT_SEEKER: "orbit:seeker",
  ORBIT_COMPANY: "orbit:company",
  ORBIT_RECRUITER: "orbit:recruiter",
  ORBIT_STUDENT: "orbit:student",
  TEACHER_ASSISTANT: "teacher-assistant",
};

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

const relativeWithin = (path: string, appDir: string): string =>
  path.slice(appDir.length + 1).replace(/\\/g, "/");

const literalScopeValue = (match: RegExpExecArray): string | null => {
  const direct = match[1] ?? match[2];
  if (typeof direct === "string") {
    return direct;
  }
  const enumKey = match[3];
  if (typeof enumKey === "string") {
    return APPSCOPE_ENUM_TO_VALUE[enumKey] ?? `AppScope.${enumKey}`;
  }
  return null;
};

const scanFile = (path: string, app: AppRule): Offender[] => {
  const appDir = join(SRC, app.dir);
  const relative = relativeWithin(path, appDir);
  const lookupAllowed = app.unscopedLookupAllowlist.includes(relative);
  const lines = readFileSync(path, "utf8").split(/\r?\n/);

  return lines.flatMap((rawLine, index) => {
    const line = rawLine.replace(/\/\/.*$/, "");
    const found: Offender[] = [];

    if (!lookupAllowed && UNSCOPED_LOOKUP_PATTERN.test(line)) {
      found.push({
        file: path,
        line: index + 1,
        text: rawLine.trim(),
        reason:
          "un-scoped cross-app lookup returns ANOTHER app's record — use findOneByEmailAndScope / findByEmailWithRolesAndScope",
      });
    }

    if (APPSCOPE_MUTATION_PATTERN.test(line)) {
      found.push({
        file: path,
        line: index + 1,
        text: rawLine.trim(),
        reason:
          "appScope MUTATION on a fetched record — never reassign appScope on an existing user",
      });
    }

    const literal = APPSCOPE_LITERAL_PATTERN.exec(line);
    if (literal) {
      const value = literalScopeValue(literal);
      if (value !== null && ALL_SCOPES.includes(value) && !app.ownScopes.includes(value)) {
        found.push({
          file: path,
          line: index + 1,
          text: rawLine.trim(),
          reason: `writes a FOREIGN appScope '${value}' — the ${app.dir} app may only mint its own scope (${app.ownScopes.join(", ")})`,
        });
      }
    }

    return found;
  });
};

const offenders = APPS.flatMap((app) => {
  const appDir = join(SRC, app.dir);
  return walk(appDir).flatMap((path) => scanFile(path, app));
});

if (offenders.length === 0) {
  process.stdout.write("appScope isolation OK — no app auth path touches another app's records.\n");
  process.exit(0);
}

const report = offenders
  .map((o) => `  - ${o.file.replace(/\\/g, "/")}:${o.line}\n      ${o.text}\n      ${o.reason}`)
  .join("\n");

process.stderr.write(`
Cross-app identity isolation check FAILED

The shared \`user\` collection is partitioned by \`appScope\`. Each app has its
own per-app account; provisioning into one app must never read, claim, or
mutate another app's record. These lines re-introduce a cross-app footgun:

${report}

How to fix:
  - Replace un-scoped lookups with the scoped methods
    (findOneByEmailAndScope / findByEmailWithRolesAndScope) on UserRepository.
  - Only write your OWN app's appScope, and only when CREATING a brand-new
    record (inside userRepo.create) — never stamp a scope onto a fetched record
    and never write another app's scope value.

If you are adding a genuinely read-only cross-app feature, add its file to that
app's unscopedLookupAllowlist in scripts/check-appscope-isolation.ts with a
comment explaining why it never gates auth.
`);

process.exit(1);
