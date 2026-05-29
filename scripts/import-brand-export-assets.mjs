#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../annix-backend/package.json", import.meta.url));
require("dotenv").config({
  path: fileURLToPath(new URL("../annix-backend/.env", import.meta.url)),
});

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const EXPORT_DIR =
  process.env.BRAND_EXPORT_DIR ||
  "C:/Users/andy/OneDrive - AU Industries (Pty) Ltd/Shared Files/Annix Investments/Corp ID/Annix Logos/annix-brand-export";

const SLOT_COLUMNS = {
  logoIcon: {
    light: ["logo_icon_path", "logoIconPath"],
    dark: ["logo_icon_path_dark", "logoIconPathDark"],
  },
  wordmark: {
    light: ["wordmark_path", "wordmarkPath"],
    dark: ["wordmark_path_dark", "wordmarkPathDark"],
  },
  favicon: {
    light: ["favicon_path", "faviconPath"],
    dark: ["favicon_path_dark", "faviconPathDark"],
  },
  flashLine: {
    light: ["flash_line_path", "flashLinePath"],
    dark: ["flash_line_path_dark", "flashLinePathDark"],
  },
  subMark: {
    light: ["sub_mark_path", "subMarkPath"],
    dark: ["sub_mark_path_dark", "subMarkPathDark"],
  },
  heroImage: {
    light: ["hero_image_path", "heroImagePath"],
    dark: ["hero_image_path_dark", "heroImagePathDark"],
  },
};

const ASSET_PLAN = {
  "annix-investments": {
    logoIcon: { light: "logo.png", dark: "logo.png" },
    wordmark: { light: "wordmark-navy.png", dark: "wordmark-white.png" },
    favicon: { light: "logo.png", dark: "logo.png" },
    flashLine: { light: "flare-line.png", dark: "flare-line.png" },
    subMark: { light: "sub-investments.png", dark: "sub-investments.png" },
  },
  "annix-forge": {
    subMark: { light: "sub-forge.png", dark: "sub-forge.png" },
    heroImage: { light: "hero-forge-navy.png", dark: "hero-forge-white.png" },
  },
  "annix-rep": {
    subMark: { light: "sub-pulse.png", dark: "sub-pulse.png" },
    heroImage: { light: "hero-pulse-navy.png", dark: "hero-pulse-white.png" },
  },
  "annix-orbit": {
    subMark: { light: "sub-orbit.png", dark: "sub-orbit.png" },
    heroImage: { light: "hero-orbit-navy.png", dark: "hero-orbit-white.png" },
  },
  "annix-insights": {
    subMark: { light: "sub-insights.png", dark: "sub-insights.png" },
  },
  "annix-sentinel": {
    subMark: { light: "sub-sentinel.png", dark: "sub-sentinel.png" },
  },
};

const HERO_WORDS = {
  "annix-forge": "QUOTE · BUILD · INSPECT · DELIVER",
  "annix-rep": "DISCOVERY · CONNECT · ANALYZE · WIN",
  "annix-orbit": "HIRING · TALENT · COMPLIANCE",
};

function assertEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`${name} is required (read from annix-backend/.env).`);
    process.exit(1);
  }
  return value;
}

function s3KeyFor(brand, slot, variant) {
  return `branding/${brand}/${slot}-${variant}.png`;
}

function buildUploadsAndColumns() {
  const uploads = new Map();
  const columnsByBrand = {};
  Object.entries(ASSET_PLAN).forEach(([brand, slots]) => {
    columnsByBrand[brand] = {};
    Object.entries(slots).forEach(([slot, files]) => {
      ["light", "dark"].forEach((variant) => {
        const file = files[variant];
        if (!file) return;
        const key = s3KeyFor(brand, slot, variant);
        uploads.set(key, file);
        const [snake, camel] = SLOT_COLUMNS[slot][variant];
        columnsByBrand[brand][snake] = key;
        columnsByBrand[brand][`__camel__${snake}`] = camel;
        columnsByBrand[brand][`__keyvalue__${snake}`] = key;
      });
    });
  });
  return { uploads, columnsByBrand };
}

