import { config as dotenvConfig } from "dotenv";
import mongoose from "mongoose";

dotenvConfig({ path: ".env" });

const SAMPLE_COLLECTIONS = [
  "weld_types",
  "inbound_email_attachments",
  "stock_items",
  "rfqs",
  "users",
  "audit_logs",
];

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  const dbName =
    process.env.PORT_TARGET_DATABASE ?? process.env.MONGO_DATABASE ?? "annix_development";
  if (!uri) {
    console.error("MONGODB_URI is not set in annix-backend/.env");
    process.exit(1);
  }

  const connection = await mongoose.createConnection(uri, { dbName }).asPromise();
  try {
    const database = connection.db;
    if (!database) {
      throw new Error("Mongo connection has no database handle");
    }

    const existing = await database.listCollections({}, { nameOnly: true }).toArray();
    const names = new Set(existing.map((collection) => collection.name));

    for (const name of SAMPLE_COLLECTIONS) {
      if (!names.has(name)) {
        console.log(`\n${name}: (collection not present)`);
        continue;
      }
      const doc = await database.collection(name).findOne();
      if (!doc) {
        console.log(`\n${name}: (empty)`);
        continue;
      }
      const keys = Object.keys(doc);
      const snake = keys.filter((key) => key.includes("_") && key !== "_id");
      const camel = keys.filter((key) => /[a-z][A-Z]/.test(key));
      console.log(`\n${name}: ${keys.length} fields`);
      console.log(`  _id type: ${typeof doc._id}`);
      console.log(`  keys: ${keys.join(", ")}`);
      console.log(`  snake_case keys: ${snake.length}  camelCase keys: ${camel.length}`);
    }
  } finally {
    await connection.close();
  }
  process.exit(0);
}

main().catch((error) => {
  console.error("Inspection failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
