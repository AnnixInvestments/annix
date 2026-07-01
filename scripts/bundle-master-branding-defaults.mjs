#!/usr/bin/env node
// Download the master (annix-investments) hero + watermark images from prod,
// compress them with sharp, and write them as bundled static defaults under
// annix-frontend/public/branding/ so every environment serves the same, fast
// images without per-env S3 seeding.
import { mkdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const require = createRequire(new URL("../annix-backend/package.json", import.meta.url));
const sharp = require("sharp");

const OUT = fileURLToPath(new URL("../annix-frontend/public/branding/", import.meta.url));
mkdirSync(OUT, { recursive: true });
const BASE = "https://annix-app.fly.dev/api/public/branding/annix-investments/asset";

const TASKS = [
  { slot: "heroTop", file: "annix-investments-hero-top.webp", maxW: 2400, quality: 76 },
  { slot: "heroBottom", file: "annix-investments-hero-bottom.webp", maxW: 2400, quality: 76 },
  { slot: "watermark", file: "annix-investments-watermark.webp", maxW: 1000, quality: 82 },
];

for (const task of TASKS) {
  const res = await fetch(`${BASE}/${task.slot}`);
  if (!res.ok) {
    console.log(`${task.slot}: fetch failed (${res.status}) — skipped`);
    continue;
  }
  const input = Buffer.from(await res.arrayBuffer());
  const output = await sharp(input)
    .resize({ width: task.maxW, withoutEnlargement: true })
    .webp({ quality: task.quality })
    .toBuffer();
  writeFileSync(OUT + task.file, output);
  const kb = (n) => `${Math.round(n / 1024)}KB`;
  console.log(`${task.slot}: ${kb(input.length)} -> ${kb(output.length)}  =>  ${task.file}`);
}
