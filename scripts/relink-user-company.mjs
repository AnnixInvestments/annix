#!/usr/bin/env node
/**
 * One-shot: relink a unified user's stock-control profile to a different unified company.
 *
 * Usage:
 *   node scripts/relink-user-company.mjs <user-email> <target-company-id> [--apply]
 *
 * Without --apply, the script does a dry run (read-only) and prints what
 * would change. Add --apply to commit the UPDATE.
 *
 * Reads DATABASE_* env vars from annix-backend/.env (same vars TypeORM uses).
 *
 * Example (relink andy@polymerliners.co.za to companyId=2):
 *   node scripts/relink-user-company.mjs andy@polymerliners.co.za 2
 *   node scripts/relink-user-company.mjs andy@polymerliners.co.za 2 --apply
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

const [, , email, targetCompanyIdRaw, ...flags] = process.argv;
if (!email || !targetCompanyIdRaw) {
  console.error("Usage: node scripts/relink-user-company.mjs <email> <target-company-id> [--apply]");
  process.exit(1);
}

const targetCompanyId = Number.parseInt(targetCompanyIdRaw, 10);
if (Number.isNaN(targetCompanyId)) {
  console.error(`Invalid target company id: ${targetCompanyIdRaw}`);
  process.exit(1);
}

const apply = flags.includes("--apply");

const client = new pg.Client({
  host: env.DATABASE_HOST,
  port: Number.parseInt(env.DATABASE_PORT, 10),
  user: env.DATABASE_USERNAME,
  password: env.DATABASE_PASSWORD,
  database: env.DATABASE_NAME,
  ssl: env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : false,
});

await client.connect();

async function main() {
  const userRes = await client.query(
    `SELECT id, email, "firstName", "lastName" FROM "user" WHERE LOWER(email) = LOWER($1)`,
    [email],
  );
  if (userRes.rows.length === 0) {
    console.error(`No unified user found for email: ${email}`);
    process.exit(2);
  }
  const user = userRes.rows[0];
  console.log(`User: id=${user.id} email=${user.email} name="${user.firstName} ${user.lastName}"`);

  const profileRes = await client.query(
    `SELECT id, company_id FROM stock_control_profiles WHERE user_id = $1`,
    [user.id],
  );
  if (profileRes.rows.length === 0) {
    console.error(`No stock_control_profile for user ${user.id}`);
    process.exit(3);
  }
  const profile = profileRes.rows[0];
  console.log(`Profile: id=${profile.id} current company_id=${profile.company_id}`);

  const currentCompanyRes = await client.query(
    `SELECT id, name, trading_name, branding_type FROM companies WHERE id = $1`,
    [profile.company_id],
  );
  const currentCompany = currentCompanyRes.rows[0];
  console.log(
    `Current company: id=${currentCompany?.id} name="${currentCompany?.name}" trading_name="${currentCompany?.trading_name}" branding_type=${currentCompany?.branding_type}`,
  );

  const targetCompanyRes = await client.query(
    `SELECT id, name, trading_name, branding_type FROM companies WHERE id = $1`,
    [targetCompanyId],
  );
  if (targetCompanyRes.rows.length === 0) {
    console.error(`No companies row with id=${targetCompanyId}`);
    process.exit(4);
  }
  const targetCompany = targetCompanyRes.rows[0];
  console.log(
    `Target company:  id=${targetCompany.id} name="${targetCompany.name}" trading_name="${targetCompany.trading_name}" branding_type=${targetCompany.branding_type}`,
  );

  if (profile.company_id === targetCompanyId) {
    console.log("Already linked to target company. Nothing to do.");
    return;
  }

  if (!apply) {
    console.log("");
    console.log("[DRY RUN] Would UPDATE stock_control_profiles SET company_id =", targetCompanyId);
    console.log("WHERE id =", profile.id, "(was company_id =", profile.company_id, ")");
    console.log("Re-run with --apply to commit.");
    return;
  }

  await client.query("BEGIN");
  const updateRes = await client.query(
    `UPDATE stock_control_profiles SET company_id = $1, updated_at = NOW() WHERE id = $2`,
    [targetCompanyId, profile.id],
  );
  await client.query("COMMIT");
  console.log(`UPDATE applied. Rows affected: ${updateRes.rowCount}`);
  console.log(`Profile ${profile.id}: company_id ${profile.company_id} -> ${targetCompanyId}`);
}

try {
  await main();
} finally {
  await client.end();
}
