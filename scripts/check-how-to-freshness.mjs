#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");
const GUIDES_DIR = join(
  REPO_ROOT,
  "annix-frontend",
  "src",
  "app",
  "stock-control",
  "how-to",
  "guides",
);

const parseFrontmatter = (raw) => {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const data = {};
  match[1].split(/\r?\n/).forEach((line) => {
    const kv = line.match(/^([a-zA-Z_][\w-]*):\s*(.*)$/);
    if (!kv) return;
    const key = kv[1];
    const value = kv[2].trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      const inner = value.slice(1, -1).trim();
      data[key] =
        inner.length === 0 ? [] : inner.split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
    } else {
      data[key] = value.replace(/^["']|["']$/g, "");
    }
  });
  return data;
};

const lastCommitDate = (path) => {
  try {
    const out = execSync(`git log -1 --format=%cs -- "${path}"`, {
      cwd: REPO_ROOT,
      encoding: "utf8",
    }).trim();
    return out || null;
  } catch {
    return null;
  }
};

const stale = [];

readdirSync(GUIDES_DIR)
  .filter((f) => f.endsWith(".md"))
  .forEach((file) => {
    const raw = readFileSync(join(GUIDES_DIR, file), "utf8");
    const fm = parseFrontmatter(raw);
    const guideUpdated = fm.lastUpdated || "0000-00-00";
    const related = Array.isArray(fm.relatedPaths) ? fm.relatedPaths : [];

    const newerPaths = related
      .map((p) => ({ path: p, date: lastCommitDate(p) }))
      .filter((r) => r.date && r.date > guideUpdated);

    if (newerPaths.length > 0) {
      stale.push({
        guide: file,
        guideUpdated,
        newerPaths,
      });
    }
  });

if (stale.length === 0) {
  console.log("How To guides are fresh.");
  process.exit(0);
}

console.warn("");
console.warn("WARNING: How To guides may be stale:");
console.warn("");
stale.forEach((s) => {
  console.warn(`  ${s.guide} (lastUpdated ${s.guideUpdated})`);
  s.newerPaths.forEach((p) => {
    console.warn(`    -> ${p.path} changed ${p.date}`);
  });
});
console.warn("");
console.warn(
  "Review the guides above and bump their lastUpdated date if the content still matches.",
);

process.exit(0);
