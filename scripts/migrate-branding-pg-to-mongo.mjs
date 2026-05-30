#!/usr/bin/env node
// One-off: copy the full app_branding table from the local Postgres (Neon) DB
// into MongoDB, so a backend switched to DATABASE_DRIVER=mongo keeps all the
// branding configured this session (colours, logos, login cards, etc.).
//
// Reads Postgres creds from annix-backend/.env even if they are commented out
// (the Mongo switch comments them); reads MONGODB_URI + MONGO_DATABASE from the
// live env. Run after setting MONGO_DATABASE in .env. Idempotent (upsert).
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../annix-backend/package.json", import.meta.url));
const envPath = fileURLToPath(new URL("../annix-backend/.env", import.meta.url));
require("dotenv").config({ path: envPath });

// Pull a key from .env even when commented (`# KEY=value`).
const envText = readFileSync(envPath, "utf8");
function envValue(key) {
  if (process.env[key]) return process.env[key];
  const match = envText.match(new RegExp(`^#?\\s*${key}=(.*)$`, "m"));
  return match ? match[1].trim() : undefined;
}
function required(key) {
  const value = envValue(key);
  if (!value) {
    console.error(
      `${key} is required (in annix-backend/.env, commented is fine for Postgres keys).`,
    );
    process.exit(1);
  }
  return value;
}

const MONGODB_URI = required("MONGODB_URI");
const MONGO_DATABASE = required("MONGO_DATABASE");

const snakeToCamel = (s) => s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());

const { Client } = require("pg");
const mongoose = require("mongoose");

const pg = new Client({
  host: required("DATABASE_HOST"),
  port: Number(envValue("DATABASE_PORT") ?? 5432),
  user: required("DATABASE_USERNAME"),
  password: required("DATABASE_PASSWORD"),
  database: required("DATABASE_NAME"),
  ssl: envValue("DATABASE_SSL") === "false" ? false : { rejectUnauthorized: false },
});

await pg.connect();
console.log(`Postgres connected (${envValue("DATABASE_NAME")}).`);

const { rows } = await pg.query("SELECT * FROM app_branding");
console.log(`Read ${rows.length} app_branding row(s) from Postgres.`);

await mongoose.connect(MONGODB_URI, { dbName: MONGO_DATABASE });
console.log(`Mongo connected (${MONGO_DATABASE}).`);
const collection = mongoose.connection.collection("app_branding");

for (const row of rows) {
  const _id = row.brand_code;
  const doc = {};
  for (const [col, value] of Object.entries(row)) {
    if (col === "brand_code") continue;
    const field = snakeToCamel(col);
    if (col === "created_at" || col === "updated_at") {
      doc[field] = value ? new Date(value).toISOString() : undefined;
      continue;
    }
    doc[field] = value;
  }
  const result = await collection.updateOne({ _id }, { $set: { _id, ...doc } }, { upsert: true });
  const touched = result.modifiedCount + result.upsertedCount;
  console.log(`  ${_id}: ${touched ? "written" : "no change"} (${Object.keys(doc).length} fields)`);
}

await pg.end();
await mongoose.disconnect();
console.log("Done. Branding migrated Postgres -> Mongo.");
