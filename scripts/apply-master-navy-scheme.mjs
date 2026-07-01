#!/usr/bin/env node
// One-off: set the master (annix-investments) colour scheme to the marketing
// navy in both light and dark mode. Mirrors migration 20260605130000.
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

const SCHEME = {
  backgroundLight: "#0a1733",
  backgroundDark: "#0a1733",
  gradientFrom: "#0b1b3a",
  gradientVia: "#0a1733",
  gradientTo: "#070f24",
};

async function run() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGO_DATABASE });
  const col = mongoose.connection.db.collection("app_branding");
  const before = await col.findOne({ _id: "annix-investments" });
  console.log(`DB: ${process.env.MONGO_DATABASE}`);
  console.log(`before: bgLight=${before.backgroundLight} bgDark=${before.backgroundDark}`);
  await col.updateOne({ _id: "annix-investments" }, { $set: { ...SCHEME, updatedAt: new Date() } });
  console.log(
    `after : bgLight=${SCHEME.backgroundLight} bgDark=${SCHEME.backgroundDark} (updatedAt bumped)`,
  );
}

run()
  .then(() => mongoose.disconnect())
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
