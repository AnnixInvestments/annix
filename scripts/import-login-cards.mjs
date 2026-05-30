#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../annix-backend/package.json", import.meta.url));
require("dotenv").config({
  path: fileURLToPath(new URL("../annix-backend/.env", import.meta.url)),
});

const { setServers } = require("node:dns");
if (process.env.MONGO_DNS_SERVERS) {
  setServers(
    process.env.MONGO_DNS_SERVERS.split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const CORP_ID =
  process.env.CORP_ID_DIR ||
  "C:/Users/andy/OneDrive - AU Industries (Pty) Ltd/Shared Files/Annix Investments/Corp ID";

// brand → source card file. Core is omitted (not a registered brand yet).
const ALL_CARDS = {
  "annix-sentinel": "Annix Sentinel Full Card.png",
  "annix-forge": "Annix Forge Full Card.png",
  "annix-rep": "Annix Pulse Full Card.png",
  "annix-orbit": "Annix Orbit Logo.png",
  "annix-core": "Annix Core Full Card.png",
};

const requested = process.argv.slice(2);
const CARDS = requested.length
  ? Object.fromEntries(Object.entries(ALL_CARDS).filter(([brand]) => requested.includes(brand)))
  : ALL_CARDS;

if (!Object.keys(CARDS).length) {
  console.error(`No matching brands. Available: ${Object.keys(ALL_CARDS).join(", ")}`);
  process.exit(1);
}

function assertEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is required (read from annix-backend/.env).`);
    process.exit(1);
  }
  return value;
}

async function uploadAll() {
  const client = new S3Client({
    region: assertEnv("AWS_REGION"),
    credentials: {
      accessKeyId: assertEnv("AWS_ACCESS_KEY_ID"),
      secretAccessKey: assertEnv("AWS_SECRET_ACCESS_KEY"),
    },
  });
  const bucket = assertEnv("AWS_S3_BUCKET");
  const keys = {};
  for (const [brand, file] of Object.entries(CARDS)) {
    const filePath = `${CORP_ID}/${file}`;
    if (!existsSync(filePath)) {
      throw new Error(`Card not found: ${filePath}`);
    }
    const key = `branding/${brand}/loginCard-light.png`;
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: readFileSync(filePath),
        ContentType: "image/png",
      }),
    );
    console.log(`  S3 ✓ ${key}  (${file})`);
    keys[brand] = key;
  }
  return keys;
}

async function applyPostgres(keys) {
  const { Client } = require("pg");
  const client = new Client({
    host: assertEnv("DATABASE_HOST"),
    port: Number(process.env.DATABASE_PORT ?? 5432),
    user: assertEnv("DATABASE_USERNAME"),
    password: assertEnv("DATABASE_PASSWORD"),
    database: assertEnv("DATABASE_NAME"),
    ssl: process.env.DATABASE_SSL === "false" ? false : { rejectUnauthorized: false },
  });
  await client.connect();
  for (const [brand, key] of Object.entries(keys)) {
    const result = await client.query(
      `INSERT INTO app_branding (brand_code, login_card_path) VALUES ($1, $2)
       ON CONFLICT (brand_code) DO UPDATE SET login_card_path = EXCLUDED.login_card_path, updated_at = NOW()`,
      [brand, key],
    );
    console.log(`  Postgres ✓ ${brand}: ${result.rowCount} row(s)`);
  }
  await client.end();
}

async function applyMongo(keys) {
  const mongoose = require("mongoose");
  await mongoose.connect(assertEnv("MONGODB_URI"), { dbName: assertEnv("MONGO_DATABASE") });
  const collection = mongoose.connection.collection("app_branding");
  for (const [brand, key] of Object.entries(keys)) {
    await collection.updateOne(
      { _id: brand },
      { $set: { loginCardPath: key, updatedAt: new Date() } },
      { upsert: true },
    );
    console.log(`  Mongo ✓ ${brand}`);
  }
  await mongoose.disconnect();
}

console.log(
  `Uploading ${Object.keys(CARDS).length} login cards to ${process.env.AWS_S3_BUCKET}...`,
);
const keys = await uploadAll();
console.log(`Writing login_card_path via ${process.env.MONGODB_URI ? "MongoDB" : "Postgres"}...`);
if (process.env.MONGODB_URI) {
  await applyMongo(keys);
} else {
  await applyPostgres(keys);
}
console.log("Done. Login cards imported (Sentinel, Forge, Pulse). Annix Core skipped — no brand.");
