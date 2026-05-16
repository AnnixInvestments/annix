#!/usr/bin/env node
/**
 * One-shot: merge all rows on <source-company-id> into <target-company-id>.
 *
 * Discovers every table in the public schema that has a column named
 * "company_id" (snake_case) or "companyId" (camelCase), then for each:
 *   - counts rows where the column equals source vs target
 *   - with --apply, UPDATEs source -> target inside a single transaction
 *
 * The whole merge runs in one transaction so a failure (e.g. a unique
 * constraint collision) rolls back cleanly.
 *
 * Usage:
 *   node scripts/merge-companies.ts <source-id> <target-id>            # dry run
 *   node scripts/merge-companies.ts <source-id> <target-id> --apply
 *   node scripts/merge-companies.ts 1 2 --apply --copy-branding
 *
 * Flags:
 *   --apply           Commit the merge (otherwise dry run)
 *   --copy-branding   Also copy logo_url / hero_image_url / primary_color /
 *                     accent_color / trading_name / website_url from companies.<source>
 *                     to companies.<target>, but only where the target column is NULL.
 *   --include=a,b,c   Restrict to listed table names (comma separated)
 *   --exclude=a,b,c   Skip listed table names (comma separated)
 *
 * Reads DATABASE_* env vars from annix-backend/.env.
 */

import fs from "node:fs";
import path from "node:path";
import url from "node:url";
import pg from "pg";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "..", "annix-backend", ".env");

if (!fs.existsSync(envPath)) {
  console.error(`Cannot find ${envPath}`);
  process.exit(1);
}

const env = Object.fromEntries(
  fs
    .readFileSync(envPath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    }),
);

const [, , sourceRaw, targetRaw, ...flags] = process.argv;
if (!sourceRaw || !targetRaw) {
  console.error(
    "Usage: node scripts/merge-companies.ts <source-id> <target-id> [--apply] [--copy-branding] [--include=a,b] [--exclude=a,b]",
  );
  process.exit(1);
}

const sourceId = Number.parseInt(sourceRaw, 10);
const targetId = Number.parseInt(targetRaw, 10);
if (Number.isNaN(sourceId) || Number.isNaN(targetId)) {
  console.error(`Invalid ids: source=${sourceRaw} target=${targetRaw}`);
  process.exit(1);
}
if (sourceId === targetId) {
  console.error("Source and target must differ");
  process.exit(1);
}

const apply = flags.includes("--apply");
const copyBranding = flags.includes("--copy-branding");
const includeArg = flags.find((f) => f.startsWith("--include="));
const excludeArg = flags.find((f) => f.startsWith("--exclude="));
const includeSet = includeArg
  ? new Set(
      includeArg
        .slice("--include=".length)
        .split(",")
        .map((s) => s.trim()),
    )
  : null;
const excludeSet = excludeArg
  ? new Set(
      excludeArg
        .slice("--exclude=".length)
        .split(",")
        .map((s) => s.trim()),
    )
  : new Set();

