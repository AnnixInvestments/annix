#!/usr/bin/env node

const { spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const configsDir = path.resolve(__dirname, "..", "annix-backend", "configs");
const configName = process.argv[2];

if (!configName) {
  console.error("\x1b[31mUsage: node scripts/start-with-config.js <config-name>\x1b[0m");
  console.error("");

  if (fs.existsSync(configsDir)) {
    const existing = fs
      .readdirSync(configsDir)
      .filter((f) => f.endsWith(".env"))
      .map((f) => f.replace(".env", ""));
    if (existing.length > 0) {
      console.error(`Available configs: ${existing.join(", ")}`);
    } else {
      console.error("No configs found. Run: node scripts/setup-config.js <name>");
    }
  } else {
    console.error("No configs directory found. Run: node scripts/setup-config.js <name>");
  }
  process.exit(1);
}

const configFile = path.join(configsDir, `${configName}.env`);

if (!fs.existsSync(configFile)) {
  console.error(`\x1b[31mConfig '${configName}' not found at ${configFile}\x1b[0m`);
  console.error(`Run: node scripts/setup-config.js ${configName}`);
  process.exit(1);
}

const overrides = {};
const lines = fs.readFileSync(configFile, "utf-8").split("\n");
for (const line of lines) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith("#")) {
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex > 0) {
      overrides[trimmed.slice(0, eqIndex)] = trimmed.slice(eqIndex + 1);
    }
  }
}

console.log("");
console.log("\x1b[41m\x1b[37m ========================================== \x1b[0m");
console.log(`\x1b[41m\x1b[37m   CONFIG: ${configName.toUpperCase().padEnd(30)} \x1b[0m`);
console.log("\x1b[41m\x1b[37m   All changes affect LIVE data!            \x1b[0m");
console.log("\x1b[41m\x1b[37m ========================================== \x1b[0m");
console.log("");
console.log(`  DB Host:    ${overrides.DATABASE_HOST || "local"}`);
console.log(`  DB Name:    ${overrides.DATABASE_NAME || "local"}`);
console.log(`  SSL:        ${overrides.DATABASE_SSL || "false"}`);
console.log(`  S3 Bucket:  ${overrides.AWS_S3_BUCKET || "local"}`);
console.log(`  JWT:        ${overrides.JWT_SECRET ? "production" : "local"}`);
console.log(`  Encryption: ${overrides.DOCUMENT_ENCRYPTION_KEY ? "production" : "local"}`);
console.log(`  Frontend:   ${overrides.FRONTEND_URL || "default"}`);
console.log("");

const backendDir = path.resolve(__dirname, "..", "annix-backend");

const child = spawn("npx", ["nest", "start", "--watch"], {
  cwd: backendDir,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, ...overrides },
});

child.on("exit", (code) => process.exit(code));
