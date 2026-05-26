import { config as dotenvConfig } from "dotenv";
import { Client } from "pg";

dotenvConfig({ path: ".env" });

async function main(): Promise<void> {
  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  try {
    const size = await client.query<{ pretty: string; bytes: string }>(
      "SELECT pg_size_pretty(pg_database_size(current_database())) AS pretty, pg_database_size(current_database()) AS bytes",
    );
    console.log(`Database size: ${size.rows[0].pretty} (${size.rows[0].bytes} bytes)`);

    const tables = await client.query<{ relname: string; total: string }>(
      `SELECT c.relname, pg_size_pretty(pg_total_relation_size(c.oid)) AS total
       FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relkind = 'r'
       ORDER BY pg_total_relation_size(c.oid) DESC LIMIT 15`,
    );
    console.log("\nLargest 15 tables:");
    for (const row of tables.rows) {
      console.log(`  ${row.relname}: ${row.total}`);
    }

    const byteaCols = await client.query<{ table_name: string; column_name: string }>(
      `SELECT table_name, column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND data_type = 'bytea'
       ORDER BY table_name, column_name`,
    );
    console.log(`\nbytea columns (${byteaCols.rows.length}):`);
    for (const col of byteaCols.rows) {
      const stats = await client.query<{
        rows: string;
        filled: string;
        total_bytes: string;
        max_bytes: string;
      }>(
        `SELECT count(*) AS rows, count("${col.column_name}") AS filled,
                coalesce(sum(octet_length("${col.column_name}")), 0) AS total_bytes,
                coalesce(max(octet_length("${col.column_name}")), 0) AS max_bytes
         FROM "${col.table_name}"`,
      );
      const stat = stats.rows[0];
      console.log(
        `  ${col.table_name}.${col.column_name}: ${stat.filled}/${stat.rows} filled, total ${stat.total_bytes} B, max ${stat.max_bytes} B`,
      );
    }

    const largeObjects = await client.query<{ count: string }>(
      "SELECT count(*) AS count FROM pg_largeobject_metadata",
    );
    console.log(`\npg_largeobject entries: ${largeObjects.rows[0].count}`);
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error("Inspection failed.");
  console.error("name:", error?.name);
  console.error("message:", error?.message);
  console.error("code:", error?.code);
  console.error("full:", error);
  process.exit(1);
});
