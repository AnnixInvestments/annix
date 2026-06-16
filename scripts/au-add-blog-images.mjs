#!/usr/bin/env node
import dns from "node:dns";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

dns.setServers(["8.8.8.8", "1.1.1.1"]);

const require = createRequire(new URL("../annix-backend/package.json", import.meta.url));
const mongoose = require("mongoose");

const scriptDir = dirname(fileURLToPath(import.meta.url));
const envPath = [
  resolve(scriptDir, "../annix-backend/.env"),
  "C:/Users/andy/Documents/Annix-sync/annix-backend/.env",
].find((p) => existsSync(p));
const env = readFileSync(envPath, "utf8");
const read = (k) => {
  const l = env.split(/\r?\n/).find((x) => x.startsWith(`${k}=`));
  return l
    ? l
        .slice(k.length + 1)
        .trim()
        .replace(/^["']|["']$/g, "")
    : null;
};

const APPLY = process.argv.includes("--apply");
const img = (alt, file) => `![${alt}](/au-industries/gallery/${file})`;

const INSERTIONS = {
  "rubber-vs-ceramic-vs-hdpe-lining-mining": [
    [
      "Nitrile for oils and hydrocarbons.",
      img("Interior of a 12 mm AU 40 Red rubber-lined pipe", "gallery44.jpg"),
    ],
    [
      "short enough to hurt production.",
      img("Ceramic embedded rubber wear panel showing the tile pattern", "gallery22.jpg"),
    ],
    [
      "would wear at the invert.",
      img("HDPE pipe sections fabricated for a mining project", "gallery35.jpg"),
    ],
  ],
  "rubber-hardness-40-vs-60-shore-explained": [
    [
      "the property that feels like a weakness is the one doing the work.",
      img("AU 40 Red rubber-lined pipe for a platinum mine", "gallery02.jpg"),
    ],
    [
      "which is the right trade when impact, not fine abrasion, is the enemy.",
      img("AU premium 60 Shore rubber-lined fitting", "gallery50.jpg"),
    ],
    ["is high.", img("AU A38 premium pink rubber compound", "gallery27.jpg")],
  ],
  "hdpe-piping-for-mine-slurry": [
    [
      "faster installation and fewer chances for error.",
      img("HDPE piping installation components for a mine", "gallery36.jpg"),
    ],
    [
      "ceramic-lined steel pipework as alternatives.",
      img("Completed HDPE pipe delivery for a mining customer", "gallery37.jpg"),
    ],
  ],
  "on-site-rubber-lining-gauteng": [
    [
      "before any rubber goes on.",
      img("On-site rubber lining work on a mine project", "projectgallery10.jpg"),
    ],
    [
      "faster response when something wears through unexpectedly.",
      img("AU 40 Red rubber-lined pipe for a platinum mine", "gallery02.jpg"),
    ],
  ],
  "ceramic-embedded-rubber-wear-panels": [
    [
      "Combining them solves both at once.",
      img("Close-up of ceramic tiles bonded into a rubber wear panel", "gallery23.jpg"),
    ],
    [
      "where impact and abrasion happen together.",
      img("Set of ceramic embedded rubber panels for chute lining", "gallery25.jpg"),
    ],
  ],
  "rubber-lining-thickness-and-wear-life": [
    [
      "up to 25 mm depending on duty.",
      img("Red rubber-lined steel pipe for a Limpopo mine", "gallery45.jpg"),
    ],
    [
      "find thin spots before they fail.",
      img("Rubber-lined fitting showing the black natural rubber interior", "gallery42.jpg"),
    ],
  ],
};

const main = async () => {
  await mongoose.connect(read("MONGODB_URI"), { dbName: read("MONGO_DATABASE") });
  const col = mongoose.connection.collection("blog_post");

  for (const [slug, edits] of Object.entries(INSERTIONS)) {
    const doc = await col.findOne({ slug });
    if (!doc) {
      console.log(`MISSING  ${slug}`);
      continue;
    }
    let content = doc.content;
    let added = 0;
    let missing = 0;
    for (const [anchor, image] of edits) {
      if (content.includes(image)) {
        continue;
      }
      if (!content.includes(anchor)) {
        console.log(`  ! anchor not found in ${slug}: "${anchor.slice(0, 40)}"`);
        missing += 1;
        continue;
      }
      content = content.replace(anchor, `${anchor}\n\n${image}`);
      added += 1;
    }
    if (!APPLY) {
      console.log(
        `DRY   ${slug}  +${added} images${missing ? `  (${missing} anchors missing!)` : ""}`,
      );
      continue;
    }
    await col.updateOne({ slug }, { $set: { content, updatedAt: new Date() } });
    console.log(`UPDATED  ${slug}  +${added} inline images`);
  }

  if (!APPLY) console.log("\nDRY RUN — pass --apply to write.");
  await mongoose.disconnect();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
