#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const configsDir = path.resolve(__dirname, "..", "annix-backend", "configs");

if (!fs.existsSync(configsDir)) {
  console.log("No configs found. Run: node scripts/setup-config.js <name>");
  process.exit(0);
}

const configs = fs
  .readdirSync(configsDir)
  .filter((f) => f.endsWith(".env"))
  .map((f) => f.replace(".env", ""));

if (configs.length === 0) {
  console.log("No configs found. Run: node scripts/setup-config.js <name>");
  process.exit(0);
}

console.log("Available configs:");
console.log("");

for (const name of configs) {
  const content = fs.readFileSync(path.join(configsDir, `${name}.env`), "utf-8");
  const host = content.match(/DATABASE_HOST=(.+)/);
  const bucket = content.match(/AWS_S3_BUCKET=(.+)/);
  const source = content.match(/# Source: (.+)/);

  console.log(`  \x1b[36m${name}\x1b[0m`);
  if (source) console.log(`    Source: ${source[1]}`);
  if (host) console.log(`    DB Host: ${host[1]}`);
  if (bucket) console.log(`    S3 Bucket: ${bucket[1]}`);
  console.log("");
}
