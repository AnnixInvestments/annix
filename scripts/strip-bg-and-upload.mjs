#!/usr/bin/env node
import { existsSync } from "node:fs";
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

const sharp = require("sharp");
const mongoose = require("mongoose");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const CORP_ID =
  "C:/Users/andy/OneDrive - AU Industries (Pty) Ltd/Shared Files/Annix Investments/Corp ID";

const SOURCES = [
  {
    variant: "light",
    file: "Background Pale Blue.png",
    key: "branding/annix-investments/pageBackground-light.png",
    column: "pageBackgroundPath",
  },
  {
    variant: "dark",
    file: "Background Navy Blue.png",
    key: "branding/annix-investments/pageBackground-dark.png",
    column: "pageBackgroundPath_dark_placeholder",
  },
];

const INNER = 34;
const OUTER = 80;

// The source art is a rounded-square card; its dot-wave design curls upward at
// the bottom-left and bottom-right corners. Cropping a margin off the left,
// right, and bottom removes those rounded corners so the wave bleeds straight
// to the screen edges when rendered full-bleed with background-size: cover.
const CROP_SIDE_FRACTION = 0.09;
const CROP_BOTTOM_FRACTION = 0.06;

async function stripFill(filePath) {
  const meta = await sharp(filePath).metadata();
  const cropX = Math.round(meta.width * CROP_SIDE_FRACTION);
  const cropBottom = Math.round(meta.height * CROP_BOTTOM_FRACTION);
  const cropped = sharp(filePath).extract({
    left: cropX,
    top: 0,
    width: meta.width - cropX * 2,
    height: meta.height - cropBottom,
  });

  const { data, info } = await cropped.ensureAlpha().raw().toBuffer({
    resolveWithObject: true,
  });
  const { width, height, channels } = info;

  const sampleX = width >> 1;
  const sampleY = Math.floor(height * 0.12);
  const sIdx = (sampleY * width + sampleX) * channels;
  const keyR = data[sIdx];
  const keyG = data[sIdx + 1];
  const keyB = data[sIdx + 2];

  const total = width * height;
  const out = Buffer.from(data);
  const pixels = Array.from({ length: total }).map((_unused, p) => p);
  pixels.forEach((p) => {
    const i = p * channels;
    const dr = out[i] - keyR;
    const dg = out[i + 1] - keyG;
    const db = out[i + 2] - keyB;
    const dist = Math.sqrt(dr * dr + dg * dg + db * db);
    const alpha =
      dist <= INNER
        ? 0
        : dist >= OUTER
          ? 255
          : Math.round(((dist - INNER) / (OUTER - INNER)) * 255);
    out[i + 3] = alpha;
  });

  return sharp(out, { raw: { width, height, channels } }).png().toBuffer();
}

async function run() {
  const region = process.env.AWS_REGION;
  const bucket = process.env.AWS_S3_BUCKET;
  const client = new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGO_DATABASE });
  const collection = mongoose.connection.collection("app_branding");
  const now = new Date();

  const results = await SOURCES.reduce(async (acc, src) => {
    const carried = await acc;
    const filePath = `${CORP_ID}/${src.file}`;
    if (!existsSync(filePath)) {
      throw new Error(`Source not found: ${filePath}`);
    }
    const buffer = await stripFill(filePath);
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: src.key,
        Body: buffer,
        ContentType: "image/png",
      }),
    );
    const field = src.variant === "light" ? "pageBackgroundPath" : "pageBackgroundPathDark";
    await collection.updateOne(
      { _id: "annix-investments" },
      { $set: { [field]: src.key, updatedAt: now } },
      { upsert: true },
    );
    console.log(`  ${src.variant} -> S3 ${src.key} (${buffer.length} bytes), Mongo ${field} set`);
    return [...carried, src.key];
  }, Promise.resolve([]));

  void results;
  await mongoose.disconnect();
  console.log("Done. Hero backgrounds stripped to transparent design + re-pushed.");
}

run().catch((error) => {
  console.error("ERR:", error.message);
  process.exit(1);
});
