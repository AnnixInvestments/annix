#!/usr/bin/env node
// How-To freshness audit (non-blocking, run on demand).
//
// For every how-to guide it answers two questions the pre-commit prompt can't:
//   1. STALE  — has the code behind a guide changed since the guide was last
//               touched? (the documented workflow may have drifted)
//   2. DEAD   — does a guide point at a relatedPath that no longer exists?
//               (a dead trigger means the guide silently never fires)
//
// Usage: node scripts/audit-howto-freshness.mjs
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");
const APP_DIR = resolve(REPO_ROOT, "annix-frontend", "src", "app");

const safeReaddir = (path) => {
  try {
    return readdirSync(path, { withFileTypes: true });
  } catch {
    return [];
  }
};

const discoverGuides = () =>
  safeReaddir(APP_DIR)
    .filter((entry) => entry.isDirectory())
    .map((entry) => resolve(APP_DIR, entry.name, "how-to", "guides"))
    .flatMap((dir) =>
      safeReaddir(dir)
        .filter((e) => e.isFile() && e.name.endsWith(".md"))
        .map((e) => resolve(dir, e.name)),
    );

const parseFrontmatter = (raw) => {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const data = {};
  const lines = match[1].split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const kv = lines[i].match(/^([a-zA-Z_][\w-]*):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    const value = kv[2].trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1).trim();
      data[key] =
        inner.length === 0 ? [] : inner.split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
    } else if (value === "") {
      const items = [];
      let j = i + 1;
      while (j < lines.length && /^\s*-\s+/.test(lines[j])) {
        items.push(
          lines[j]
            .replace(/^\s*-\s+/, "")
            .trim()
            .replace(/^["']|["']$/g, ""),
        );
        j += 1;
      }
      data[key] = items.length > 0 ? items : "";
      i = j - 1;
    } else {
      data[key] = value.replace(/^["']|["']$/g, "");
    }
  }
  return data;
};

const lastCommitISO = (paths) => {
  if (paths.length === 0) return null;
  try {
    const out = execSync(`git log -1 --format=%cI -- ${paths.map((p) => `"${p}"`).join(" ")}`, {
      cwd: REPO_ROOT,
      encoding: "utf8",
    }).trim();
    return out || null;
  } catch {
    return null;
  }
};

const daysBetween = (laterISO, earlierISO) =>
  Math.round((Date.parse(laterISO) - Date.parse(earlierISO)) / 86_400_000);

const rows = discoverGuides().map((guidePath) => {
  const raw = readFileSync(guidePath, "utf8");
  const fm = parseFrontmatter(raw);
  const related = Array.isArray(fm.relatedPaths) ? fm.relatedPaths : [];
  const rel = relative(REPO_ROOT, guidePath).split("\\").join("/");
  const deadPaths = related.filter((p) => !existsSync(resolve(REPO_ROOT, p)));
  const livePaths = related.filter((p) => existsSync(resolve(REPO_ROOT, p)));
  const codeChangedISO = lastCommitISO(livePaths);
  const guideChangedISO = lastCommitISO([relative(REPO_ROOT, guidePath)]);
  const staleDays =
    codeChangedISO && guideChangedISO && Date.parse(codeChangedISO) > Date.parse(guideChangedISO)
      ? daysBetween(codeChangedISO, guideChangedISO)
      : 0;
  return {
    rel,
    lastUpdated: fm.lastUpdated || "(unset)",
    relatedCount: related.length,
    deadPaths,
    staleDays,
    noRelated: related.length === 0,
  };
});

const stale = rows.filter((r) => r.staleDays > 0).sort((a, b) => b.staleDays - a.staleDays);
const dead = rows.filter((r) => r.deadPaths.length > 0);
const noRelated = rows.filter((r) => r.noRelated);

console.log(`How-To freshness audit — ${rows.length} guides\n`);

console.log(`STALE (code changed after the guide was last edited) — ${stale.length}`);
stale.forEach((r) =>
  console.log(`  ${r.staleDays}d behind  ${r.rel}  (lastUpdated ${r.lastUpdated})`),
);
if (stale.length === 0) console.log("  none");

console.log(`\nDEAD relatedPaths (trigger never fires) — ${dead.length}`);
dead.forEach((r) => {
  console.log(`  ${r.rel}`);
  r.deadPaths.forEach((p) => console.log(`      missing: ${p}`));
});
if (dead.length === 0) console.log("  none");

console.log(`\nNO relatedPaths (guide is untracked by the hook) — ${noRelated.length}`);
noRelated.forEach((r) => console.log(`  ${r.rel}`));
if (noRelated.length === 0) console.log("  none");

console.log(
  `\nSummary: ${stale.length} stale, ${dead.length} with dead paths, ${noRelated.length} untracked.`,
);
