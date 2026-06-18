#!/usr/bin/env node
import dns from "node:dns";
import { readFileSync } from "node:fs";
// READ-ONLY: per-collection physical disk (storageSize + index) and WiredTiger
// reuse for the churny Orbit collections, across all Orbit DBs.
import { createRequire } from "node:module";

const require = createRequire(new URL("../annix-backend/package.json", import.meta.url));
const mongoose = require("mongoose");
const { MongoClient } = mongoose.mongo;
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const text = readFileSync(new URL("../annix-backend/.env", import.meta.url), "utf8");
const env = {};
for (const line of text.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
}
const MB = (b) => `${(b / 1024 / 1024).toFixed(1).padStart(7)}MB`;
const WATCH = [
  "cv_assistant_external_jobs",
  "cv_assistant_candidate_job_matches",
  "cv_assistant_esco_skills",
];

const client = new MongoClient(env.ORBIT_MONGODB_URI || env.MONGODB_URI, {
  serverSelectionTimeoutMS: 20000,
});
await client.connect();
const { databases } = await client.db().admin().listDatabases();
for (const d of databases) {
  if (["admin", "local", "config"].includes(d.name)) continue;
  const db = client.db(d.name);
  console.log(`\n==== ${d.name} ====`);
  console.log(
    "  collection".padEnd(38) +
      "count".padStart(8) +
      "logical".padStart(10) +
      "disk".padStart(10) +
      "idxDisk".padStart(10) +
      "reusable".padStart(10),
  );
  for (const name of WATCH) {
    try {
      const st = await db.command({ collStats: name, scale: 1 });
      const wt = st.wiredTiger?.["block-manager"] || {};
      const reuse = wt["file bytes available for reuse"] || 0;
      console.log(
        "  " +
          name.padEnd(38) +
          String(st.count || 0).padStart(8) +
          MB(st.size || 0).padStart(10) +
          MB(st.storageSize || 0).padStart(10) +
          MB(st.totalIndexSize || 0).padStart(10) +
          MB(reuse).padStart(10),
      );
    } catch (e) {
      console.log(`  ${name.padEnd(38)} (missing: ${e.codeName || e.message})`);
    }
  }
}

// Embedding format sample on prod ads.
const prod = client.db("orbit_production").collection("cv_assistant_external_jobs");
const sample = await prod.findOne({ embedding: { $exists: true, $ne: null } });
if (sample?.embedding != null) {
  const e = sample.embedding;
  const bytes =
    typeof e === "string" ? Buffer.byteLength(e, "utf8") : Buffer.byteLength(JSON.stringify(e));
  const dims = typeof e === "string" ? e.split(",").length : Array.isArray(e) ? e.length : "?";
  console.log(
    `\nembedding sample: type=${typeof e} dims=${dims} storedBytes=${(bytes / 1024).toFixed(1)}KB`,
  );
  console.log(
    `  float32-binary would be ~${((dims * 4) / 1024).toFixed(1)}KB; int8-binary ~${(dims / 1024).toFixed(1)}KB`,
  );
}
await client.close();
process.exit(0);
