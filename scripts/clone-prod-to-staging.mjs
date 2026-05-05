#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline";

const PROD_URL = process.env.PROD_DATABASE_URL;
const STAGING_URL = process.env.STAGING_DATABASE_URL;
const DRY_RUN = process.argv.includes("--dry-run");
const SKIP_CONFIRM = process.argv.includes("--yes");

const fail = (msg) => {
  console.error(`Error: ${msg}`);
  process.exit(1);
};

if (!PROD_URL || !STAGING_URL) {
  console.error("Usage:");
  console.error(
    "  PROD_DATABASE_URL=... STAGING_DATABASE_URL=... node scripts/clone-prod-to-staging.mjs [--dry-run] [--yes]",
  );
  console.error("");
  console.error(
    "Both URLs must be full Postgres connection strings (postgres://user:pass@host/db?sslmode=require).",
  );
  process.exit(2);
}

const parseHost = (url, label) => {
  try {
    return new URL(url).host;
  } catch {
    fail(`${label} is not a valid URL`);
  }
};

const prodHost = parseHost(PROD_URL, "PROD_DATABASE_URL");
const stagingHost = parseHost(STAGING_URL, "STAGING_DATABASE_URL");

if (prodHost === stagingHost) {
  fail("Source and target hosts are the same. Refusing to clone a database onto itself.");
}

console.log("");
console.log("Clone prod -> staging");
console.log("=====================");
console.log(`  source (read):   ${prodHost}`);
console.log(`  target (wiped):  ${stagingHost}`);
console.log("");

if (DRY_RUN) {
  console.log("Dry run. Exiting without doing anything.");
  process.exit(0);
}

if (!SKIP_CONFIRM) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((resolve) => {
    rl.question(
      `Type 'yes' to drop the public schema on ${stagingHost} and restore from ${prodHost}: `,
      resolve,
    );
  });
  rl.close();
  if (answer.trim().toLowerCase() !== "yes") {
    console.log("Aborted.");
    process.exit(0);
  }
}

const SENSITIVE_VALUES = [PROD_URL, STAGING_URL];

const sanitiseArgs = (args) =>
  args.map((arg) => (SENSITIVE_VALUES.some((v) => arg.includes(v)) ? "<connection>" : arg));

const run = (label, cmd, args, opts = {}) =>
  new Promise((resolve, reject) => {
    const allowed = new Set([0, ...(opts.allowExitCodes ?? [])]);
    const start = Date.now();
    console.log(`\n[${label}] $ ${cmd} ${sanitiseArgs(args).join(" ")}`);
    const proc = spawn(cmd, args, { stdio: "inherit" });
    proc.on("close", (code) => {
      const seconds = (Date.now() - start) / 1000;
      if (allowed.has(code)) {
        const suffix = code === 0 ? "" : ` (exit ${code} accepted)`;
        console.log(`[${label}] done in ${seconds.toFixed(1)}s${suffix}`);
        resolve();
      } else {
        reject(new Error(`${label} failed: ${cmd} exited with code ${code}`));
      }
    });
    proc.on("error", reject);
  });

const tmp = mkdtempSync(join(tmpdir(), "annix-clone-"));
const dumpFile = join(tmp, "prod.dump");
const startedAt = Date.now();

try {
  await run("pg_dump", "pg_dump", [
    PROD_URL,
    "--format=custom",
    "--no-owner",
    "--no-privileges",
    "--schema=public",
    "--file",
    dumpFile,
  ]);

  const dumpBytes = statSync(dumpFile).size;
  console.log(`[pg_dump] dump file size: ${(dumpBytes / 1024 / 1024).toFixed(1)} MB`);

  await run("wipe schema", "psql", [
    STAGING_URL,
    "-v",
    "ON_ERROR_STOP=1",
    "-c",
    "DROP SCHEMA IF EXISTS public CASCADE;",
  ]);

  await run(
    "pg_restore",
    "pg_restore",
    ["--no-owner", "--no-privileges", "--dbname", STAGING_URL, dumpFile],
    { allowExitCodes: [1] },
  );

  const totalSeconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log("");
  console.log(`Done in ${totalSeconds}s. Staging is now a copy of prod.`);
  console.log(
    "pg_restore may have printed warnings about pre-existing extensions or roles. Those are usually safe; review the output above to be sure.",
  );
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
