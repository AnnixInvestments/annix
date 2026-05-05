#!/usr/bin/env node
/**
 * Reconcile S3 buckets — copy DB-referenced documents from dev bucket to prod bucket.
 *
 * Background: past dev sessions running without the swarm `prod` profile uploaded
 * files to the dev bucket (annix-sync-files-1767722029842) while writing rows to
 * the shared prod DB. With the prod profile now standard, those orphans surface
 * as "Document missing from storage" panels.
 *
 * This script:
 *   1. Reads every documentPath/graphPdfPath/etc. from rubber tables.
 *   2. HEADs each in the prod bucket.
 *   3. For misses, HEADs the same key in the dev bucket.
 *   4. Where dev has it, copies dev → prod (skipping if dest exists).
 *   5. Reports: present-in-prod / recovered / orphan-in-neither.
 *
 * Usage (run from annix-backend/):
 *   node scripts/reconcile-s3-buckets.mjs            # Dry run (default — no writes)
 *   node scripts/reconcile-s3-buckets.mjs --apply    # Actually copy files
 *
 * Idempotent — re-running after a partial recovery is safe.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { CopyObjectCommand, HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import pg from "pg";

const isApply = process.argv.includes("--apply");
const __dirname = dirname(fileURLToPath(import.meta.url));
const backendRoot = join(__dirname, "..");
const repoRoot = join(backendRoot, "..");

function parseEnvFile(path) {
  const out = {};
  const text = readFileSync(path, "utf-8");
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const eq = trimmed.indexOf("=");
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

const devEnv = parseEnvFile(join(backendRoot, ".env"));
let prodBucket = "annix-sync-files-production";
try {
  const prodEnv = parseEnvFile(join(backendRoot, "configs", "prod.env"));
  if (prodEnv.AWS_S3_BUCKET) prodBucket = prodEnv.AWS_S3_BUCKET;
} catch {
  // configs/prod.env optional; fall back to default
}

const devBucket = devEnv.AWS_S3_BUCKET;
const region = devEnv.AWS_REGION || "af-south-1";

if (!devEnv.AWS_ACCESS_KEY_ID || !devEnv.AWS_SECRET_ACCESS_KEY || !devBucket) {
  console.error(
    "Missing AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_S3_BUCKET in annix-backend/.env",
  );
  process.exit(1);
}

const s3 = new S3Client({
  region,
  credentials: {
    accessKeyId: devEnv.AWS_ACCESS_KEY_ID,
    secretAccessKey: devEnv.AWS_SECRET_ACCESS_KEY,
  },
});

const COLUMNS = [
  ["rubber_supplier_cocs", "document_path"],
  ["rubber_supplier_cocs", "graph_pdf_path"],
  ["rubber_au_cocs", "generated_pdf_path"],
  ["rubber_delivery_notes", "document_path"],
  ["rubber_purchase_requisitions", "external_po_document_path"],
  ["rubber_roll_rejections", "return_document_path"],
  ["rubber_tax_invoices", "document_path"],
];

async function s3Exists(bucket, key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (err) {
    if (err.name === "NotFound" || err.$metadata?.httpStatusCode === 404) return false;
    throw err;
  }
}

async function copy(srcBucket, dstBucket, key) {
  await s3.send(
    new CopyObjectCommand({
      Bucket: dstBucket,
      Key: key,
      CopySource: `${encodeURIComponent(srcBucket)}/${encodeURI(key)}`,
    }),
  );
}

async function loadPaths(client) {
  const all = new Map();
  for (const [table, column] of COLUMNS) {
    const tableExists = await client.query(
      `SELECT EXISTS (
         SELECT FROM information_schema.columns
         WHERE table_name = $1 AND column_name = $2
       ) AS present`,
      [table, column],
    );
    if (!tableExists.rows[0].present) {
      console.log(`  [skip] ${table}.${column} not present`);
      continue;
    }
    const rows = await client.query(
      `SELECT id, ${client.escapeIdentifier(column)} AS path
         FROM ${client.escapeIdentifier(table)}
        WHERE ${client.escapeIdentifier(column)} IS NOT NULL
          AND ${client.escapeIdentifier(column)} <> ''`,
    );
    console.log(`  ${table}.${column}: ${rows.rows.length} non-null paths`);
    for (const r of rows.rows) {
      const key = r.path.replace(/\\/g, "/").replace(/^\//, "");
      if (!all.has(key)) all.set(key, []);
      all.get(key).push(`${table}#${r.id}.${column}`);
    }
  }
  return all;
}

async function main() {
  console.log("=".repeat(70));
  console.log(`S3 bucket reconciliation — ${isApply ? "APPLY" : "DRY RUN"}`);
  console.log(`  dev bucket  : ${devBucket}`);
  console.log(`  prod bucket : ${prodBucket}`);
  console.log(`  region      : ${region}`);
  console.log("=".repeat(70));

  const client = new pg.Client({
    host: devEnv.DATABASE_HOST,
    port: Number(devEnv.DATABASE_PORT || 5432),
    user: devEnv.DATABASE_USERNAME,
    password: devEnv.DATABASE_PASSWORD,
    database: devEnv.DATABASE_NAME || "neondb",
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  console.log("\nLoading paths from DB...");
  const paths = await loadPaths(client);
  await client.end();
  console.log(`Total unique S3 keys referenced: ${paths.size}\n`);

  const presentInProd = [];
  const recovered = [];
  const skippedAlreadyCopied = [];
  const orphan = [];
  const errors = [];

  let i = 0;
  for (const [key, refs] of paths) {
    i++;
    const prefix = `[${i}/${paths.size}]`;
    try {
      const inProd = await s3Exists(prodBucket, key);
      if (inProd) {
        presentInProd.push(key);
        if (i % 50 === 0) console.log(`${prefix} present-in-prod (running tally)`);
        continue;
      }
      const inDev = await s3Exists(devBucket, key);
      if (!inDev) {
        orphan.push({ key, refs });
        console.log(`${prefix} ORPHAN  ${key}  (refs: ${refs.join(", ")})`);
        continue;
      }
      // Dev has it; not in prod yet.
      if (!isApply) {
        recovered.push(key);
        console.log(`${prefix} would copy  ${key}`);
        continue;
      }
      await copy(devBucket, prodBucket, key);
      // Verify
      const verified = await s3Exists(prodBucket, key);
      if (verified) {
        recovered.push(key);
        console.log(`${prefix} COPIED  ${key}`);
      } else {
        errors.push({ key, refs, error: "post-copy HEAD returned 404" });
        console.log(`${prefix} FAIL    ${key}  (post-copy HEAD missing)`);
      }
    } catch (err) {
      errors.push({ key, refs, error: err.message });
      console.log(`${prefix} ERROR   ${key}  ${err.message}`);
    }
  }

  console.log("\n" + "=".repeat(70));
  console.log("Summary");
  console.log("=".repeat(70));
  console.log(`  Total keys referenced     : ${paths.size}`);
  console.log(`  Already in prod           : ${presentInProd.length}`);
  console.log(
    `  ${isApply ? "Recovered (dev → prod)    " : "Would recover (dry run)   "}: ${recovered.length}`,
  );
  console.log(`  Orphan (in neither bucket): ${orphan.length}`);
  console.log(`  Errors                    : ${errors.length}`);
  if (orphan.length) {
    console.log("\nOrphans (file genuinely lost — no recovery possible from S3):");
    for (const { key, refs } of orphan) console.log(`  ${key}  ←  ${refs.join(", ")}`);
  }
  if (errors.length) {
    console.log("\nErrors:");
    for (const { key, error } of errors) console.log(`  ${key}  ${error}`);
  }
  if (!isApply && recovered.length > 0) {
    console.log("\nRe-run with --apply to actually copy the files.");
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
