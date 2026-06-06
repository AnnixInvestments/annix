#!/usr/bin/env node
// READ-ONLY: show Orbit prod tier capabilities (match caps per plan) and job
// market source ingestion status.
import dns from "node:dns";
import { readFileSync } from "node:fs";
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

const dbName = process.argv[2] || "orbit_production";
const client = new MongoClient(env.ORBIT_MONGODB_URI || env.MONGODB_URI, {
  serverSelectionTimeoutMS: 20000,
});
await client.connect();
const db = client.db(dbName);

console.log(`\n=== ${dbName} tier capabilities (maxJobResults: null = unlimited) ===`);
const tiers = await db.collection("cv_assistant_tier_capabilities").find({}).toArray();
for (const t of tiers) {
  console.log(
    `  ${(t.tier || t._id || "?").toString().padEnd(16)} maxJobResults=${t.maxJobResults === null || t.maxJobResults === undefined ? "UNLIMITED" : t.maxJobResults}`,
  );
}

console.log(`\n=== ${dbName} job market sources ===`);
const sources = await db.collection("cv_assistant_job_market_sources").find({}).toArray();
for (const s of sources) {
  const last = s.lastIngestedAt ? new Date(s.lastIngestedAt).toISOString() : "never";
  console.log(
    `  id=${String(s.id ?? s._id).padEnd(4)} ${String(s.provider || s.name || "?").padEnd(14)} active=${s.active} reqToday=${s.requestsToday ?? "?"} lastIngested=${last} cats=${(s.categories || []).length}`,
  );
}

const ads = await db.collection("cv_assistant_external_jobs").countDocuments({});
const delisted = await db
  .collection("cv_assistant_external_jobs")
  .countDocuments({ delisted: true });
console.log(`\n  external jobs: total=${ads} delisted=${delisted} visible=${ads - delisted}`);
await client.close();
process.exit(0);
