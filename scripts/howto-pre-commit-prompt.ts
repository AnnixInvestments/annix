#!/usr/bin/env node
import { execSync, spawn, spawnSync } from "node:child_process";
import {
  closeSync,
  createReadStream,
  createWriteStream,
  existsSync,
  openSync,
  readdirSync,
  readFileSync,
  unlinkSync,
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

const gitPath = (name) => {
  try {
    const out = execSync(`git rev-parse --git-path ${name}`, {
      cwd: REPO_ROOT,
      encoding: "utf8",
    }).trim();
    return resolve(REPO_ROOT, out);
  } catch {
    return resolve(REPO_ROOT, ".git", name);
  }
};

const SKIP_REASONS_FILE = gitPath("HOWTO_SKIP_REASONS");

const clearSkipReasonsFile = () => {
  try {
    if (existsSync(SKIP_REASONS_FILE)) unlinkSync(SKIP_REASONS_FILE);
  } catch (err) {
    console.error(`could not clear stale skip-reasons file: ${err.message}`);
  }
};

clearSkipReasonsFile();

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

const discoverGuideDirs = () =>
  safeReaddir(APP_DIR)
    .filter((entry) => entry.isDirectory())
    .map((entry) => resolve(APP_DIR, entry.name, "how-to", "guides"))
    .filter((dir) => safeReaddir(dir).length > 0);

const discoverGuides = () =>
  discoverGuideDirs().flatMap((dir) =>
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
      // Multiline YAML list: collect the following "- item" lines.
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

const guideMatches = (guideRelatedPaths, stagedPath) =>
  guideRelatedPaths.find((rp) => stagedPath === rp || stagedPath.startsWith(`${rp}/`));

const affected = discoverGuides().flatMap((guidePath) => {
  const raw = readFileSync(guidePath, "utf8");
  const fm = parseFrontmatter(raw);
  const related = Array.isArray(fm.relatedPaths) ? fm.relatedPaths : [];
  const triggers = stagedFiles
    .map((staged) => ({ staged, match: guideMatches(related, staged) }))
    .filter((r) => r.match);
  if (triggers.length === 0) return [];
  return [
    {
      guidePath,
      relativeGuidePath: relative(REPO_ROOT, guidePath),
      lastUpdated: fm.lastUpdated || "(unset)",
      triggers,
    },
  ];
});

if (affected.length === 0) {
  process.exit(0);
}

const ttyAvailable = (() => {
  try {
    const fd = openSync("/dev/tty", "r");
    closeSync(fd);
    return true;
  } catch {
    return false;
  }
})();

if (!ttyAvailable) {
  // No interactive terminal (automated/agent/CI commit) — there is nothing the
  // committer can action at this point, so warn rather than block. The guardrail
  // is the interactive prompt below (for humans) plus CLAUDE.md's "Automatic How
  // To Creation" rule and the freshness audit; a hard block here only ever gets
  // bypassed with HOWTO_HOOK=skip, training everyone to reflex-skip.
  console.error("");
  console.error("How-To reminder: staged changes touch files tracked by these guide(s).");
  console.error("Update them in this commit if the documented workflow actually changed:");
  console.error("");
  affected.forEach((a) => {
    console.error(`  ${a.relativeGuidePath} (lastUpdated ${a.lastUpdated})`);
    a.triggers.slice(0, 3).forEach((t) => console.error(`    triggered by: ${t.staged}`));
  });
  console.error("");
  console.error("(non-blocking: no TTY to prompt — see CLAUDE.md 'Automatic How To Creation')");
  console.error("");
  process.exit(0);
}

const stdinTty = createReadStream("/dev/tty");
const stdoutTty = createWriteStream("/dev/tty");
const rl = createInterface({ input: stdinTty, output: stdoutTty, terminal: true });

const ask = (q) => new Promise((res) => rl.question(q, (answer) => res(answer)));

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

const draftWithClaude = (guidePath, triggers) => {
  const draftScript = resolve(SCRIPT_DIR, "draft-howto-update.ts");
  return new Promise((res) => {
    const child = spawn("node", [draftScript, guidePath, ...triggers.map((t) => t.staged)], {
      cwd: REPO_ROOT,
      stdio: "inherit",
    });
    child.on("close", (code) => res(code === 0));
  });
};

const recordSkipReason = (relativeGuidePath, reason) => {
  const line = `${relativeGuidePath}: ${reason}\n`;
  try {
    const prev = existsSync(SKIP_REASONS_FILE) ? readFileSync(SKIP_REASONS_FILE, "utf8") : "";
    writeFileSync(SKIP_REASONS_FILE, prev + line, "utf8");
  } catch (err) {
    stdoutTty.write(`  WARN: could not write skip reason: ${err.message}\n`);
  }
};

const askReason = async () => {
  const MAX_ATTEMPTS = 5;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const reason = (await ask("  Reason for skipping (one line, required): ")).trim();
    if (reason.length > 0) return reason;
    stdoutTty.write("  (a reason is required — try again or Ctrl-C to abort the commit)\n");
  }
  throw new Error("no skip reason provided after multiple attempts");
};

const askAction = async (options, draftAvailable) => {
  const MAX_ATTEMPTS = 5;
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const action = (await ask(`Action ${options}: `)).trim().toLowerCase();
    if (action === "edit" || action === "e") return "edit";
    if (action === "bump" || action === "b") return "bump";
    if (action === "skip" || action === "s") return "skip";
    if ((action === "draft" || action === "d") && draftAvailable) return "draft";
    stdoutTty.write(`  unknown action "${action}" — pick one of ${options}\n`);
  }
  throw new Error("no valid action chosen after multiple attempts");
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
  const action = await askAction(options, draftAvailable);

  if (action === "edit") {
    await openInEditor(a.guidePath);
    if (bumpLastUpdated(a.guidePath)) {
      stdoutTty.write(`  → lastUpdated bumped to ${todayISO()}\n`);
    }
    stageGuide(a.guidePath);
    stdoutTty.write("  → re-staged\n");
    return;
  }
  if (action === "bump") {
    if (bumpLastUpdated(a.guidePath)) {
      stdoutTty.write(`  → lastUpdated bumped to ${todayISO()}\n`);
    }
    stageGuide(a.guidePath);
    stdoutTty.write("  → re-staged\n");
    return;
  }
  if (action === "draft") {
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
  const reason = await askReason();
  recordSkipReason(a.relativeGuidePath, reason);
  stdoutTty.write("  → skip recorded (will be appended as Howto-Skip trailer)\n");
};

const main = async () => {
  stdoutTty.write("\n");
  stdoutTty.write(`Found ${affected.length} how-to guide(s) affected by staged changes.\n`);
  stdoutTty.write("Set HOWTO_HOOK=skip in your environment to bypass entirely.\n");

  for (const a of affected) {
    await handleGuide(a);
  }

  rl.close();
  stdoutTty.end();
  stdinTty.destroy();
};

main().catch((err) => {
  console.error(`\nCOMMIT BLOCKED: how-to pre-commit prompt failed: ${err.message}`);
  clearSkipReasonsFile();
  process.exit(1);
});
