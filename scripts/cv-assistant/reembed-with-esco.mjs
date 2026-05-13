#!/usr/bin/env node
/**
 * Re-embed every candidate + external job after the ESCO seed has landed so
 * existing rows pick up the canonical + alt-label expansion.
 *
 * Requires:
 *   DATABASE_URL                 — read-write DB connection
 *   GEMINI_API_KEY               — Gemini API key
 *
 * Sets CV_EMBEDDING_DAILY_CALLS_THRESHOLD=50000 in-process so the cost guard
 * doesn't trip mid-pass (the guard reads env at cron time, this script sets
 * it locally only for documentation).
 *
 * Throttles to 1 row per 100ms. Resumable: marks progress in stderr so a
 * re-run picks up at the right offset by row id.
 */

import { writeSync } from "node:fs";
import { argv, exit, stderr } from "node:process";
import pg from "pg";

const EMBED_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent";
const PER_ROW_DELAY_MS = 100;

async function main() {
  const args = parseArgs(argv.slice(2));
  const databaseUrl = process.env.DATABASE_URL;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!databaseUrl || !apiKey) {
    console.error("DATABASE_URL and GEMINI_API_KEY are required.");
    exit(2);
  }

  const client = new pg.Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const escoMap = await loadEsco(client);
    log(`ESCO: ${escoMap.size} labels loaded`);

    if (!args.skipCandidates) {
      await processCandidates(client, apiKey, escoMap, args.minCandidateId ?? 0);
    }
    if (!args.skipJobs) {
      await processJobs(client, apiKey, escoMap, args.minJobId ?? 0);
    }
  } finally {
    await client.end();
  }
}

function parseArgs(args) {
  const out = { skipCandidates: false, skipJobs: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--skip-candidates") out.skipCandidates = true;
    else if (args[i] === "--skip-jobs") out.skipJobs = true;
    else if (args[i] === "--min-candidate-id") {
      out.minCandidateId = Number(args[i + 1]);
      i++;
    } else if (args[i] === "--min-job-id") {
      out.minJobId = Number(args[i + 1]);
      i++;
    }
  }
  return out;
}

async function loadEsco(client) {
  const res = await client.query(
    'SELECT preferred_label, alt_labels FROM "cv_assistant_esco_skills"',
  );
  const map = new Map();
  for (const row of res.rows) {
    const canonical = row.preferred_label;
    const alts = Array.isArray(row.alt_labels) ? row.alt_labels : [];
    const labels = [canonical, ...alts];
    for (const label of labels) {
      if (!label) continue;
      const key = String(label).toLowerCase().trim();
      if (key.length === 0) continue;
      if (!map.has(key)) {
        map.set(key, { canonical, alts });
      }
    }
  }
  return map;
}

function expand(rawSkills, escoMap) {
  if (!rawSkills || rawSkills.length === 0) return [];
  const out = new Set();
  for (const raw of rawSkills) {
    out.add(raw);
    const hit = escoMap.get(String(raw).toLowerCase().trim());
    if (hit) {
      out.add(hit.canonical);
      for (const alt of hit.alts) out.add(alt);
    }
  }
  return [...out];
}

async function processCandidates(client, apiKey, escoMap, minId) {
  log(`Candidates: starting from id > ${minId}`);
  const res = await client.query(
    `SELECT id, extracted_data, raw_cv_text FROM "cv_assistant_candidates"
       WHERE id > $1 AND embedding IS NOT NULL
       ORDER BY id`,
    [minId],
  );
  log(`Candidates: ${res.rows.length} rows`);

  let processed = 0;
  let failed = 0;
  for (const row of res.rows) {
    try {
      const text = candidateText(row, escoMap);
      if (!text) {
        log(`Candidate ${row.id}: empty text, skipping`);
        continue;
      }
      const embedding = await embed(text, apiKey);
      if (!embedding) {
        failed++;
        continue;
      }
      await client.query(
        `UPDATE "cv_assistant_candidates" SET embedding = $1::vector WHERE id = $2`,
        [`[${embedding.join(",")}]`, row.id],
      );
      processed++;
      if (processed % 25 === 0) log(`Candidates: ${processed} done (last id=${row.id})`);
      await sleep(PER_ROW_DELAY_MS);
    } catch (err) {
      failed++;
      log(`Candidate ${row.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  log(`Candidates done: processed=${processed} failed=${failed}`);
}

async function processJobs(client, apiKey, escoMap, minId) {
  log(`Jobs: starting from id > ${minId}`);
  const res = await client.query(
    `SELECT id, title, company, location_raw, category, description, extracted_skills
       FROM "cv_assistant_external_jobs"
       WHERE id > $1 AND embedding IS NOT NULL
       ORDER BY id`,
    [minId],
  );
  log(`Jobs: ${res.rows.length} rows`);

  let processed = 0;
  let failed = 0;
  for (const row of res.rows) {
    try {
      const text = jobText(row, escoMap);
      if (!text) continue;
      const embedding = await embed(text, apiKey);
      if (!embedding) {
        failed++;
        continue;
      }
      await client.query(
        `UPDATE "cv_assistant_external_jobs" SET embedding = $1::vector WHERE id = $2`,
        [`[${embedding.join(",")}]`, row.id],
      );
      processed++;
      if (processed % 50 === 0) log(`Jobs: ${processed} done (last id=${row.id})`);
      await sleep(PER_ROW_DELAY_MS);
    } catch (err) {
      failed++;
      log(`Job ${row.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  log(`Jobs done: processed=${processed} failed=${failed}`);
}

function candidateText(row, escoMap) {
  const extracted = row.extracted_data;
  if (!extracted) {
    return row.raw_cv_text ? String(row.raw_cv_text).slice(0, 4000) : "";
  }
  const skills = Array.isArray(extracted.skills) ? extracted.skills : [];
  const expanded = expand(skills, escoMap);
  const parts = [
    extracted.summary,
    expanded.length > 0 ? `Skills: ${expanded.join(", ")}` : null,
    Array.isArray(extracted.education) && extracted.education.length > 0
      ? `Education: ${extracted.education.join(", ")}`
      : null,
    Array.isArray(extracted.certifications) && extracted.certifications.length > 0
      ? `Certifications: ${extracted.certifications.join(", ")}`
      : null,
    extracted.experienceYears ? `Experience: ${extracted.experienceYears} years` : null,
  ].filter((part) => Boolean(part));
  return parts.join("\n");
}

function jobText(row, escoMap) {
  const skills = Array.isArray(row.extracted_skills) ? row.extracted_skills : [];
  const expanded = expand(skills, escoMap);
  const parts = [
    row.title,
    row.company ? `Company: ${row.company}` : null,
    row.location_raw ? `Location: ${row.location_raw}` : null,
    row.category ? `Category: ${row.category}` : null,
    row.description ? String(row.description).slice(0, 4000) : null,
    expanded.length > 0 ? `Skills: ${expanded.join(", ")}` : null,
  ].filter((part) => Boolean(part));
  return parts.join("\n");
}

async function embed(text, apiKey) {
  const url = `${EMBED_URL}?key=${apiKey}`;
  const body = {
    model: "models/text-embedding-004",
    content: { parts: [{ text: text.slice(0, 8000) }] },
  };
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    log(`Embedding HTTP ${response.status}: ${await response.text()}`);
    return null;
  }
  const data = await response.json();
  return data?.embedding?.values ?? null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(message) {
  writeSync(stderr.fd, `[${new Date().toISOString()}] ${message}\n`);
}

main().catch((err) => {
  console.error(err);
  exit(1);
});
