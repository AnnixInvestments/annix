#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../annix-backend/package.json", import.meta.url));
require("dotenv").config({
  path: fileURLToPath(new URL("../annix-backend/.env", import.meta.url)),
});

const sharp = require("sharp");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const SOURCE =
  process.env.DARK_LOGO_SOURCE ||
  "C:/Users/andy/OneDrive - AU Industries (Pty) Ltd/Shared Files/Annix Investments/Corp ID/Favicon White Background.png";

const SIZE = 1024;
const MASTER = "annix-investments";

function assertEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is required (read from annix-backend/.env).`);
    process.exit(1);
  }
  return value;
}

async function circular(buffer) {
  const mask = Buffer.from(
    `<svg width="${SIZE}" height="${SIZE}"><circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${SIZE / 2}" fill="#fff"/></svg>`,
  );
  return sharp(buffer)
    .resize(SIZE, SIZE, { fit: "cover" })
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function rounded(buffer) {
  const radius = Math.round(SIZE * 0.18);
  const mask = Buffer.from(
    `<svg width="${SIZE}" height="${SIZE}"><rect x="0" y="0" width="${SIZE}" height="${SIZE}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`,
  );
  return sharp(buffer)
    .resize(SIZE, SIZE, { fit: "cover" })
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function uploadAll(objects) {
  const client = new S3Client({
    region: assertEnv("AWS_REGION"),
    credentials: {
      accessKeyId: assertEnv("AWS_ACCESS_KEY_ID"),
      secretAccessKey: assertEnv("AWS_SECRET_ACCESS_KEY"),
    },
  });
  const bucket = assertEnv("AWS_S3_BUCKET");
  await Promise.all(
    objects.map(async ({ key, body }) => {
      await client.send(
        new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: "image/png" }),
      );
      console.log(`  S3 ✓ ${key}`);
    }),
  );
}

async function setWatermarkDark(key) {
  if (process.env.MONGODB_URI) {
    const mongoose = require("mongoose");
    await mongoose.connect(process.env.MONGODB_URI, { dbName: assertEnv("MONGO_DATABASE") });
    await mongoose.connection
      .collection("app_branding")
      .updateOne({ _id: MASTER }, { $set: { watermarkPathDark: key } }, { upsert: true });
    await mongoose.disconnect();
    console.log(`  Mongo ✓ ${MASTER}.watermarkPathDark`);
    return;
  }
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
  await client.query(
    "UPDATE app_branding SET watermark_path_dark = $1, updated_at = NOW() WHERE brand_code = $2",
    [key, MASTER],
  );
  await client.end();
  console.log(`  Postgres ✓ ${MASTER}.watermark_path_dark (+ updated_at bump)`);
}

if (!existsSync(SOURCE)) {
  console.error(`Source image not found: ${SOURCE}`);
  process.exit(1);
}

const source = readFileSync(SOURCE);
console.log(`Processing ${SOURCE} → circular favicon + rounded logo/watermark…`);
const circleBuffer = await circular(source);
const roundedBuffer = await rounded(source);

await uploadAll([
  { key: `branding/${MASTER}/favicon-dark.png`, body: circleBuffer },
  { key: `branding/${MASTER}/logoIcon-dark.png`, body: roundedBuffer },
  { key: `branding/${MASTER}/watermark-dark.png`, body: roundedBuffer },
]);

await setWatermarkDark(`branding/${MASTER}/watermark-dark.png`);

console.log("Done. Dark favicon (circular) + rounded dark logo/watermark published.");
