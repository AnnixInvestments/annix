import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SOURCE_DIR =
  "C:/Users/andy/OneDrive - AU Industries (Pty) Ltd/Shared Files/Annix Investments/Corp ID/Annix Orbit/Seeker Module";
const OUT_DIR = "annix-frontend/public/marketing/orbit-seeker";

const WEEKS = [1, 2, 3, 4, 5, 6];

// The "WEEK n" badge is a purple rounded rectangle anchored to the top-right
// corner of every creative. The surrounding band is near-uniform dark navy, so
// we sample that colour just left of the badge and composite a matching patch
// over the badge bounding box.
const BADGE_LEFT = 0.8;
const BADGE_BOTTOM = 0.09;
// Sample several points hugging the badge and take the darkest per channel, so
// the fill matches the dark corner vignette instead of standing out as a
// lighter rectangle.
const SAMPLE_POINTS = [
  { x: 0.74, y: 0.045 },
  { x: 0.82, y: 0.11 },
  { x: 0.95, y: 0.11 },
  { x: 0.9, y: 0.13 },
];

async function sampleColour(image, width, height) {
  const samples = await Promise.all(
    SAMPLE_POINTS.map(async (point) => {
      const left = Math.round(width * point.x);
      const top = Math.round(height * point.y);
      const region = await image.clone().extract({ left, top, width: 20, height: 20 }).stats();
      return region.channels.map((c) => Math.round(c.mean));
    }),
  );
  const r = Math.min(...samples.map((s) => s[0]));
  const g = Math.min(...samples.map((s) => s[1]));
  const b = Math.min(...samples.map((s) => s[2]));
  return { r, g, b };
}

function buildFeatheredPatch(width, height, fill) {
  const featherX = Math.min(44, Math.floor(width * 0.17));
  const featherY = Math.min(16, Math.floor(height * 0.14));
  const buffer = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const ay = y > height - 1 - featherY ? (height - 1 - y) / featherY : 1;
    for (let x = 0; x < width; x += 1) {
      const ax = x < featherX ? x / featherX : 1;
      const alpha = Math.round(255 * Math.min(ax, ay));
      const idx = (y * width + x) * 4;
      buffer[idx] = fill.r;
      buffer[idx + 1] = fill.g;
      buffer[idx + 2] = fill.b;
      buffer[idx + 3] = alpha;
    }
  }
  return buffer;
}

async function processWeek(week) {
  const source = path.join(SOURCE_DIR, `Seeker Pre-Launch Week ${week} Ad.png`);
  const image = sharp(source);
  const meta = await image.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  const colour = await sampleColour(image, width, height);

  const patchLeft = Math.round(width * BADGE_LEFT);
  const patchWidth = width - patchLeft;
  const patchHeight = Math.round(height * BADGE_BOTTOM);
  // Nudge toward the darker corner vignette so the patch doesn't read as a
  // lighter block.
  const fill = {
    r: Math.round(colour.r * 0.72),
    g: Math.round(colour.g * 0.72),
    b: Math.round(colour.b * 0.72),
  };
  // Feather only the interior (left + bottom) edges, which sit in the margin
  // beyond the badge, so the patch blends into the background. Top + right are
  // the image border — kept fully opaque. The badge is fully under the opaque
  // core, so feathering never exposes it.
  const patch = buildFeatheredPatch(patchWidth, patchHeight, fill);

  const out = path.join(OUT_DIR, `prelaunch-week-${week}.png`);
  await image
    .composite([
      {
        input: patch,
        raw: { width: patchWidth, height: patchHeight, channels: 4 },
        left: patchLeft,
        top: 0,
      },
    ])
    .png()
    .toFile(out);

  console.log(
    `week ${week}: ${width}x${height} | patch ${patchWidth}x${patchHeight} @ (${patchLeft},0) | fill rgb(${colour.r},${colour.g},${colour.b}) -> ${out}`,
  );
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const available = await readdir(SOURCE_DIR);
  console.log(
    `source files: ${available.filter((f) => f.includes("Pre-Launch")).length} pre-launch ads found`,
  );
  await WEEKS.reduce(async (prev, week) => {
    await prev;
    await processWeek(week);
  }, Promise.resolve());
  console.log("done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
