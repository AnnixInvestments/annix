#!/usr/bin/env node

const { execSync, spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const backendDir = path.resolve(__dirname, "..", "annix-backend");
const prodDbEnv = path.join(backendDir, ".env.prod-db");

if (!fs.existsSync(prodDbEnv)) {
  console.error(
    "\x1b[31m.env.prod-db not found. Run setup-prod-db.ps1 or setup-prod-db.sh first.\x1b[0m",
  );
  process.exit(1);
}

const overrides = {};
const lines = fs.readFileSync(prodDbEnv, "utf-8").split("\n");
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
console.log("\x1b[41m\x1b[37m   PRODUCTION DATABASE MODE                 \x1b[0m");
console.log("\x1b[41m\x1b[37m   All changes affect LIVE data!            \x1b[0m");
console.log("\x1b[41m\x1b[37m ========================================== \x1b[0m");
console.log("");
console.log(`  Host: ${overrides.DATABASE_HOST}`);
console.log(`  DB:   ${overrides.DATABASE_NAME}`);
console.log(`  SSL:  ${overrides.DATABASE_SSL}`);
console.log("");

const child = spawn("npx", ["nest", "start", "--watch"], {
  cwd: backendDir,
  stdio: "inherit",
  shell: true,
  env: { ...process.env, ...overrides },
});

child.on("exit", (code) => process.exit(code));
