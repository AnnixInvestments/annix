#!/usr/bin/env node
import dns from "node:dns";
import { readFileSync, writeFileSync } from "node:fs";
// Reclaim WiredTiger churn-bloat on cv_assistant_external_jobs by dropping and
// recreating the collection (M0 cannot compact). Docs are preserved (backed up
// to disk first, re-inserted), indexes recreated. Embeddings kept as-is.
//
// Usage:
//   node scripts/rebuild-orbit-external-jobs.mjs <dbName>            # dry run
//   node scripts/rebuild-orbit-external-jobs.mjs <dbName> --apply    # execute
import { createRequire } from "node:module";

const require = createRequire(new URL("../annix-backend/package.json", import.meta.url));
const mongoose = require("mongoose");
const { MongoClient } = mongoose.mongo;
const EJSON = mongoose.mongo.BSON?.EJSON ?? require("bson").EJSON;
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const COLLECTION = "cv_assistant_external_jobs";
const dbName = process.argv[2];
const apply = process.argv.includes("--apply");
if (!dbName) {
  console.error("Usage: node scripts/rebuild-orbit-external-jobs.mjs <dbName> [--apply]");
  process.exit(1);
}

const text = readFileSync(new URL("../annix-backend/.env", import.meta.url), "utf8");
const env = {};
for (const line of text.split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
}
const MB = (b) => (b / 1024 / 1024).toFixed(1) + " MB";

const client = new MongoClient(env.ORBIT_MONGODB_URI || env.MONGODB_URI, {
  serverSelectionTimeoutMS: 20000,
});
await client.connect();
const db = client.db(dbName);
const col = db.collection(COLLECTION);

const before = await db.command({ collStats: COLLECTION, scale: 1 }).catch(() => null);
if (!before) {
  console.error(`Collection ${dbName}.${COLLECTION} not found — aborting.`);
  await client.close();
  process.exit(1);
}
const indexes = await col.indexes();
const recreatable = indexes.filter((i) => i.name !== "_id_");

console.log(`\n=== ${dbName}.${COLLECTION} ===`);
console.log(`  docs:            ${before.count}`);
console.log(`  logical size:    ${MB(before.size)}`);
console.log(`  disk storage:    ${MB(before.storageSize)}`);
console.log(`  indexes:         ${indexes.map((i) => i.name).join(", ")}`);

if (!apply) {
  console.log(
    "\n  DRY RUN — pass --apply to execute. Would: backup docs, drop, re-insert, recreate indexes.",
  );
  await client.close();
  process.exit(0);
}

const docs = await col.find({}).toArray();
const backupPath = new URL(`./.backup-${dbName}-external-jobs.json`, import.meta.url);
writeFileSync(backupPath, EJSON.stringify(docs, { relaxed: false }), "utf8");
console.log(`\n  backed up ${docs.length} docs -> ${backupPath.pathname}`);

await col.drop();
console.log("  dropped collection (disk released)");

await db.createCollection(COLLECTION);
if (docs.length > 0) {
  await db.collection(COLLECTION).insertMany(docs, { ordered: false });
}
console.log(`  re-inserted ${docs.length} docs`);

for (const idx of recreatable) {
  const opts = { name: idx.name };
  if (idx.unique) opts.unique = true;
  if (idx.sparse) opts.sparse = true;
  if (idx.expireAfterSeconds != null) opts.expireAfterSeconds = idx.expireAfterSeconds;
  if (idx.partialFilterExpression) opts.partialFilterExpression = idx.partialFilterExpression;
  await db.collection(COLLECTION).createIndex(idx.key, opts);
}
console.log(`  recreated ${recreatable.length} index(es)`);

const after = await db.command({ collStats: COLLECTION, scale: 1 });
console.log(`\n  AFTER docs:      ${after.count}`);
console.log(`  AFTER disk:      ${MB(after.storageSize)}  (was ${MB(before.storageSize)})`);
console.log(`  reclaimed:       ${MB(before.storageSize - after.storageSize)}`);
await client.close();
process.exit(0);
