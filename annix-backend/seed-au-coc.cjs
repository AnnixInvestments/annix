require("dotenv").config();
const { Client } = require("pg");

async function seed() {
  const client = new Client({
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT || "5432", 10),
    user: process.env.DATABASE_USERNAME,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  console.log("Connected to database");

  const rolls = await client.query(
    "SELECT id, batch_number FROM rubber_roll_stock WHERE batch_number LIKE 'TEST-ROLL-%' ORDER BY id LIMIT 3",
  );

  if (rolls.rows.length === 0) {
    console.log("No test rolls found. Please create rolls first.");
    await client.end();
    return;
  }

  console.log("Found rolls:", rolls.rows.map((r) => r.batch_number).join(", "));

  const rollIds = rolls.rows.map((r) => r.id);

  const certNumber = `AU-COC-TEST-${Date.now()}`;
  const now = new Date().toISOString();

  const certResult = await client.query(
    `INSERT INTO rubber_au_coc (certificate_number, status, created_at, updated_at)
     VALUES ($1, 'draft', $2, $2) RETURNING id`,
    [certNumber, now],
  );

  const certId = certResult.rows[0].id;
  console.log("Created AU CoC:", certNumber, "with ID:", certId);

  for (const rollId of rollIds) {
    await client.query(
      `INSERT INTO rubber_au_coc_rolls (au_coc_id, roll_stock_id)
       VALUES ($1, $2)`,
      [certId, rollId],
    );
  }

  console.log("Linked", rollIds.length, "rolls to certificate");

  await client.end();
  console.log("Done! Certificate ID:", certId);
}

seed().catch(console.error);
