#!/usr/bin/env node
// One-off: mirror the master (annix-investments) DARK wordmark asset onto the
// LIGHT wordmark slot so the white wordmark shows in both variants.
// Read-only unless run with --apply.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../annix-backend/package.json", import.meta.url));
require("dotenv").config({
  path: fileURLToPath(new URL("../annix-backend/.env", import.meta.url)),
  quiet: true,
});

const { setServers } = require("node:dns");
if (process.env.MONGO_DNS_SERVERS) {
  setServers(
    process.env.MONGO_DNS_SERVERS.split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

const mongoose = require("mongoose");

async function run() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGO_DATABASE;
  if (!uri || !dbName) {
    console.error("MONGODB_URI and MONGO_DATABASE are required (from annix-backend/.env)");
    process.exit(1);
  }
  const apply = process.argv.includes("--apply");
  await mongoose.connect(uri, { dbName });
  const db = mongoose.connection.db;
  console.log(`DB: ${dbName}`);

  const doc = await db.collection("app_branding").findOne({ _id: "annix-investments" });
  if (!doc) {
    console.error("No app_branding row for annix-investments");
    process.exit(1);
  }
  console.log(`wordmarkPath (light): ${doc.wordmarkPath ?? "(unset)"}`);
  console.log(`wordmarkPathDark    : ${doc.wordmarkPathDark ?? "(unset)"}`);

  if (!doc.wordmarkPathDark) {
    console.error("No dark wordmark to mirror — nothing to do.");
    process.exit(1);
  }
  if (!apply) {
    console.log("\n(dry run) Re-run with --apply to set wordmarkPath = wordmarkPathDark.");
    process.exit(0);
  }
  await db
    .collection("app_branding")
    .updateOne(
      { _id: "annix-investments" },
      { $set: { wordmarkPath: doc.wordmarkPathDark, updatedAt: new Date() } },
    );
  console.log(`\nAPPLIED: wordmarkPath := ${doc.wordmarkPathDark} (updatedAt bumped)`);
}

run()
  .then(() => mongoose.disconnect())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
