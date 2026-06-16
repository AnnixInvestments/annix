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

const SECTION = `

## Rubber lining service areas

We rubber line for mining and industrial customers across Gauteng and the East Rand from our Boksburg facility:

- [Rubber Lining Boksburg](/rubber-lining-boksburg)
- [Rubber Lining Johannesburg](/rubber-lining-johannesburg)
- [Rubber Lining Witbank](/rubber-lining-witbank)
- [Rubber Lining Benoni](/rubber-lining-benoni)
- [Rubber Lining Germiston](/rubber-lining-germiston)`;

const main = async () => {
  await mongoose.connect(read("MONGODB_URI"), { dbName: read("MONGO_DATABASE") });
  const col = mongoose.connection.collection("website_page");
  const doc = await col.findOne({ slug: "rubber-lining" });
  if (!doc) {
    console.log("MISSING rubber-lining page");
    await mongoose.disconnect();
    return;
  }
  const content = typeof doc.content === "string" ? doc.content : "";
  if (content.includes("Rubber lining service areas")) {
    console.log("SKIP — service areas section already present");
    await mongoose.disconnect();
    return;
  }
  const updated = `${content}${SECTION}`;
  if (!APPLY) {
    console.log(`DRY   rubber-lining  ${content.length} -> ${updated.length} chars`);
    await mongoose.disconnect();
    return;
  }
  await col.updateOne(
    { slug: "rubber-lining" },
    { $set: { content: updated, updatedAt: new Date().toISOString() } },
  );
  console.log(`APPLIED  rubber-lining  ${content.length} -> ${updated.length} chars`);
  await mongoose.disconnect();
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
