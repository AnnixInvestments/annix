#!/usr/bin/env node
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import pg from "pg";

const require = createRequire(new URL("../annix-backend/package.json", import.meta.url));
require("dotenv").config({
  path: fileURLToPath(new URL("../annix-backend/.env", import.meta.url)),
  quiet: true,
});

const connectionString = process.env.NEON_STAGING_DATABASE_URL;
if (!connectionString) {
  console.error("NEON_STAGING_DATABASE_URL is required (set it in annix-backend/.env)");
  process.exit(1);
}

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const u = await client.query(
  `SELECT id, email, "firstName", "lastName", status, email_verified,
          password_hash IS NOT NULL AS has_password
     FROM "user" ORDER BY id`,
);
console.log("staging.user rows:");
console.table(u.rows);

const p = await client.query(`
  SELECT scp.id, scp.user_id, scp.company_id, u.email
    FROM stock_control_profiles scp
    LEFT JOIN "user" u ON u.id = scp.user_id
   ORDER BY scp.company_id, u.email
`);
console.log("\nstaging.stock_control_profiles -> user.email:");
console.table(p.rows);

const c = await client.query("SELECT id, name, onboarding_complete FROM companies ORDER BY id");
console.log("\nstaging.companies:");
console.table(c.rows);

const m = await client.query("SELECT name FROM migrations ORDER BY timestamp DESC LIMIT 5");
console.log("\nLatest migrations applied on staging:");
console.table(m.rows);

await client.end();
