#!/usr/bin/env node
/**
 * Allowlist-only rename codemod for the #395 /core rename (Phase 4 tooling).
 *
 * Renames PREFIXED Mongoose model tokens `StockControl*` / `Rubber*` to their
 * `Core*` equivalents across the four string-literal contexts where a model
 * token is referenced by name:
 *   - `ref: "..."`                                    (sub-document references)
 *   - `@InjectModel("...")`                           (DI injection)
 *   - `MongooseModule.forFeature([{ name: "..." }])`  (registration)
 *   - `db.model("...")` / `connection.model("...")`   (raw lookups)
 *
 * SCOPE (allowlist) — a token is rewritten ONLY if it matches:
 *     /^(StockControl|Rubber)[A-Z]\w*$/
 *   Mapping is mechanical and KEEPS THE TWO FAMILIES DISTINCT so two different
 *   models can never collapse onto one name:
 *     StockControlX -> CoreX
 *     RubberX       -> CoreRubberX
 *   (so StockControlCompany -> CoreCompany, RubberCompany -> CoreRubberCompany).
 *   Any two distinct source tokens that would still map to the SAME target are
 *   reported as a COLLISION and left for a human to resolve — never merged.
 *
 * HARD DENY-LIST (never rewritten, even if the allowlist would match):
 *   - the AppScope enum + any `*AndScope(...)` call sites (identifiers, not the
 *     string-literal contexts above, so untouched by construction)
 *   - MODULE_CODES values + `company_module_subscriptions.moduleCode` data
 *   - the resolve-app literals "stock-control" / "au-rubber"
 *   - DASHBOARD_BY_APP keys and PORTAL_ROUTE_TO_STORE prefixes
 *   - the shared model tokens User / App / UserAppAccess
 *   - RBAC `ref: "Company"` (a different model)
 *   - the neutral domain models JobCard / JobCardLineItem / StockItem /
 *     DeliveryNote / CustomerPurchaseOrder (and any non-prefixed token)
 *
 * MODE: dry-run by default — prints every proposed (file:line, old -> new) and a
 * summary, writing NOTHING. Pass `--apply` to write changes to disk.
 *
 * Pure Node so it runs identically on Windows, macOS and Linux (no bash).
 *
 * Run standalone (dry-run):
 *   node scripts/core-rename-codemod.ts
 * Apply (Phase 4 only):
 *   node scripts/core-rename-codemod.ts --apply
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SCAN_DIR = "annix-backend/src";
const APPLY = process.argv.includes("--apply");

const ALLOWLIST = /^(StockControl|Rubber)[A-Z]\w*$/;

const DENY_LIST = new Set<string>([
  "User",
  "App",
  "UserAppAccess",
  "Company",
  "JobCard",
  "JobCardLineItem",
  "StockItem",
  "DeliveryNote",
  "CustomerPurchaseOrder",
  "stock-control",
  "au-rubber",
]);

interface ContextPattern {
  kind: string;
  re: RegExp;
}

const CONTEXT_PATTERNS: ContextPattern[] = [
  { kind: "ref", re: /\bref\s*:\s*(["'`])([A-Za-z0-9_]+)\1/g },
  { kind: "@InjectModel", re: /@InjectModel\(\s*(["'`])([A-Za-z0-9_]+)\1/g },
  { kind: "forFeature name", re: /\bname\s*:\s*(["'`])([A-Za-z0-9_]+)\1/g },
  { kind: ".model()", re: /\.model\(\s*(["'`])([A-Za-z0-9_]+)\1/g },
];

interface Proposal {
  file: string;
  line: number;
  kind: string;
  oldToken: string;
  newToken: string;
}

const coreNameFor = (token: string): string | null => {
  if (token.startsWith("StockControl")) {
    return `Core${token.slice("StockControl".length)}`;
  }
  if (token.startsWith("Rubber")) {
    return `CoreRubber${token.slice("Rubber".length)}`;
  }
  return null;
};

const shouldRewrite = (token: string): boolean => ALLOWLIST.test(token) && !DENY_LIST.has(token);

const tsFiles = (dir: string): string[] => {
  const entries = (() => {
    try {
      return readdirSync(dir);
    } catch {
      return [];
    }
  })();
  return entries.flatMap((name) => {
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (name === "node_modules" || name === "dist") {
        return [];
      }
      return tsFiles(path);
    }
    return name.endsWith(".ts") ? [path] : [];
  });
};

const lineOf = (content: string, index: number): number =>
  content.slice(0, index).split("\n").length;

const proposalsFor = (file: string, content: string): Proposal[] =>
  CONTEXT_PATTERNS.flatMap((pattern) => {
    const re = new RegExp(pattern.re.source, pattern.re.flags);
    const found: Proposal[] = [];
    let match = re.exec(content);
    while (match !== null) {
      const oldToken = match[2];
      if (shouldRewrite(oldToken)) {
        const newToken = coreNameFor(oldToken);
        if (newToken !== null) {
          found.push({
            file,
            line: lineOf(content, match.index),
            kind: pattern.kind,
            oldToken,
            newToken,
          });
        }
      }
      match = re.exec(content);
    }
    return found;
  });

const applyTo = (content: string): string =>
  CONTEXT_PATTERNS.reduce((acc, pattern) => {
    const re = new RegExp(pattern.re.source, pattern.re.flags);
    return acc.replace(re, (full, _quote, token) => {
      if (!shouldRewrite(token)) {
        return full;
      }
      const newToken = coreNameFor(token);
      if (newToken === null) {
        return full;
      }
      return full.slice(0, full.length - token.length) + newToken;
    });
  }, content);

const files = tsFiles(SCAN_DIR);
const allProposals = files.flatMap((file) => proposalsFor(file, readFileSync(file, "utf8")));

const collisions = (() => {
  const byTarget = allProposals.reduce<Map<string, Set<string>>>((acc, p) => {
    const sources = acc.get(p.newToken) ?? new Set<string>();
    sources.add(p.oldToken);
    return acc.set(p.newToken, sources);
  }, new Map());
  return [...byTarget.entries()].filter(([, sources]) => sources.size > 1);
})();

if (allProposals.length === 0) {
  process.stdout.write(`core-rename-codemod: no prefixed model tokens found under ${SCAN_DIR}/.\n`);
  process.exit(0);
}

const tokenMap = (() => {
  const pairs = allProposals.reduce<Map<string, string>>(
    (acc, p) => acc.set(p.oldToken, p.newToken),
    new Map(),
  );
  return [...pairs.entries()].sort(([a], [b]) => a.localeCompare(b));
})();

process.stdout.write(`core-rename-codemod (${APPLY ? "APPLY" : "DRY-RUN"})\n\n`);
process.stdout.write("Token map (old -> new):\n");
tokenMap.forEach(([oldToken, newToken]) => {
  process.stdout.write(`  ${oldToken} -> ${newToken}\n`);
});

process.stdout.write(`\nProposed changes (${allProposals.length}):\n`);
allProposals.forEach((p) => {
  process.stdout.write(`  ${p.file}:${p.line}  [${p.kind}]  ${p.oldToken} -> ${p.newToken}\n`);
});

if (collisions.length > 0) {
  process.stderr.write("\nCOLLISIONS — distinct source tokens map to one target (NOT applied):\n");
  collisions.forEach(([target, sources]) => {
    process.stderr.write(`  ${[...sources].sort().join(", ")} -> ${target}\n`);
  });
  process.stderr.write("\nResolve collisions before --apply.\n");
}

if (APPLY) {
  if (collisions.length > 0) {
    process.stderr.write("\nRefusing to --apply while collisions exist.\n");
    process.exit(1);
  }
  const touched = files.filter((file) => {
    const original = readFileSync(file, "utf8");
    const rewritten = applyTo(original);
    if (rewritten !== original) {
      writeFileSync(file, rewritten, "utf8");
      return true;
    }
    return false;
  });
  process.stdout.write(`\nApplied to ${touched.length} file(s).\n`);
} else {
  process.stdout.write(
    `\nSummary: ${allProposals.length} change(s) across ${tokenMap.length} token(s) in ${files.length} scanned file(s). Dry-run — nothing written. Re-run with --apply to write.\n`,
  );
}

process.exit(0);
