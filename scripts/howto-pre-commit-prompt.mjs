#!/usr/bin/env node
import { execSync, spawn, spawnSync } from "node:child_process";
import {
  createReadStream,
  createWriteStream,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");
const APP_DIR = resolve(REPO_ROOT, "annix-frontend", "src", "app");

if (process.env.HOWTO_HOOK === "skip") {
  process.exit(0);
}

const stagedFiles = (() => {
  try {
    const out = execSync("git diff --cached --name-only --diff-filter=ACMR", {
      cwd: REPO_ROOT,
      encoding: "utf8",
    }).trim();
    return out ? out.split(/\r?\n/) : [];
  } catch {
    return [];
  }
})();

if (stagedFiles.length === 0) {
  process.exit(0);
}

const safeReaddir = (path) => {
  try {
    return readdirSync(path, { withFileTypes: true });
  } catch {
    return [];
  }
};

const discoverGuideDirs = () => {
  return safeReaddir(APP_DIR)
    .filter((entry) => entry.isDirectory())
    .map((entry) => resolve(APP_DIR, entry.name, "how-to", "guides"))
    .filter((dir) => safeReaddir(dir).length > 0);
};

const discoverGuides = () => {
  return discoverGuideDirs().flatMap((dir) =>
    safeReaddir(dir)
      .filter((e) => e.isFile() && e.name.endsWith(".md"))
      .map((e) => resolve(dir, e.name)),
  );
};

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

const guideMatches = (guideRelatedPaths, stagedPath) => {
  return guideRelatedPaths.find((rp) => stagedPath === rp || stagedPath.startsWith(`${rp}/`));
};

const affected = [];
discoverGuides().forEach((guidePath) => {
  const raw = readFileSync(guidePath, "utf8");
  const fm = parseFrontmatter(raw);
  const related = Array.isArray(fm.relatedPaths) ? fm.relatedPaths : [];
  const triggers = stagedFiles
    .map((staged) => ({ staged, match: guideMatches(related, staged) }))
    .filter((r) => r.match);
  if (triggers.length > 0) {
    affected.push({
      guidePath,
      relativeGuidePath: relative(REPO_ROOT, guidePath),
      lastUpdated: fm.lastUpdated || "(unset)",
      triggers,
    });
  }
});

if (affected.length === 0) {
  process.exit(0);
}

const ttyAvailable = (() => {
  try {
    const stat = execSync("test -r /dev/tty && echo yes || echo no", {
      cwd: REPO_ROOT,
      encoding: "utf8",
    }).trim();
    return stat === "yes";
  } catch {
    return false;
  }
})();

if (!ttyAvailable) {
  console.warn("");
  console.warn("How-To guides may be affected by your staged changes:");
  affected.forEach((a) => {
    console.warn(`  ${a.relativeGuidePath} (lastUpdated ${a.lastUpdated})`);
    a.triggers.slice(0, 3).forEach((t) => console.warn(`    triggered by: ${t.staged}`));
  });
  console.warn("");
  console.warn("Skipping prompt (no TTY). Set HOWTO_HOOK=skip to silence this warning.");
  process.exit(0);
}

const stdinTty = createReadStream("/dev/tty");
const stdoutTty = createWriteStream("/dev/tty");
const rl = createInterface({ input: stdinTty, output: stdoutTty, terminal: true });

const ask = (q) => new Promise((res) => rl.question(q, (answer) => res(answer.trim())));

const todayISO = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const bumpLastUpdated = (guidePath) => {
  const raw = readFileSync(guidePath, "utf8");
  const today = todayISO();
  const replaced = raw.replace(/^lastUpdated:\s*.*$/m, `lastUpdated: ${today}`);
  if (replaced === raw) return false;
  writeFileSync(guidePath, replaced, "utf8");
  return true;
};

const stageGuide = (guidePath) => {
  spawnSync("git", ["add", relative(REPO_ROOT, guidePath)], { cwd: REPO_ROOT, stdio: "ignore" });
};

const openInEditor = (guidePath) =>
  new Promise((res) => {
    const editor =
      process.env.EDITOR || (spawnSync("which", ["code"]).status === 0 ? "code" : "vim");
    const args =
      editor === "code" ? ["-w", relative(REPO_ROOT, guidePath)] : [relative(REPO_ROOT, guidePath)];
    const child = spawn(editor, args, { cwd: REPO_ROOT, stdio: "inherit" });
    child.on("close", () => res());
  });

const draftWithClaude = async (guidePath, triggers) => {
  const draftScript = resolve(SCRIPT_DIR, "draft-howto-update.mjs");
  return new Promise((res) => {
    const child = spawn("node", [draftScript, guidePath, ...triggers.map((t) => t.staged)], {
      cwd: REPO_ROOT,
      stdio: "inherit",
    });
    child.on("close", (code) => res(code === 0));
  });
};

const handleGuide = async (a) => {
  stdoutTty.write("\n");
  stdoutTty.write(`How-To guide affected: ${a.relativeGuidePath}\n`);
  stdoutTty.write(`  lastUpdated: ${a.lastUpdated}\n`);
  a.triggers
    .slice(0, 5)
    .forEach((t) =>
      stdoutTty.write(`  triggered by: ${t.staged} (matches relatedPath: ${t.match})\n`),
    );
  if (a.triggers.length > 5) {
    stdoutTty.write(`  …and ${a.triggers.length - 5} more\n`);
  }

  const draftAvailable = Boolean(process.env.GEMINI_API_KEY || process.env.ANTHROPIC_API_KEY);
  const options = draftAvailable ? "[edit/bump/skip/draft]" : "[edit/bump/skip]";

  const action = (await ask(`Action ${options}: `)).toLowerCase();

  if (action === "edit" || action === "e") {
    await openInEditor(a.guidePath);
    if (bumpLastUpdated(a.guidePath)) {
      stdoutTty.write(`  → lastUpdated bumped to ${todayISO()}\n`);
    }
    stageGuide(a.guidePath);
    stdoutTty.write("  → re-staged\n");
    return;
  }
  if (action === "bump" || action === "b") {
    if (bumpLastUpdated(a.guidePath)) {
      stdoutTty.write(`  → lastUpdated bumped to ${todayISO()}\n`);
    }
    stageGuide(a.guidePath);
    stdoutTty.write("  → re-staged\n");
    return;
  }
  if ((action === "draft" || action === "d") && draftAvailable) {
    const ok = await draftWithClaude(a.guidePath, a.triggers);
    if (ok) {
      await openInEditor(a.guidePath);
      if (bumpLastUpdated(a.guidePath)) {
        stdoutTty.write(`  → lastUpdated bumped to ${todayISO()}\n`);
      }
      stageGuide(a.guidePath);
      stdoutTty.write("  → re-staged\n");
    } else {
      stdoutTty.write("  → draft skipped (no changes applied)\n");
    }
    return;
  }
  stdoutTty.write("  → skipped (pre-push freshness check will warn)\n");
};

const main = async () => {
  stdoutTty.write("\n");
  stdoutTty.write(`Found ${affected.length} how-to guide(s) affected by staged changes.\n`);
  stdoutTty.write("Set HOWTO_HOOK=skip to bypass entirely.\n");

  for (const a of affected) {
    await handleGuide(a);
  }

  rl.close();
  stdoutTty.end();
  stdinTty.destroy();
};

main().catch((err) => {
  console.warn(`how-to pre-commit prompt failed: ${err.message}`);
  process.exit(0);
});
