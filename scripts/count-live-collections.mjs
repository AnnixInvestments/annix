#!/usr/bin/env node
import dns from "node:dns";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));

const envCandidates = [
  resolve(scriptDir, "../annix-backend/.env"),
  "C:/Users/andy/Documents/Annix-sync/annix-backend/.env",
];
const envPath = envCandidates.find((p) => existsSync(p));
if (!envPath) {
  console.error("count-live-collections: no annix-backend/.env found");
  process.exit(1);
}

const env = {};
for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, "");
}

const uri = env.MONGODB_URI;
const dbName = env.MONGO_DATABASE;
if (!uri || !dbName) {
  console.error("count-live-collections: MONGODB_URI or MONGO_DATABASE missing");
  process.exit(1);
}

const dnsServers = (env.MONGO_DNS_SERVERS || "8.8.8.8,1.1.1.1")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
if (dnsServers.length > 0) dns.setServers(dnsServers);

const require = createRequire(new URL("../annix-backend/package.json", import.meta.url));
const mongoose = require("mongoose");
const { MongoClient } = mongoose.mongo;

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });

try {
  await client.connect();
  const collections = await client.db(dbName).listCollections().toArray();
  process.stdout.write(String(collections.length));
  await client.close();
  process.exit(0);
} catch (error) {
  console.error(`count-live-collections: ${String(error)}`);
  await client.close().catch(() => {});
  process.exit(1);
}
