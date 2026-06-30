#!/usr/bin/env node
/**
 * Fails if a currently-hosted in-shell page (Stock Control or AU Rubber, or a
 * component it renders) links a HOSTED-target route with a RAW
 * `/<app>/portal/...` literal that is NOT routed through
 * `useCoreAwareHref()` / `coreHref(...)`.
 *
 * The #395 cutover hosts real app pages inside the unified `/core/portal` shell
 * by re-exporting them. When such a page renders in-shell, every internal nav
 * href must go through `coreHref(...)` so a drill-down stays in-shell instead of
 * trap-dooring back to the legacy `/<app>/portal/*` chrome ("Classic").
 * `coreHref` is a no-op in the legacy context, so wrapping is always safe — and
 * REQUIRED on hosted targets. This guard catches new/missed leaks automatically.
 *
 * SCOPE (per app — stock-control AND au-rubber): the hosted page files (derived
 * from the `core/portal/<app>` shims) PLUS every component TRANSITIVELY IMPORTED
 * by them within that app (`<app>/**`). This is an import-graph walk, not a
 * hardcoded dir list — so a component rendered by a hosted page (e.g.
 * InventoryCardView) is always in scope, while a legacy-only component (e.g.
 * NotificationBell, reachable only from the legacy layout) is never flagged.
 * Sub-route pages aren't imported by hosted pages (only navigated to), so they're
 * naturally excluded.
 *
 * NON-OFFENDERS (correctly skipped):
 *   - literals already wrapped: `coreHref("/<app>/portal/...")`
 *   - non-hosted targets (sub-pages / un-migrated routes): they eject cleanly
 *   - `href=` props of shared wrapper components (CountBadge, MetricCard, ...)
 *     that resolve the href internally — only `<Link>` / `<a>` / router.push|
 *     replace literals are nav contexts the guard enforces.
 *
 * Pure Node so it runs identically on Windows, macOS and Linux (no bash).
 *
 * Run standalone:
 *   node scripts/check-core-portal-links.ts
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

const APP_DIR = "annix-frontend/src/app";
const FLAG_FILE = join(APP_DIR, "core/portal/config/corePortalFlag.ts");

interface AppScan {
  app: string;
  shimDir: string;
  portalDir: string;
  root: string;
  legacyPrefix: string;
}

const APPS: AppScan[] = [
  {
    app: "stock-control",
    shimDir: join(APP_DIR, "core/portal/stock-control"),
    portalDir: join(APP_DIR, "stock-control/portal"),
    root: join(APP_DIR, "stock-control"),
    legacyPrefix: "/stock-control/portal/",
  },
  {
    app: "au-rubber",
    shimDir: join(APP_DIR, "core/portal/au-rubber"),
    portalDir: join(APP_DIR, "au-rubber/portal"),
    root: join(APP_DIR, "au-rubber"),
    legacyPrefix: "/au-rubber/portal/",
  },
];

/**
 * Per-app hosted suffix set, parsed from the `"<app>": new Set([...])` block of
 * `CORE_PORTAL_HOSTED_SUFFIXES_BY_APP` in corePortalFlag.ts (kept in sync, no
 * hardcoded copy here).
 */
