#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, "..");
const TIMEOUT_MS = 30_000;

const [, , guidePath, ...triggerFiles] = process.argv;

if (!guidePath || triggerFiles.length === 0) {
  console.warn("usage: draft-howto-update.ts <guide-path> <staged-file> [<staged-file>...]");
  process.exit(2);
}

const geminiKey = process.env.GEMINI_API_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;
if (!geminiKey && !anthropicKey) {
  console.warn("draft-howto-update: no GEMINI_API_KEY or ANTHROPIC_API_KEY set; skipping.");
  process.exit(1);
}

const guideRaw = readFileSync(guidePath, "utf8");

const stagedDiffs = triggerFiles
  .map((file) => {
    try {
      const diff = execSync(`git diff --cached -- "${file}"`, {
        cwd: REPO_ROOT,
        encoding: "utf8",
        maxBuffer: 4 * 1024 * 1024,
      });
      return { file, diff };
    } catch {
      return { file, diff: "(diff unavailable)" };
    }
  })
  .filter((d) => d.diff && d.diff !== "(diff unavailable)");

if (stagedDiffs.length === 0) {
  console.warn("draft-howto-update: no diffs to inspect; skipping.");
  process.exit(1);
}

const prompt = `You are updating a how-to guide so it stays accurate after a code change.

The guide:
\`\`\`markdown
${guideRaw}
\`\`\`

The staged diff(s) of files this guide tracks (via its frontmatter relatedPaths):
${stagedDiffs.map((d) => `### ${d.file}\n\`\`\`diff\n${d.diff}\n\`\`\``).join("\n\n")}

Return a JSON object with the shape:
{
  "shouldUpdate": boolean,
  "reasoning": string,
  "patchedBody": string | null
}

Rules:
- shouldUpdate = false if the diff doesn't change anything user-visible (refactor, rename, formatting). reasoning explains why; patchedBody = null.
- shouldUpdate = true if a section of the guide is now wrong or missing. patchedBody is the COMPLETE updated guide (frontmatter + body); make minimal edits, preserve voice + structure + headings.
- Do NOT change the frontmatter "lastUpdated" field — the calling script handles that.
- Do NOT add screenshots or links you cannot verify.
- Output ONLY the JSON object, no prose, no markdown fence.`;

const callGemini = async () => {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Gemini ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("Gemini returned no text");
    return text;
  } finally {
    clearTimeout(timer);
  }
};

const callAnthropic = async () => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Anthropic ${res.status}: ${body.slice(0, 200)}`);
    }
    const data = await res.json();
    const text = data?.content?.[0]?.text;
    if (!text) throw new Error("Anthropic returned no text");
    return text;
  } finally {
    clearTimeout(timer);
  }
};

const stripFences = (raw) => {
  return raw
    .trim()
    .replace(/^```(?:json)?\r?\n/i, "")
    .replace(/\r?\n```$/i, "");
};

const main = async () => {
  console.log(`draft-howto-update: drafting update for ${relative(REPO_ROOT, guidePath)}…`);

  let raw;
  try {
    raw = geminiKey ? await callGemini() : await callAnthropic();
  } catch (err) {
    console.warn(`draft-howto-update: API call failed: ${err.message}`);
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(stripFences(raw));
  } catch (err) {
    console.warn(`draft-howto-update: failed to parse model output as JSON (${err.message})`);
    process.exit(1);
  }

  if (!parsed.shouldUpdate) {
    console.log("draft-howto-update: no update needed.");
    if (parsed.reasoning) console.log(`  reasoning: ${parsed.reasoning}`);
    process.exit(1);
  }

  if (typeof parsed.patchedBody !== "string" || parsed.patchedBody.length < 50) {
    console.warn("draft-howto-update: model returned shouldUpdate=true but no usable patchedBody.");
    process.exit(1);
  }

  writeFileSync(guidePath, parsed.patchedBody, "utf8");
  console.log(`draft-howto-update: applied draft to ${relative(REPO_ROOT, guidePath)}.`);
  if (parsed.reasoning) console.log(`  reasoning: ${parsed.reasoning}`);
  console.log("  Review the changes before continuing.");
  process.exit(0);
};

main().catch((err) => {
  console.warn(`draft-howto-update failed: ${err.message}`);
  process.exit(1);
});
