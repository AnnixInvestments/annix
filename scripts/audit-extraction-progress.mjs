#!/usr/bin/env node
/**
 * Long-Running Operations audit (see CLAUDE.md → "Long-Running Operations").
 *
 * Every user-triggered document extraction / AI-analyze / re-extract / reanalyze
 * action MUST surface the branded ExtractionProgressModal — via
 * `useExtractionProgress` (one-shot) or `useAdaptiveExtractionProgress`
 * (`runBulk`). A button stuck on a spinner with no popup timer is a directive
 * violation.
 *
 * This script flags extraction/analyze call-sites that have NO progress trigger
 * nearby. It is a HEURISTIC AID, not a hard gate — it never exits non-zero, so
 * it can run as a non-blocking pre-commit reminder. Sessions should treat any
 * hit as "go wire the progress modal here (or confirm it's a sub-3s op)".
 *
 * Usage:
 *   node scripts/audit-extraction-progress.mjs [file ...]   # scan given files (hook mode)
 *   node scripts/audit-extraction-progress.mjs              # scan the whole frontend app tree
 */

import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

// How many lines around a call we look in for a progress trigger (≈ one handler).
const PROXIMITY = 70;

// API invocations that do real document extraction / AI analysis (the >3s ops).
// Matches `<x>Client.extract*/analyze*/reanalyze*(...)` and `<x>Mutation.mutateAsync`
// where the mutation name itself signals extraction/analysis.
const EXTRACTION_CALL =
  /(?:[A-Za-z]*[Cc]lient\.(?:extract|analyze|reanalyze|reExtract)\w*\s*\(|\b\w*(?:[Ee]xtract|[Aa]nalyze|[Rr]eanalyze)\w*Mutation\.mutateAsync\s*\()/;

// Evidence that progress feedback is wired in this area. The branded modal
// (showExtraction / runBulk) is preferred, but a few analyze-and-create flows
// drive a bespoke step-progress popup (NixProcessingPopup / setAnalysisProgress)
// which also satisfies the "must show progress feedback" rule — recognise those
// so the audit only flags call-sites with NO feedback at all.
const PROGRESS_TRIGGER =
  /\b(?:showExtraction|withExtractionProgress|runBulk|runAdaptiveBulk|NixProcessingPopup|set(?:Analysis|Analyze)Progress|set(?:Analysis|Analyze)Status)\b/;

// Files that are the progress infra itself, or this auditor — never flag them.
const SKIP_FILE =
  /(ExtractionProgressModal|useAdaptiveExtractionProgress|audit-extraction-progress)/;

function targetFiles() {
  const args = process.argv.slice(2);
  if (args.length > 0) {
    return args.filter((f) => f.endsWith(".tsx"));
  }
  const out = execSync("git ls-files annix-frontend/src/app", { encoding: "utf8" });
  return out.split("\n").filter((f) => f.endsWith(".tsx"));
}

const flagged = [];
for (const file of targetFiles()) {
  const rel = file.replace(/\\/g, "/");
  if (SKIP_FILE.test(rel)) continue;
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  if (!EXTRACTION_CALL.test(text)) continue;
  const lines = text.split("\n");
  lines.forEach((line, i) => {
    if (!EXTRACTION_CALL.test(line)) return;
    const start = Math.max(0, i - PROXIMITY);
    const end = Math.min(lines.length, i + PROXIMITY);
    const windowText = lines.slice(start, end).join("\n");
    if (!PROGRESS_TRIGGER.test(windowText)) {
      flagged.push({ file: rel, line: i + 1, snippet: line.trim().slice(0, 110) });
    }
  });
}

if (flagged.length > 0) {
  const label = "\x1b[33m"; // yellow
  const reset = "\x1b[0m";
  console.warn(
    `\n${label}⚠ Long-Running Operations audit — ${flagged.length} extraction/analyze call-site(s) with NO nearby progress modal:${reset}`,
  );
  for (const f of flagged) {
    console.warn(`  ${f.file}:${f.line}  ${f.snippet}`);
  }
  console.warn(
    `\n  Wrap each with useExtractionProgress (one-shot) or useAdaptiveExtractionProgress.runBulk (bulk),\n  so the branded ExtractionProgressModal (popup timer) shows. See CLAUDE.md → "Long-Running Operations".\n  (Heuristic, non-blocking — if a hit is genuinely a sub-3s op, leave it.)\n`,
  );
} else if (process.argv.length <= 2) {
  // Only chirp on a clean full scan, not on every staged-file hook run.
  console.log("Long-Running Operations audit: no un-wrapped extraction/analyze call-sites found.");
}

// Never block — this is a reminder, not a gate.
process.exit(0);