const hostedSuffixes = (app: string): Set<string> => {
  const text = readFileSync(FLAG_FILE, "utf8");
  const block = text.match(new RegExp(`"${app}":\\s*new Set\\(\\[([^\\]]*)\\]`));
  if (block === null) {
    process.stderr.write(`Could not read hosted suffixes for "${app}" from ${FLAG_FILE}\n`);
    process.exit(1);
  }
  const entries = block[1].match(/"([a-z0-9-]+)"/g);
  return new Set(entries === null ? [] : entries.map((quoted) => quoted.replace(/"/g, "")));
};

/**
 * First path segments of the per-app nested hosted route templates, parsed from
 * the `CORE_PORTAL_HOSTED_ROUTE_TEMPLATES_BY_APP` block of corePortalFlag.ts. A
 * link whose first segment starts a nested hosted route (e.g. `companies`,
 * `delivery-notes`, `tax-invoices`) must also flow through `coreHref(...)`, so we
 * fold these into the hosted set the offender check enforces. (Wrapping a rare
 * non-hosted sub-path under one of these prefixes is a harmless no-op.)
 */
const hostedTemplateFirstSegments = (app: string): Set<string> => {
  const text = readFileSync(FLAG_FILE, "utf8");
  const constStart = text.indexOf("CORE_PORTAL_HOSTED_ROUTE_TEMPLATES_BY_APP");
  if (constStart === -1) {
    return new Set();
  }
  const region = text.slice(constStart);
  const block = region.match(new RegExp(`"${app}":\\s*new Set\\(\\[([^\\]]*)\\]`));
  if (block === null) {
    return new Set();
  }
  const entries = block[1].match(/"([a-z0-9-]+)(?:\/[a-z0-9:-]+)*"/g);
  if (entries === null) {
    return new Set();
  }
  return new Set(entries.map((quoted) => quoted.replace(/"/g, "").split("/")[0]));
};

const walkTsx = (dir: string): string[] => {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return walkTsx(path);
    }
    return path.endsWith(".tsx") ? [path] : [];
  });
};

/**
 * Map every hosted shim (`core/portal/<app>/<rel>/page.tsx`) to the real app
 * page file it re-exports (`<app>/portal/<rel>/page.tsx`). These are the seeds
 * of the import-graph walk.
 */
const hostedRealPageFiles = (scan: AppScan): string[] => {
  const shims = walkTsx(scan.shimDir).filter((path) => path.endsWith("page.tsx"));
  const files = shims.map((shim) => {
    const rel = shim.slice(scan.shimDir.length + 1);
    return join(scan.portalDir, rel);
  });
  return [...new Set(files)];
};

const importSpecs = (text: string): string[] => {
  const specs: string[] = [];
  const patterns = [
    /(?:import|export)[^"';]*?from\s*["']([^"']+)["']/g,
    /import\(\s*["']([^"']+)["']\s*\)/g,
    /^\s*import\s+["']([^"']+)["']/gm,
  ];
  for (const pattern of patterns) {
    let match = pattern.exec(text);
    while (match !== null) {
      specs.push(match[1]);
      match = pattern.exec(text);
    }
  }
  return specs;
};

const resolveImport = (spec: string, fromFile: string, root: string): string | null => {
  let base: string | null = null;
  if (spec.startsWith("@/app/")) {
    base = join(APP_DIR, spec.slice("@/app/".length));
  } else if (spec.startsWith(".")) {
    base = join(dirname(fromFile), spec);
  }
  if (base === null) {
    return null;
  }
  const candidates = [`${base}.tsx`, `${base}.ts`, join(base, "index.tsx"), join(base, "index.ts")];
  const found = candidates.find(
    (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
  );
  if (!found?.startsWith(root)) {
    return null;
  }
  return found;
};

/**
 * Every .ts/.tsx file transitively imported by the hosted page seeds, restricted
 * to the app. This is the in-shell render set: a leak anywhere reachable from a
 * hosted page is caught; legacy-only components (never imported here) are not.
 */
const scanFiles = (scan: AppScan): string[] => {
  const visited = new Set<string>();
  const queue = hostedRealPageFiles(scan);
  while (queue.length > 0) {
    const file = queue.pop();
    if (file === undefined || visited.has(file) || !existsSync(file)) {
      continue;
    }
    visited.add(file);
    const next = importSpecs(readFileSync(file, "utf8"))
      .map((spec) => resolveImport(spec, file, scan.root))
      .filter((resolved): resolved is string => resolved !== null && !visited.has(resolved));
    queue.push(...next);
  }
  return [...visited];
};

const enclosingTag = (text: string, position: number): string | null => {
  const before = text.slice(0, position);
  const matches = [...before.matchAll(/<([A-Za-z][\w.]*)/g)];
  const last = matches[matches.length - 1];
  return last ? last[1] : null;
};

const isNavPush = (beforeStripped: string): boolean => {
  return /\.(push|replace)\($/.test(beforeStripped);
};

const escapeForRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const offendersIn = (path: string, scan: AppScan, hosted: Set<string>): string[] => {
  const text = readFileSync(path, "utf8");
  const literal = new RegExp(`(["'\`])${escapeForRegExp(scan.legacyPrefix)}([a-z0-9-]+)`, "g");
  const hits: string[] = [];
  let match = literal.exec(text);
  while (match !== null) {
    const suffix = match[2];
    const start = match.index;
    const beforeStripped = text.slice(0, start).replace(/\s+$/, "");
    const wrapped = beforeStripped.endsWith("coreHref(");
    if (hosted.has(suffix) && !wrapped) {
      const tag = enclosingTag(text, start);
      const navContext = isNavPush(beforeStripped) || tag === "Link" || tag === "a";
      if (navContext) {
        const lineNumber = text.slice(0, start).split("\n").length;
        hits.push(`${path}:${lineNumber}  (${scan.legacyPrefix}${suffix})`);
      }
    }
    match = literal.exec(text);
  }
  return hits;
};

const scanResults = APPS.map((scan) => {
  const hosted = new Set([...hostedSuffixes(scan.app), ...hostedTemplateFirstSegments(scan.app)]);
  const files = scanFiles(scan);
  const offenders = files.flatMap((path) => offendersIn(path, scan, hosted));
  return { app: scan.app, fileCount: files.length, offenders };
});

const allOffenders = scanResults.flatMap((result) => result.offenders);
const fileSummary = scanResults.map((r) => `${r.app}: ${r.fileCount}`).join(", ");

if (allOffenders.length === 0) {
  process.stdout.write(
    `Core portal links OK — no unwrapped hosted-target links (scanned ${fileSummary}).\n`,
  );
  process.exit(0);
}

process.stderr.write(`
Core portal link check FAILED

These in-shell-hosted files link a HOSTED route with a raw /<app>/portal/...
literal that bypasses useCoreAwareHref() — so a drill-down would trap-door to
the legacy "Classic" chrome instead of staying in the unified shell:

${allOffenders.map((o) => `  - ${o}`).join("\n")}

To fix each: call \`const coreHref = useCoreAwareHref()\` at the component top
(for rows rendered in a .map, put the hook in the row/child component) and wrap
the href/push: \`coreHref("/<app>/portal/...")\`. The hook is a no-op in the
legacy context and for non-hosted targets, so it is always safe to apply.
`);

process.exit(1);
