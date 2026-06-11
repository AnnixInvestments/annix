#!/usr/bin/env node
// READ-ONLY latency harness comparing the user-facing return time of:
//   - preload feed read (pre-scored matches + job display fields)
//   - matching/rank compute over the corpus, float32 vs int8
//   - on-demand cold: provider fetch + live embedding (one real Gemini call)
// Writes nothing. Makes ONE Gemini embedding call to time it.
import dns from "node:dns";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(new URL("../annix-backend/package.json", import.meta.url));
const { MongoClient } = require("mongoose").mongo;
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const text = readFileSync(new URL("../annix-backend/.env", import.meta.url), "utf8");
const env = {};
for (const l of text.split(/\r?\n/)) {
  const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
}
const DB = process.argv[2] || "orbit_test";
const DIM = 768;
const ms = (n) => `${n.toFixed(1)} ms`;

function decodeF32(raw) {
  const buf = Buffer.isBuffer(raw) ? raw : raw?.buffer;
  if (!buf || buf.length % 4 !== 0) return null;
  const ab = new ArrayBuffer(buf.length);
  new Uint8Array(ab).set(buf);
  const f = new Float32Array(ab);
  return f.length === DIM ? f : null;
}
function norm(v) {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += v[i] * v[i];
  return Math.sqrt(s);
}
function cosine(a, na, b, nb) {
  let d = 0;
  for (let i = 0; i < a.length; i++) d += a[i] * b[i];
  return na && nb ? d / (na * nb) : 0;
}
function toInt8(v) {
  let mx = 0;
  for (let i = 0; i < DIM; i++) mx = Math.max(mx, Math.abs(v[i]));
  const s = mx || 1;
  const out = new Float32Array(DIM);
  for (let i = 0; i < DIM; i++) {
    let q = Math.round((v[i] / s) * 127);
    if (q > 127) q = 127;
    if (q < -127) q = -127;
    out[i] = (q * s) / 127;
  }
  return out;
}

function rank(query, qn, corpus, norms) {
  const scored = corpus.map((v, i) => ({ i, s: cosine(query, qn, v, norms[i]) }));
  scored.sort((a, b) => b.s - a.s);
  return scored.slice(0, 100);
}

const client = new MongoClient(env.ORBIT_MONGODB_URI || env.MONGODB_URI, {
  serverSelectionTimeoutMS: 20000,
});
await client.connect();
const db = client.db(DB);

// 1) Preload feed read: pre-scored matches + display fields (embedding excluded).
let t = performance.now();
const matches = await db
  .collection("cv_assistant_candidate_job_matches")
  .find({})
  .limit(100)
  .toArray();
const jobIds = matches
  .map((m) => m.externalJobId)
  .filter((x) => x != null)
  .slice(0, 100);
const displayJobs = await db
  .collection("cv_assistant_external_jobs")
  .find({ _id: { $in: jobIds } }, { projection: { embedding: 0 } })
  .toArray();
const feedReadMs = performance.now() - t;

// 2) Load corpus embeddings (what the matching job reads).
t = performance.now();
const docs = await db
  .collection("cv_assistant_external_jobs")
  .find({ embedding: { $ne: null } }, { projection: { embedding: 1 } })
  .toArray();
const corpusReadMs = performance.now() - t;

const f32 = [];
for (const d of docs) {
  const v = decodeF32(d.embedding);
  if (v) f32.push(v);
}
const f32Norms = f32.map(norm);
const int8 = f32.map(toInt8);
const int8Norms = int8.map(norm);
const query = f32[0];
const qn = f32Norms[0];

// 3) Rank compute, full corpus (preload rematch) — float32 vs int8, 5 runs avg.
function timeRank(corpus, norms) {
  const runs = 5;
  let total = 0;
  for (let r = 0; r < runs; r++) {
    const s = performance.now();
    rank(query, qn, corpus, norms);
    total += performance.now() - s;
  }
  return total / runs;
}
const f32FullMs = timeRank(f32, f32Norms);
const int8FullMs = timeRank(int8, int8Norms);

// 4) Rank compute over a SMALL fetched set (on-demand ranks ~150 fetched jobs).
const small = f32.slice(0, 150);
const smallN = f32Norms.slice(0, 150);
const sT = performance.now();
for (let r = 0; r < 20; r++) rank(query, qn, small, smallN);
const smallRankMs = (performance.now() - sT) / 20;

await client.close();

// 5) One real Gemini embedding call (on-demand cold enriches fetched jobs).
let geminiMs = null;
if (env.GEMINI_API_KEY) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${env.GEMINI_API_KEY}`;
  const body = {
    model: "models/gemini-embedding-001",
    content: {
      parts: [
        {
          text: "Senior software engineer, Johannesburg, 5 years experience, TypeScript and NestJS.",
        },
      ],
    },
    outputDimensionality: DIM,
  };
  const g = performance.now();
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  geminiMs = performance.now() - g;
  geminiMs = resp.ok ? geminiMs : -geminiMs; // negative flags a non-200
}

console.log(`\n=== Latency harness (${DB}, corpus ${f32.length} jobs) ===`);
console.log("\nPRELOAD (float32/int8) — user feed open:");
console.log(
  `  feed read (100 pre-scored matches + display fields, embedding excluded): ${ms(feedReadMs)}`,
);
console.log("\nMATCHING/RANK COMPUTE (background rematch, or on-demand rank step):");
console.log(`  load ${f32.length} embeddings from Atlas (float32):  ${ms(corpusReadMs)}`);
console.log(`  rank vs FULL corpus (${f32.length}) — float32:  ${ms(f32FullMs)}`);
console.log(`  rank vs FULL corpus (${f32.length}) — int8:     ${ms(int8FullMs)}`);
console.log(`  rank vs SMALL fetched set (150) — float32:  ${ms(smallRankMs)}`);
console.log("\nON-DEMAND COLD — live per search:");
console.log(
  "  provider fetch (measured separately): remotive ~110ms, Adzuna ~0.3-1.0s, Careerjet ~1.3s",
);
if (geminiMs !== null)
  console.log(
    `  Gemini embed ONE job (live call): ${ms(Math.abs(geminiMs))}${geminiMs < 0 ? "  (NON-200 response)" : ""}`,
  );
else console.log("  Gemini embed: no key");
console.log("\nDone. (No data written; one Gemini embed call made for timing.)");
process.exit(0);
