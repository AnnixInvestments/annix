#!/usr/bin/env node
/**
 * Fails if an existing AppScope string changes or if the duplicate scope lists
 * in check-appscope-isolation.ts drift from the canonical enum.
 *
 * Existing scope strings are persisted in production `user.appScope` rows.
 * Additions are allowed, but renames/removals of the keys below are not.
 */

import { readFileSync } from "node:fs";

const APP_SCOPE_PATH = "annix-backend/src/rbac/app-scope.ts";
const ISOLATION_CHECK_PATH = "scripts/check-appscope-isolation.ts";

const FROZEN_APP_SCOPES: Record<string, string> = {
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
  label: string;
  detail: string;
}

const source = readFileSync(APP_SCOPE_PATH, "utf8");
const isolationSource = readFileSync(ISOLATION_CHECK_PATH, "utf8");

const appScopeBody = source.match(/export const AppScope = \{([\s\S]*?)\} as const;/)?.[1] ?? "";
const appScopes = Object.fromEntries(
  [...appScopeBody.matchAll(/^\s*([A-Z0-9_]+):\s*"([^"]+)",?/gm)].map((match) => [
    match[1],
    match[2],
  ]),
);

const allScopesBody = isolationSource.match(/const ALL_SCOPES = \[([\s\S]*?)\];/)?.[1] ?? "";
const isolationAllScopes = [...allScopesBody.matchAll(/"([^"]+)"/g)].map((match) => match[1]);

const enumMapBody =
  isolationSource.match(
    /const APPSCOPE_ENUM_TO_VALUE: Record<string, string> = \{([\s\S]*?)\};/,
  )?.[1] ?? "";
const isolationEnumMap = Object.fromEntries(
  [...enumMapBody.matchAll(/^\s*([A-Z0-9_]+):\s*"([^"]+)",?/gm)].map((match) => [
    match[1],
    match[2],
  ]),
);

const frozenOffenders = Object.entries(FROZEN_APP_SCOPES).flatMap(([key, expected]) => {
  const actual = appScopes[key];

  if (actual === expected) {
    return [];
  }

  if (typeof actual === "string") {
    return [
      {
        label: `${APP_SCOPE_PATH} AppScope.${key}`,
        detail: `expected "${expected}", found "${actual}"`,
      },
    ];
  }

  return [
    {
      label: `${APP_SCOPE_PATH} AppScope.${key}`,
      detail: `missing frozen scope value "${expected}"`,
    },
  ];
});

const canonicalValues = Object.values(appScopes);
const missingFromAllScopes = canonicalValues
  .filter((value) => !isolationAllScopes.includes(value))
  .map((value) => ({
    label: `${ISOLATION_CHECK_PATH} ALL_SCOPES`,
    detail: `missing canonical AppScope value "${value}"`,
  }));

const staleAllScopes = isolationAllScopes
  .filter((value) => !canonicalValues.includes(value))
  .map((value) => ({
    label: `${ISOLATION_CHECK_PATH} ALL_SCOPES`,
    detail: `contains stale value "${value}" not present in AppScope`,
  }));

const enumMapOffenders = Object.entries(appScopes).flatMap(([key, expected]) => {
  const actual = isolationEnumMap[key];

  if (actual === expected) {
    return [];
  }

  if (typeof actual === "string") {
    return [
      {
        label: `${ISOLATION_CHECK_PATH} APPSCOPE_ENUM_TO_VALUE.${key}`,
        detail: `expected "${expected}", found "${actual}"`,
      },
    ];
  }

  return [
    {
      label: `${ISOLATION_CHECK_PATH} APPSCOPE_ENUM_TO_VALUE.${key}`,
      detail: `missing canonical enum mapping to "${expected}"`,
    },
  ];
});

const staleEnumMap = Object.keys(isolationEnumMap)
  .filter((key) => !(key in appScopes))
  .map((key) => ({
    label: `${ISOLATION_CHECK_PATH} APPSCOPE_ENUM_TO_VALUE.${key}`,
    detail: "contains stale enum key not present in AppScope",
  }));

const offenders: Offender[] = [
  ...frozenOffenders,
  ...missingFromAllScopes,
  ...staleAllScopes,
  ...enumMapOffenders,
  ...staleEnumMap,
];

if (offenders.length === 0) {
  process.stdout.write(
    "appScope freeze OK — existing values unchanged and isolation copies sync.\n",
  );
  process.exit(0);
}

const report = offenders.map((o) => `  - ${o.label}\n      ${o.detail}`).join("\n");

process.stderr.write(`
AppScope freeze check FAILED

The user.appScope strings are persisted production identity partition keys.
Existing values may not be renamed or removed, and check-appscope-isolation.ts
must keep its duplicate hardcoded scope copies in sync with AppScope.

${report}

How to fix:
  - Revert any existing AppScope value rename/removal.
  - If you are adding a new scope, add it to AppScope and update
    ALL_SCOPES + APPSCOPE_ENUM_TO_VALUE in scripts/check-appscope-isolation.ts.
`);

process.exit(1);
