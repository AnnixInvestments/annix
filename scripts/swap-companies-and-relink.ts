#!/usr/bin/env node
/**
 * One-shot: swap the names of two unified companies and (optionally) relink
 * a user's stock-control profile back to a chosen company.
 *
 * Background: the earlier relink moved andy@polymerliners.co.za from
 * company_id=1 (where all the data and branding actually live) to
 * company_id=2 (a near-empty row). All other logins, job cards, stock,
 * branding etc. are still on id=1, just under the wrong "Annix
 * Investments..." label. Swapping the name column on the two rows fixes
 * the label without moving any data.
 *
 * Usage:
 *   node scripts/swap-companies-and-relink.ts <id-a> <id-b> [--relink-email=<addr> --to=<id>] [--apply]
 *
 * Example (dry run):
 *   node scripts/swap-companies-and-relink.ts 1 2 --relink-email=andy@polymerliners.co.za --to=1
 * Example (apply):
 *   node scripts/swap-companies-and-relink.ts 1 2 --relink-email=andy@polymerliners.co.za --to=1 --apply
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

const [, , aRaw, bRaw, ...flags] = process.argv;
if (!aRaw || !bRaw) {
  console.error(
    "Usage: node scripts/swap-companies-and-relink.ts <id-a> <id-b> [--relink-email=<addr> --to=<id>] [--apply]",
  );
  process.exit(1);
}
const idA = Number.parseInt(aRaw, 10);
const idB = Number.parseInt(bRaw, 10);
if (Number.isNaN(idA) || Number.isNaN(idB) || idA === idB) {
  console.error(`Invalid ids: ${aRaw}, ${bRaw}`);
  process.exit(1);
}

const apply = flags.includes("--apply");
const emailFlag = flags.find((f) => f.startsWith("--relink-email="));
const toFlag = flags.find((f) => f.startsWith("--to="));
const relinkEmail = emailFlag ? emailFlag.slice("--relink-email=".length) : null;
const relinkTo = toFlag ? Number.parseInt(toFlag.slice("--to=".length), 10) : null;
if ((relinkEmail && !relinkTo) || (!relinkEmail && relinkTo)) {
  console.error("--relink-email and --to must be supplied together (or both omitted).");
  process.exit(1);
}
if (relinkTo && relinkTo !== idA && relinkTo !== idB) {
  console.error(`--to=${relinkTo} must be one of the swap ids (${idA} or ${idB}).`);
  process.exit(1);
}

const client = new pg.Client({
  host: env.DATABASE_HOST,
  port: Number.parseInt(env.DATABASE_PORT, 10),
  user: env.DATABASE_USERNAME,
  password: env.DATABASE_PASSWORD,
  database: env.DATABASE_NAME,
  ssl: env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});
await client.connect();

async function readPair(table, ids) {
  const res = await client.query(`SELECT id, name FROM ${table} WHERE id = ANY($1) ORDER BY id`, [
    ids,
  ]);
  return res.rows;
}

async function tableExists(table) {
  const res = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=$1`,
    [table],
  );
  return res.rowCount > 0;
}

async function main() {
  const unified = await readPair("companies", [idA, idB]);
  if (unified.length !== 2) {
    console.error(`Expected 2 rows in companies for ids [${idA}, ${idB}], got ${unified.length}.`);
    process.exit(2);
  }
  const a = unified.find((r) => r.id === idA);
  const b = unified.find((r) => r.id === idB);

  console.log("companies (unified) — current names:");
  console.log(`  id=${a.id}: "${a.name}"`);
  console.log(`  id=${b.id}: "${b.name}"`);
  console.log("\ncompanies (unified) — after swap:");
  console.log(`  id=${a.id}: "${b.name}"`);
  console.log(`  id=${b.id}: "${a.name}"`);

  let legacy = null;
  if (await tableExists("stock_control_companies")) {
    legacy = await readPair("stock_control_companies", [idA, idB]);
    if (legacy.length === 2) {
      const la = legacy.find((r) => r.id === idA);
      const lb = legacy.find((r) => r.id === idB);
      console.log("\nstock_control_companies (legacy) — current names:");
      console.log(`  id=${la.id}: "${la.name}"`);
      console.log(`  id=${lb.id}: "${lb.name}"`);
      console.log("stock_control_companies (legacy) — after swap:");
      console.log(`  id=${la.id}: "${lb.name}"`);
      console.log(`  id=${lb.id}: "${la.name}"`);
    } else {
      console.log(
        `\nstock_control_companies has ${legacy.length} matching row(s); skipping legacy swap.`,
      );
      legacy = null;
    }
  }

  let relinkPlan = null;
  if (relinkEmail) {
    const userRes = await client.query(
      `SELECT id, email FROM "user" WHERE LOWER(email) = LOWER($1)`,
      [relinkEmail],
    );
    if (userRes.rowCount === 0) {
      console.error(`\nNo unified user with email=${relinkEmail}`);
      process.exit(3);
    }
    const userRow = userRes.rows[0];
    const profRes = await client.query(
      "SELECT id, company_id FROM stock_control_profiles WHERE user_id = $1",
      [userRow.id],
    );
    if (profRes.rowCount === 0) {
      console.error(`\nNo stock_control_profile for user_id=${userRow.id} (${userRow.email})`);
      process.exit(4);
    }
    const profile = profRes.rows[0];
    console.log(
      `\nrelink: user "${userRow.email}" profile.company_id ${profile.company_id} -> ${relinkTo}`,
    );
    relinkPlan = {
      profileId: profile.id,
      currentCompanyId: profile.company_id,
      email: userRow.email,
    };
  }

  if (!apply) {
    console.log("\n[DRY RUN] Re-run with --apply to commit.");
    return;
  }

  console.log("\nApplying in a single transaction...");
  await client.query("BEGIN");
  try {
    await client.query("UPDATE companies SET name = $1, updated_at = NOW() WHERE id = $2", [
      b.name,
      a.id,
    ]);
    await client.query("UPDATE companies SET name = $1, updated_at = NOW() WHERE id = $2", [
      a.name,
      b.id,
    ]);
    console.log("  companies: 2 row(s) renamed");

    if (legacy) {
      const la = legacy.find((r) => r.id === idA);
      const lb = legacy.find((r) => r.id === idB);
      await client.query(
        "UPDATE stock_control_companies SET name = $1, updated_at = NOW() WHERE id = $2",
        [lb.name, la.id],
      );
      await client.query(
        "UPDATE stock_control_companies SET name = $1, updated_at = NOW() WHERE id = $2",
        [la.name, lb.id],
      );
      console.log("  stock_control_companies: 2 row(s) renamed");
    }

    if (relinkPlan) {
      const upd = await client.query(
        "UPDATE stock_control_profiles SET company_id = $1, updated_at = NOW() WHERE id = $2",
        [relinkTo, relinkPlan.profileId],
      );
      console.log(
        `  stock_control_profiles: ${upd.rowCount} row(s) (${relinkPlan.email} ${relinkPlan.currentCompanyId} -> ${relinkTo})`,
      );
    }

    await client.query("COMMIT");
    console.log("\nDone.");
    console.log(
      `Reminder: ${relinkEmail || "the affected user"} must log out and log back in to pick up the new JWT.companyId.`,
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
