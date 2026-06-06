#!/usr/bin/env node

// READ-ONLY MongoDB storage audit. Connects to the main + Orbit clusters,
// lists every database with on-disk size (M0 512MB cap is per-cluster),
// per-collection stats, and samples the heaviest collections for big fields
// (embeddings / base64 / Buffer / oversized docs). No writes.

import dns from "node:dns";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(new URL("../annix-backend/package.json", import.meta.url));
const mongoose = require("mongoose");
const { MongoClient } = mongoose.mongo;

dns.setServers(["8.8.8.8", "1.1.1.1"]);

function loadEnv() {
  const path = new URL("../annix-backend/.env", import.meta.url);
  const text = readFileSync(path, "utf8");
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[m[1]] = v;
  }
  return env;
}

const env = loadEnv();
const MB = (b) => (b / 1024 / 1024).toFixed(1) + " MB";
const KB = (b) => (b / 1024).toFixed(1) + " KB";

async function auditCluster(label, uri, dbFilter) {
  if (!uri) {
    console.log(`\n### ${label}: no URI configured, skipping`);
    return;
  }
  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 20000 });
  await client.connect();
  console.log(`\n==================== ${label} ====================`);
  const admin = client.db().admin();
  const { databases } = await admin.listDatabases();
  const sorted = databases.sort((a, b) => (b.sizeOnDisk || 0) - (a.sizeOnDisk || 0));
  console.log("Databases on this cluster (sizeOnDisk):");
  for (const d of sorted) {
    console.log(`  ${d.name.padEnd(22)} ${MB(d.sizeOnDisk || 0)}`);
  }
  const totalCluster = sorted.reduce((s, d) => s + (d.sizeOnDisk || 0), 0);
  console.log(`  ${"TOTAL CLUSTER".padEnd(22)} ${MB(totalCluster)}  (M0 cap = 512 MB)`);

  const targets = sorted
    .map((d) => d.name)
    .filter((n) => !["admin", "local", "config"].includes(n))
    .filter((n) => (dbFilter ? dbFilter.includes(n) : true));

  for (const dbName of targets) {
    const db = client.db(dbName);
    const cols = await db.listCollections().toArray();
    const rows = [];
    for (const c of cols) {
      try {
        const st = await db.command({ collStats: c.name, scale: 1 });
        rows.push({
          name: c.name,
          count: st.count || 0,
          size: st.size || 0,
          storage: st.storageSize || 0,
          avg: st.avgObjSize || 0,
          indexSize: st.totalIndexSize || 0,
          nindexes: st.nindexes || 0,
        });
      } catch (e) {
        rows.push({ name: c.name, error: String(e.message || e) });
      }
    }
    rows.sort((a, b) => (b.size || 0) + (b.indexSize || 0) - ((a.size || 0) + (a.indexSize || 0)));
    console.log(`\n--- DB: ${dbName} — top collections by data+index size ---`);
    console.log(
      "  " +
        "collection".padEnd(34) +
        "count".padStart(9) +
        "data".padStart(11) +
        "indexes".padStart(11) +
        "avgDoc".padStart(11),
    );
    let shown = 0;
    for (const r of rows) {
      if (r.error) {
        console.log(`  ${r.name.padEnd(34)} ERROR ${r.error}`);
        continue;
      }
      if (shown++ > 25) break;
      console.log(
        "  " +
          r.name.padEnd(34) +
          String(r.count).padStart(9) +
          MB(r.size).padStart(11) +
          MB(r.indexSize).padStart(11) +
          KB(r.avg).padStart(11),
      );
    }

    // Sample heaviest collections for big fields.
    const heavy = rows.filter((r) => !r.error && r.count > 0).slice(0, 5);
    for (const r of heavy) {
      const doc = await db.collection(r.name).findOne({});
      if (!doc) continue;
      const fields = Object.entries(doc)
        .map(([k, v]) => {
          let bytes;
          try {
            bytes = Buffer.byteLength(
              typeof v === "string" ? v : JSON.stringify(v ?? null),
              "utf8",
            );
          } catch {
            bytes = 0;
          }
          const isBuf = Buffer.isBuffer(v) || v?._bsontype === "Binary";
          const isB64 =
            typeof v === "string" && v.length > 200 && /^[A-Za-z0-9+/=\s]+$/.test(v.slice(0, 200));
          const isVec = Array.isArray(v) && v.length > 32 && typeof v[0] === "number";
          return { k, bytes, flag: isBuf ? "BUFFER" : isVec ? "VECTOR" : isB64 ? "BASE64?" : "" };
        })
        .sort((a, b) => b.bytes - a.bytes)
        .slice(0, 6);
      console.log(`\n    sample ${dbName}.${r.name} biggest fields (one doc):`);
      for (const f of fields) {
        console.log(`      ${f.k.padEnd(28)} ${KB(f.bytes).padStart(10)}  ${f.flag}`);
      }
    }
  }
  await client.close();
}

const mainUri = env.MONGODB_URI;
const orbitUri = env.ORBIT_MONGODB_URI || env.MONGODB_URI;

await auditCluster("MAIN CLUSTER (annix)", mainUri, null);
await auditCluster("ORBIT CLUSTER (orbit)", orbitUri, null);
console.log("\nDone.");
process.exit(0);