async function uploadAll(uploads) {
  const bucket = assertEnv("AWS_S3_BUCKET");
  const region = assertEnv("AWS_REGION");
  const client = new S3Client({
    region,
    credentials: {
      accessKeyId: assertEnv("AWS_ACCESS_KEY_ID"),
      secretAccessKey: assertEnv("AWS_SECRET_ACCESS_KEY"),
    },
  });
  const entries = Array.from(uploads.entries());
  await Promise.all(
    entries.map(async ([key, file]) => {
      const filePath = resolve(EXPORT_DIR, "assets", file);
      if (!existsSync(filePath)) {
        throw new Error(`Source file missing: ${filePath}`);
      }
      const body = readFileSync(filePath);
      await client.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: body,
          ContentType: "image/png",
        }),
      );
      console.log(`  S3 ✓ ${key}  (${file})`);
    }),
  );
}

function pathColumnsFor(columnsByBrand, brand) {
  const raw = columnsByBrand[brand] || {};
  return Object.keys(raw)
    .filter((column) => !column.startsWith("__"))
    .reduce((acc, snake) => {
      acc[snake] = { value: raw[snake], camel: raw[`__camel__${snake}`] };
      return acc;
    }, {});
}

async function applyPostgres(columnsByBrand) {
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
  console.log(`Postgres connected (${process.env.DATABASE_NAME}).`);
  for (const brand of Object.keys(ASSET_PLAN)) {
    const columns = pathColumnsFor(columnsByBrand, brand);
    const insertCols = ["brand_code"];
    const values = [brand];
    const updates = [];
    Object.entries(columns).forEach(([snake, info]) => {
      values.push(info.value);
      insertCols.push(snake);
      updates.push(`${snake} = EXCLUDED.${snake}`);
    });
    const heroWords = HERO_WORDS[brand];
    if (heroWords !== undefined) {
      values.push(heroWords);
      insertCols.push("hero_words");
      updates.push("hero_words = EXCLUDED.hero_words");
    }
    const placeholders = values.map((_, index) => `$${index + 1}`).join(", ");
    const sql = `INSERT INTO app_branding (${insertCols.join(", ")}) VALUES (${placeholders})
      ON CONFLICT (brand_code) DO UPDATE SET ${updates.join(", ")}, updated_at = NOW()`;
    const result = await client.query(sql, values);
    console.log(
      `  ${brand}: ${result.rowCount} row(s) upserted, ${Object.keys(columns).length} asset column(s)`,
    );
  }
  await client.end();
}

async function applyMongo(columnsByBrand) {
  const mongoose = require("mongoose");
  const uri = assertEnv("MONGODB_URI");
  const dbName = assertEnv("MONGO_DATABASE");
  await mongoose.connect(uri, { dbName });
  console.log(`Mongo connected (${dbName}).`);
  const collection = mongoose.connection.collection("app_branding");
  for (const brand of Object.keys(ASSET_PLAN)) {
    const columns = pathColumnsFor(columnsByBrand, brand);
    const set = Object.values(columns).reduce((acc, info) => {
      acc[info.camel] = info.value;
      return acc;
    }, {});
    const heroWords = HERO_WORDS[brand];
    if (heroWords !== undefined) {
      set.heroWords = heroWords;
    }
    const result = await collection.updateOne({ _id: brand }, { $set: set }, { upsert: true });
    const touched = result.modifiedCount + result.upsertedCount;
    console.log(
      `  ${brand}: ${touched} doc updated, ${Object.keys(columns).length} asset field(s)`,
    );
  }
  await mongoose.disconnect();
}

const { uploads, columnsByBrand } = buildUploadsAndColumns();

console.log(
  `Uploading ${uploads.size} asset object(s) to S3 bucket ${process.env.AWS_S3_BUCKET}...`,
);
await uploadAll(uploads);

const useMongo = Boolean(process.env.MONGODB_URI);
console.log(`Writing branding references via ${useMongo ? "MongoDB" : "Postgres"}...`);
if (useMongo) {
  await applyMongo(columnsByBrand);
} else {
  await applyPostgres(columnsByBrand);
}

console.log("Done. Brand export assets imported.");
