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

// Light tiles come from the transparent orbital mark (reads on light surfaces);
// dark tiles from the white-background mark (reads on dark surfaces). Favicon is
// circular; logo + watermark are rounded squares.
const LIGHT_SOURCE =
  process.env.BRAND_TILE_LIGHT_SOURCE ||
  "C:/Users/andy/OneDrive - AU Industries (Pty) Ltd/Shared Files/Annix Investments/Corp ID/Annix Logos/annix-brand-export/assets/logo.png";
const DARK_SOURCE =
  process.env.BRAND_TILE_DARK_SOURCE ||
  "C:/Users/andy/OneDrive - AU Industries (Pty) Ltd/Shared Files/Annix Investments/Corp ID/Favicon White Background.png";

const SIZE = 1024;
const MASTER = "annix-investments";

// slot → shape + the master path columns (snake for Postgres, camel for Mongo).
const TILES = {
  favicon: {
    shape: "circle",
    light: ["favicon_path", "faviconPath"],
    dark: ["favicon_path_dark", "faviconPathDark"],
  },
  logoIcon: {
    shape: "rounded",
    light: ["logo_icon_path", "logoIconPath"],
    dark: ["logo_icon_path_dark", "logoIconPathDark"],
  },
  watermark: {
    shape: "rounded",
    // Uniform rounded-square card in both modes: a navy tile for light surfaces
    // and the white tile for dark surfaces (same shape, inverted background).
    lightBg: { r: 26, g: 26, b: 64, alpha: 1 },
    light: ["watermark_path", "watermarkPath"],
    dark: ["watermark_path_dark", "watermarkPathDark"],
  },
};

function assertEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is required (read from annix-backend/.env).`);
    process.exit(1);
  }
  return value;
}

function maskFor(shape) {
  if (shape === "circle") {
    return Buffer.from(
      `<svg width="${SIZE}" height="${SIZE}"><circle cx="${SIZE / 2}" cy="${SIZE / 2}" r="${SIZE / 2}" fill="#fff"/></svg>`,
    );
  }
  const radius = Math.round(SIZE * 0.18);
  return Buffer.from(
    `<svg width="${SIZE}" height="${SIZE}"><rect x="0" y="0" width="${SIZE}" height="${SIZE}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`,
  );
}

async function processTile(buffer, shape) {
  return sharp(buffer)
    .resize(SIZE, SIZE, { fit: "cover" })
    .composite([{ input: maskFor(shape), blend: "dest-in" }])
    .png()
    .toBuffer();
}

// Builds a solid-colour rounded/circular tile with the mark centred on top —
// used to synthesise the navy watermark card from the transparent orbital mark.
async function colouredTile(markBuffer, shape, bg) {
  const markSize = Math.round(SIZE * 0.72);
  const mark = await sharp(markBuffer)
    .resize(markSize, markSize, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  const base = await sharp({ create: { width: SIZE, height: SIZE, channels: 4, background: bg } })
    .composite([{ input: maskFor(shape), blend: "dest-in" }])
    .png()
    .toBuffer();
  return sharp(base)
    .composite([{ input: mark, gravity: "center" }])
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

async function applyColumns(setSnake, setCamel) {
  if (process.env.MONGODB_URI) {
    const mongoose = require("mongoose");
    await mongoose.connect(process.env.MONGODB_URI, { dbName: assertEnv("MONGO_DATABASE") });
    await mongoose.connection
      .collection("app_branding")
      .updateOne({ _id: MASTER }, { $set: setCamel }, { upsert: true });
    await mongoose.disconnect();
    console.log(`  Mongo ✓ ${MASTER} (${Object.keys(setCamel).length} columns)`);
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
  const cols = Object.keys(setSnake);
  const values = cols.map((c) => setSnake[c]);
  const assignments = cols.map((c, i) => `${c} = $${i + 1}`);
  values.push(MASTER);
  await client.query(
    `UPDATE app_branding SET ${assignments.join(", ")}, updated_at = NOW() WHERE brand_code = $${values.length}`,
    values,
  );
  await client.end();
  console.log(`  Postgres ✓ ${MASTER} (${cols.length} columns + updated_at bump)`);
}

if (!existsSync(LIGHT_SOURCE)) {
  console.error(`Light source not found: ${LIGHT_SOURCE}`);
  process.exit(1);
}
if (!existsSync(DARK_SOURCE)) {
  console.error(`Dark source not found: ${DARK_SOURCE}`);
  process.exit(1);
}

const lightBytes = readFileSync(LIGHT_SOURCE);
const darkBytes = readFileSync(DARK_SOURCE);

const objects = [];
const setSnake = {};
const setCamel = {};

for (const [slot, def] of Object.entries(TILES)) {
  const lightTile = def.lightBg
    ? await colouredTile(lightBytes, def.shape, def.lightBg)
    : await processTile(lightBytes, def.shape);
  const darkTile = await processTile(darkBytes, def.shape);
  const lightKey = `branding/${MASTER}/${slot}-light.png`;
  const darkKey = `branding/${MASTER}/${slot}-dark.png`;
  objects.push({ key: lightKey, body: lightTile });
  objects.push({ key: darkKey, body: darkTile });
  setSnake[def.light[0]] = lightKey;
  setSnake[def.dark[0]] = darkKey;
  setCamel[def.light[1]] = lightKey;
  setCamel[def.dark[1]] = darkKey;
}

console.log(
  `Processing ${Object.keys(TILES).length} slots x light/dark -> rounded/circular tiles...`,
);
await uploadAll(objects);
await applyColumns(setSnake, setCamel);
console.log("Done. Rounded/circular light + dark tiles published for favicon, logo, watermark.");
