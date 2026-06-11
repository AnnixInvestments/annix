#!/usr/bin/env node
// READ-ONLY embedding quantisation evaluation. Pulls the live orbit_test job
// embeddings (float32 binary), quantises them to int8 IN MEMORY (two schemes),
// and compares match quality against the float32 baseline. Writes NOTHING.
//
// Metrics:
//   - reconstruction fidelity: cosine(original float32, dequantised int8)
//   - ranking fidelity: for many query vectors, top-K neighbours under int8 vs
//     float32 — recall@K, mean score error, and how often the #1 match changes.
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
const QUERIES = 300; // deterministic sample of job vectors used as queries
const KS = [10, 50, 100];

function bufFrom(raw) {
  if (Buffer.isBuffer(raw)) return raw;
  if (raw && Buffer.isBuffer(raw.buffer)) return raw.buffer;
  return null;
}

function decodeFloat32(raw) {
  const buf = bufFrom(raw);
  if (!buf || buf.length % 4 !== 0) return null;
  // BSON buffers can be unaligned slices — copy into a fresh aligned ArrayBuffer.
  const ab = new ArrayBuffer(buf.length);
  new Uint8Array(ab).set(buf);
  const f = new Float32Array(ab);
  return f.length === DIM ? f : null;
}

function norm(vec) {
  let s = 0;
  for (let i = 0; i < vec.length; i++) s += vec[i] * vec[i];
  return Math.sqrt(s);
}

function cosine(a, na, b, nb) {
  if (na === 0 || nb === 0) return 0;
  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];
  return dot / (na * nb);
}

// int8 with one global scale shared by every vector (cosine-invariant to the
// common scale; simplest to store — no per-row scale needed).
function quantiseGlobal(vectors, scale) {
  return vectors.map((v) => {
    const out = new Float32Array(DIM);
    for (let i = 0; i < DIM; i++) {
      let q = Math.round((v[i] / scale) * 127);
      if (q > 127) q = 127;
      if (q < -127) q = -127;
      out[i] = (q * scale) / 127; // dequantised
    }
    return out;
  });
}

// int8 with a per-vector scale (each row uses its own max — best resolution).
function quantisePerVector(vectors) {
  return vectors.map((v) => {
    let mx = 0;
    for (let i = 0; i < DIM; i++) mx = Math.max(mx, Math.abs(v[i]));
    const scale = mx === 0 ? 1 : mx;
    const out = new Float32Array(DIM);
    for (let i = 0; i < DIM; i++) {
      let q = Math.round((v[i] / scale) * 127);
      if (q > 127) q = 127;
      if (q < -127) q = -127;
      out[i] = (q * scale) / 127;
    }
    return out;
  });
}

function topK(qv, qn, corpus, norms, k, skipIdx) {
  const idx = [];
  const sc = [];
  for (let j = 0; j < corpus.length; j++) {
    if (j === skipIdx) continue;
    const s = cosine(qv, qn, corpus[j], norms[j]);
    if (idx.length < k) {
      idx.push(j);
      sc.push(s);
    } else {
      let minPos = 0;
      for (let p = 1; p < k; p++) if (sc[p] < sc[minPos]) minPos = p;
      if (s > sc[minPos]) {
        sc[minPos] = s;
        idx[minPos] = j;
      }
    }
  }
  return new Set(idx);
}

const client = new MongoClient(env.ORBIT_MONGODB_URI || env.MONGODB_URI, {
  serverSelectionTimeoutMS: 20000,
});
await client.connect();
console.log(`Reading embeddings from ${DB}.cv_assistant_external_jobs (read-only)...`);
const docs = await client
  .db(DB)
  .collection("cv_assistant_external_jobs")
  .find({ embedding: { $ne: null } }, { projection: { embedding: 1 } })
  .toArray();
await client.close();

const base = [];
for (const d of docs) {
  const v = decodeFloat32(d.embedding);
  if (v) base.push(v);
}
console.log(`Decoded ${base.length} float32 vectors of dim ${DIM}.`);
if (base.length < 200) {
  console.log("Not enough vectors to evaluate. Ingest more jobs and retry.");
  process.exit(0);
}

// Global scale = max abs component across the whole corpus (no clipping).
let globalMax = 0;
for (const v of base) for (let i = 0; i < DIM; i++) globalMax = Math.max(globalMax, Math.abs(v[i]));

const schemes = {
  "int8-global": quantiseGlobal(base, globalMax),
  "int8-pervec": quantisePerVector(base),
};

const baseNorms = base.map(norm);

// 1) Reconstruction fidelity (how faithfully each file reads back).
console.log("\n=== Reconstruction fidelity: cosine(original, dequantised int8) ===");
for (const [name, rec] of Object.entries(schemes)) {
  const cs = base.map((v, i) => cosine(v, baseNorms[i], rec[i], norm(rec[i])));
  cs.sort((a, b) => a - b);
  const mean = cs.reduce((s, x) => s + x, 0) / cs.length;
  const pct = (p) => cs[Math.floor((p / 100) * (cs.length - 1))];
  console.log(
    `  ${name.padEnd(12)} mean=${mean.toFixed(6)}  min=${cs[0].toFixed(6)}  p1=${pct(1).toFixed(6)}  p50=${pct(50).toFixed(6)}`,
  );
}

// 2) Ranking fidelity vs float32 ground truth.
const step = Math.max(1, Math.floor(base.length / QUERIES));
const queryIdx = [];
for (let i = 0; i < base.length && queryIdx.length < QUERIES; i += step) queryIdx.push(i);
console.log(`\n=== Ranking fidelity: ${queryIdx.length} query vectors, corpus ${base.length} ===`);

const recNorms = {};
for (const [name, rec] of Object.entries(schemes)) recNorms[name] = rec.map(norm);

for (const k of KS) {
  const results = { "int8-global": { recall: 0, top1: 0 }, "int8-pervec": { recall: 0, top1: 0 } };
  for (const q of queryIdx) {
    const truthSet = topK(base[q], baseNorms[q], base, baseNorms, k, q);
    const truthArr = [...truthSet];
    for (const name of Object.keys(schemes)) {
      const rec = schemes[name];
      const rn = recNorms[name];
      const got = topK(rec[q], rn[q], rec, rn, k, q);
      let overlap = 0;
      for (const id of truthSet) if (got.has(id)) overlap++;
      results[name].recall += overlap / k;
      // top-1 agreement: is float32's #1 neighbour still in int8's set? (k>=1)
      if (got.has(truthArr[0] ?? -1)) results[name].top1 += 1;
    }
  }
  const n = queryIdx.length;
  console.log(`  K=${String(k).padStart(3)}:`);
  for (const name of Object.keys(schemes)) {
    console.log(
      `    ${name.padEnd(12)} recall@${k}=${((results[name].recall / n) * 100).toFixed(2)}%   float32 #1 retained=${((results[name].top1 / n) * 100).toFixed(2)}%`,
    );
  }
}

console.log("\nDone. (No data was written.)");
process.exit(0);
