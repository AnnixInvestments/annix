#!/usr/bin/env node
import pg from "pg";

const client = new pg.Client({
  host: "ep-calm-mountain-ab5o40px.eu-west-2.aws.neon.tech",
  port: 5432,
  user: "neondb_owner",
  password: "npg_Hds3MzGXvl8R",
  database: "neondb",
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
