#!/usr/bin/env node
// Clear the master (annix-investments) custom hero uploads so the brand falls
// back to the bundled static defaults (fast, CDN-served) instead of the large
// S3-proxied images. RUN AFTER the bundled-defaults code is deployed.
// Read-only unless run with --apply.
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
const mongoose = require("mongoose");

async function run() {
  const apply = process.argv.includes("--apply");
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGO_DATABASE });
  const col = mongoose.connection.db.collection("app_branding");
  const before = await col.findOne({ _id: "annix-investments" });
  console.log(`DB: ${process.env.MONGO_DATABASE}`);
  console.log(
    `before: heroTop=${before.heroTopPath} heroTopDark=${before.heroTopPathDark} heroBottom=${before.heroBottomPath} heroBottomDark=${before.heroBottomPathDark}`,
  );
  if (!apply) {
    console.log("\n(dry run) Re-run with --apply to null the hero upload paths.");
    process.exit(0);
  }
  await col.updateOne(
    { _id: "annix-investments" },
    {
      $set: {
        heroTopPath: null,
        heroTopPathDark: null,
        heroBottomPath: null,
        heroBottomPathDark: null,
        updatedAt: new Date(),
      },
    },
  );
  console.log("\nAPPLIED: hero upload paths nulled (now using bundled defaults), updatedAt bumped");
}

run()
  .then(() => mongoose.disconnect())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