const client = new pg.Client({
  host: env.DATABASE_HOST,
  port: Number.parseInt(env.DATABASE_PORT, 10),
  user: env.DATABASE_USERNAME,
  password: env.DATABASE_PASSWORD,
  database: env.DATABASE_NAME,
  ssl: env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

await client.connect();

function quoteIdent(name) {
  return `"${name.replace(/"/g, '""')}"`;
}

async function discoverColumns() {
  const res = await client.query(`
    SELECT c.table_name, c.column_name
      FROM information_schema.columns c
      JOIN information_schema.tables t
        ON t.table_schema = c.table_schema
       AND t.table_name = c.table_name
     WHERE c.table_schema = 'public'
       AND t.table_type = 'BASE TABLE'
       AND c.column_name IN ('company_id', 'companyId')
     ORDER BY c.table_name, c.column_name
  `);
  return res.rows.map((r) => ({ table: r.table_name, column: r.column_name }));
}

async function countsFor(table, column) {
  const q = quoteIdent(table);
  const c = quoteIdent(column);
  const res = await client.query(
    `SELECT
       (SELECT COUNT(*)::bigint FROM ${q} WHERE ${c} = $1) AS source_count,
       (SELECT COUNT(*)::bigint FROM ${q} WHERE ${c} = $2) AS target_count
    `,
    [sourceId, targetId],
  );
  const row = res.rows[0];
  return {
    source: Number(row.source_count),
    target: Number(row.target_count),
  };
}

async function checkBrandingDiff() {
  const res = await client.query(
    `SELECT id, name, trading_name, branding_type, primary_color, accent_color,
            logo_url, hero_image_url, website_url
       FROM companies WHERE id IN ($1, $2) ORDER BY id`,
    [sourceId, targetId],
  );
  return res.rows;
}

async function main() {
  const all = await discoverColumns();
  const filtered = all
    .filter((r) => !excludeSet.has(r.table))
    .filter((r) => !includeSet || includeSet.has(r.table));

  console.log(
    `Found ${all.length} table(s) with company_id/companyId column; ${filtered.length} after include/exclude.`,
  );
  console.log(`Merging company ${sourceId} -> ${targetId}\n`);

  const plan = [];
  let totalRows = 0;
  for (const { table, column } of filtered) {
    const counts = await countsFor(table, column);
    plan.push({ table, column, ...counts });
    totalRows += counts.source;
  }

  const widest = plan.reduce((m, r) => Math.max(m, r.table.length), 8);
  console.log(
    `${"Table".padEnd(widest)}  ${"Column".padEnd(11)}  source(${sourceId}).rows  target(${targetId}).rows`,
  );
  console.log("-".repeat(widest + 11 + 28));
  for (const r of plan) {
    if (r.source === 0 && r.target === 0) continue;
    console.log(
      `${r.table.padEnd(widest)}  ${r.column.padEnd(11)}  ${String(r.source).padStart(15)}  ${String(r.target).padStart(15)}`,
    );
  }
  console.log("-".repeat(widest + 11 + 28));
  console.log(`Total rows to move: ${totalRows}\n`);

  if (copyBranding) {
    const rows = await checkBrandingDiff();
    console.log("Branding (companies table):");
    for (const row of rows) {
      console.log(
        `  id=${row.id} name="${row.name}" trading_name="${row.trading_name}" branding_type=${row.branding_type}`,
      );
      console.log(
        `    primary=${row.primary_color} accent=${row.accent_color} logo=${row.logo_url ? "set" : "null"} hero=${row.hero_image_url ? "set" : "null"} site=${row.website_url || "null"}`,
      );
    }
    console.log("");
  }

  if (!apply) {
    console.log("[DRY RUN] Re-run with --apply to commit.");
    return;
  }

  console.log("Applying merge in a single transaction...");
  await client.query("BEGIN");
  try {
    let totalUpdated = 0;
    for (const r of plan) {
      if (r.source === 0) continue;
      const q = quoteIdent(r.table);
      const c = quoteIdent(r.column);
      const upd = await client.query(`UPDATE ${q} SET ${c} = $1 WHERE ${c} = $2`, [
        targetId,
        sourceId,
      ]);
      console.log(`  ${r.table}.${r.column}: ${upd.rowCount} row(s)`);
      totalUpdated += upd.rowCount ?? 0;
    }

    if (copyBranding) {
      const upd = await client.query(
        `UPDATE companies tgt
            SET logo_url        = COALESCE(tgt.logo_url,        src.logo_url),
                hero_image_url  = COALESCE(tgt.hero_image_url,  src.hero_image_url),
                primary_color   = COALESCE(tgt.primary_color,   src.primary_color),
                accent_color    = COALESCE(tgt.accent_color,    src.accent_color),
                trading_name    = COALESCE(tgt.trading_name,    src.trading_name),
                website_url     = COALESCE(tgt.website_url,     src.website_url),
                branding_type   = CASE
                                    WHEN tgt.branding_type IS NULL OR tgt.branding_type = 'annix'
                                    THEN src.branding_type
                                    ELSE tgt.branding_type
                                  END
           FROM (SELECT * FROM companies WHERE id = $1) src
          WHERE tgt.id = $2`,
        [sourceId, targetId],
      );
      console.log(`  companies branding fill: ${upd.rowCount} row(s) touched`);
    }

    await client.query("COMMIT");
    console.log(`\nDone. ${totalUpdated} row(s) updated across ${plan.length} table(s).`);
    console.log(
      "Reminder: companies.id=" +
        sourceId +
        " is now empty of scoped data. Decide separately whether to keep or remove that row.",
    );
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("\nFAILED. Transaction rolled back.");
    console.error(err);
    process.exit(10);
  }
}

try {
  await main();
} finally {
  await client.end();
}
