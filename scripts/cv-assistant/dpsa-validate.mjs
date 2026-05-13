#!/usr/bin/env node
/**
 * Validate the DPSA PSVC extraction prompt against a real Public Service
 * Vacancy Circular. Downloads the PDF, extracts text via pdf-parse, runs
 * Gemini extraction, and prints a sample so the operator can spot-check
 * against the source PDF (issue #280).
 *
 * Usage:
 *   GEMINI_API_KEY=... node scripts/cv-assistant/dpsa-validate.mjs \
 *     --url https://www.dpsa.gov.za/dpsa2g/documents/vacancies/2026/PSV%20CIRCULAR%2015%20of%202026.pdf \
 *     --output tmp/dpsa-validation.json
 *
 * Or omit --url to auto-discover the latest circular from
 * https://www.dpsa.gov.za/newsroom/psvc/.
 *
 * Cost: one Gemini chat call against a ~50-100 page PDF. Roughly $0.05-$0.20.
 *
 * The script does not write to the DB.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { argv, exit } from "node:process";

const require = createRequire(import.meta.url);
const pdfParseModule = require("pdf-parse");
const PDFParseCtor =
  pdfParseModule.PDFParse ??
  pdfParseModule.default?.PDFParse ??
  pdfParseModule.default ??
  pdfParseModule;

const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
const PSVC_INDEX_URL = "https://www.dpsa.gov.za/newsroom/psvc/";

const EXTRACTION_PROMPT = `You are extracting vacancy posts from a South African Department of Public Service and Administration (DPSA) Public Service Vacancy Circular (PSVC) PDF.

Return a strict JSON array of objects. Each object MUST use these exact camelCase field names (NOT the uppercase labels from the PDF):

{
  "postNumber":   string,         // e.g. "POST 15/01"
  "title":        string,         // job title, e.g. "Senior Agricultural Economist Ref No: 3/3/1/27/2026"
  "department":   string|null,
  "centre":       string|null,    // location, e.g. "Gauteng: Pretoria"
  "salary":       string|null,    // e.g. "R605 742 per annum (Level 10)"
  "closingDate":  string|null,    // e.g. "22 May 2026"
  "enquiries":    string|null,
  "dutiesSummary":       string|null,  // 2-3 sentence summary, MAX 400 chars
  "requirementsSummary": string|null   // 2-3 sentence summary, MAX 400 chars
}

Rules:
- Use the exact field names above. Do NOT use "POST NUMBER" or "POST TITLE" — use "postNumber" and "title".
- dutiesSummary and requirementsSummary MUST be summaries, not the verbatim PDF text. Hard cap 400 characters each.
- Use null for any missing field.
- Trim whitespace; collapse repeated spaces.
- One object per post. Extract every post you can find.
- Do NOT include any prose, markdown, or explanation outside the JSON array.
- The reference number (e.g. "REF NO: 3/3/1/27/2026") is part of the title — keep it in the title string.

Example output:
[{"postNumber":"POST 15/01","title":"Senior Agricultural Economist Ref No: 3/3/1/27/2026","department":"Department of Agriculture","centre":"Gauteng: Pretoria","salary":"R605 742 per annum (Level 10)","closingDate":"22 May 2026","enquiries":"Mr S Mazibuko Tel No: (012) 319 8189","dutiesSummary":"Monitor SADC FTA + SACU agreement implementation; support T-FTA + AfCFTA negotiations; provide trade analysis on African countries; engage with industry forums.","requirementsSummary":"Grade 12 + 4-year degree in Agricultural Economics; 3 years' relevant experience; knowledge of WTO/SADC/SACU trade frameworks; valid driver's licence."}]

The full text of the circular follows.`;

async function main() {
  const args = parseArgs(argv.slice(2));
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY env var is required.");
    exit(2);
  }

  const pdfUrl = args.url ?? (await discoverLatestCircularUrl());
  if (!pdfUrl) {
    console.error("No PSVC URL provided and discovery failed.");
    exit(1);
  }
  log(`Validating against: ${pdfUrl}`);

  log("Downloading PDF…");
  const buffer = await downloadPdf(pdfUrl);
  log(`Downloaded ${buffer.length.toLocaleString()} bytes`);

  log("Extracting text…");
  const text = await extractText(buffer);
  if (!text || text.length < 200) {
    console.error(`PDF text too short (${text.length} chars) — may be scan/OCR-only`);
    exit(1);
  }
  log(`Extracted ${text.length.toLocaleString()} chars`);

  log("Calling Gemini…");
  const start = Date.now();
  const raw = await runGemini(text, pdfUrl, apiKey);
  const elapsed = Date.now() - start;
  log(`Gemini returned in ${(elapsed / 1000).toFixed(1)}s`);

  const vacancies = parseJsonArray(raw);
  if (vacancies === null) {
    console.error("Gemini response was not a valid JSON array. Raw response:");
    console.error(raw.slice(0, 2000));
    exit(1);
  }
  log(`Parsed ${vacancies.length} vacancies`);

  const summary = summarise(vacancies);
  printSummary(summary, vacancies);

  if (args.output) {
    const outputPath = resolve(args.output);
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(
      outputPath,
      JSON.stringify({ pdfUrl, model: GEMINI_MODEL, vacancies, summary }, null, 2),
      "utf8",
    );
    log(`Wrote ${outputPath}`);
  }
}

function parseArgs(args) {
  const out = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--url") {
      out.url = args[i + 1];
      i++;
    } else if (args[i] === "--output") {
      out.output = args[i + 1];
      i++;
    }
  }
  return out;
}

async function discoverLatestCircularUrl() {
  try {
    const indexHtml = await (await fetch(PSVC_INDEX_URL)).text();
    const circulars = [
      ...indexHtml.matchAll(/href="([^"]*\/newsroom\/psvc\/circular-(\d+)-of-(\d+)\/?[^"]*)"/gi),
    ]
      .map((m) => ({ href: m[1], year: Number(m[3]), number: Number(m[2]) }))
      .sort((a, b) => b.year - a.year || b.number - a.number);
    if (circulars.length === 0) return null;
    const pageHref = circulars[0].href;
    const pageUrl = pageHref.startsWith("http")
      ? pageHref
      : `https://www.dpsa.gov.za${pageHref.startsWith("/") ? "" : "/"}${pageHref}`;
    const pageHtml = await (await fetch(pageUrl)).text();
    const pdfMatch = pageHtml.match(/href="([^"]+\.pdf)"/i);
    if (!pdfMatch) return null;
    const pdfHref = pdfMatch[1];
    if (pdfHref.startsWith("http")) return pdfHref;
    if (pdfHref.startsWith("/")) return `https://www.dpsa.gov.za${pdfHref}`;
    return `https://www.dpsa.gov.za/${pdfHref}`;
  } catch (err) {
    log(`Discovery error: ${err instanceof Error ? err.message : String(err)}`);
    return null;
  }
}

async function downloadPdf(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} downloading PDF`);
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function extractText(buffer) {
  const parser = new PDFParseCtor({ data: buffer });
  const result = await parser.getText();
  return result?.text || "";
}

async function runGemini(text, pdfUrl, apiKey) {
  const trimmed = text.length > 200_000 ? text.slice(0, 200_000) : text;
  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: `${EXTRACTION_PROMPT}\n\nSource: ${pdfUrl}\n\n${trimmed}` }],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 65_000,
      responseMimeType: "application/json",
    },
  };
  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini HTTP ${res.status}: ${errText.slice(0, 500)}`);
  }
  const data = await res.json();
  const candidate = data?.candidates?.[0];
  const part = candidate?.content?.parts?.[0]?.text ?? "";
  return part;
}

function parseJsonArray(raw) {
  const trimmed = raw.trim();
  const cleaned = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```\s*$/i, "");
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed;
    return null;
  } catch {
    return null;
  }
}

function summarise(vacancies) {
  const total = vacancies.length;
  const missingPostNumber = vacancies.filter((v) => !v?.postNumber).length;
  const missingTitle = vacancies.filter((v) => !v?.title).length;
  const missingCentre = vacancies.filter((v) => !v?.centre).length;
  const missingSalary = vacancies.filter((v) => !v?.salary).length;
  const missingClosingDate = vacancies.filter((v) => !v?.closingDate).length;
  const missingRequirements = vacancies.filter((v) => !v?.requirementsSummary).length;
  const missingDuties = vacancies.filter((v) => !v?.dutiesSummary).length;
  const duplicates = (() => {
    const seen = new Set();
    let dupes = 0;
    for (const v of vacancies) {
      if (v?.postNumber) {
        if (seen.has(v.postNumber)) dupes++;
        seen.add(v.postNumber);
      }
    }
    return dupes;
  })();
  return {
    total,
    missingPostNumber,
    missingTitle,
    missingCentre,
    missingSalary,
    missingClosingDate,
    missingRequirements,
    missingDuties,
    duplicates,
  };
}

function printSummary(summary, vacancies) {
  console.log("\n=== Summary ===");
  console.log(`Total vacancies: ${summary.total}`);
  console.log(`Missing postNumber: ${summary.missingPostNumber}`);
  console.log(`Missing title:      ${summary.missingTitle}`);
  console.log(`Missing centre:     ${summary.missingCentre}`);
  console.log(`Missing salary:     ${summary.missingSalary}`);
  console.log(`Missing closing:    ${summary.missingClosingDate}`);
  console.log(`Missing requirements: ${summary.missingRequirements}`);
  console.log(`Missing duties:     ${summary.missingDuties}`);
  console.log(`Duplicate postNumbers: ${summary.duplicates}`);
  console.log("\n=== First 10 vacancies (sanity check vs PDF) ===");
  for (const v of vacancies.slice(0, 10)) {
    const post = (v?.postNumber ?? "?").padEnd(14);
    const title = (v?.title ?? "?").slice(0, 60);
    const centre = (v?.centre ?? "?").slice(0, 40);
    console.log(`  ${post} | ${title} | ${centre}`);
  }
}

function log(message) {
  process.stderr.write(`[${new Date().toISOString()}] ${message}\n`);
}

main().catch((err) => {
  console.error(err);
  exit(1);
});
