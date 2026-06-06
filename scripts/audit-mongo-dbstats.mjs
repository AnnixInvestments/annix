#!/usr/bin/env node
import dns from "node:dns";
import { readFileSync } from "node:fs";
// READ-ONLY: dbStats per database on the Orbit cluster to expose logical
// dataSize vs physical storageSize (reclaimable WiredTiger bloat).
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
const MB = (b) => (b / 1024 / 1024).toFixed(1).padStart(7) + " MB";

async function run(label, uri) {
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 20000 });
  await client.connect();
  const { databases } = await client.db().admin().listDatabases();
  console.log(`\n==== ${label} ====`);
  console.log(
    "  db".padEnd(20) +
      "dataSize".padStart(12) +
      "storage(disk)".padStart(15) +
      "indexSize".padStart(12) +
      "freeReusable".padStart(14),
  );
  let totData = 0,
    totStore = 0,
    totIdx = 0,
    totFree = 0;
  for (const d of databases) {
    if (["admin", "local", "config"].includes(d.name)) continue;
    const s = await client.db(d.name).command({ dbStats: 1, freeStorage: 1 });
    const free = (s.freeStorageSize || 0) + (s.indexFreeStorageSize || 0);
    totData += s.dataSize || 0;
    totStore += s.storageSize || 0;
    totIdx += s.indexSize || 0;
    totFree += free;
    console.log(
      "  " +
        d.name.padEnd(18) +
        MB(s.dataSize || 0) +
        MB(s.storageSize || 0) +
        MB(s.indexSize || 0) +
        MB(free),
    );
  }
  console.log("  " + "TOTAL".padEnd(18) + MB(totData) + MB(totStore) + MB(totIdx) + MB(totFree));
  console.log(`  -> physical on disk (storage+index) = ${MB(totStore + totIdx)} of 512 MB cap`);
  console.log(`  -> reclaimable if compacted          = ${MB(totFree)}`);
  await client.close();
}

await run("ORBIT CLUSTER", env.ORBIT_MONGODB_URI || env.MONGODB_URI);
await run("MAIN CLUSTER", env.MONGODB_URI);
process.exit(0);
