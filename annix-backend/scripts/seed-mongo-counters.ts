import { config as dotenvConfig } from "dotenv";
import mongoose from "mongoose";

dotenvConfig({ path: ".env" });

const COUNTERS_COLLECTION = "counters";

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

    const collections = await database.listCollections({}, { nameOnly: true }).toArray();
    const names = collections
      .map((collection) => collection.name)
      .filter((name) => name !== COUNTERS_COLLECTION);

    const counters = database.collection<{ _id: string; seq: number }>(COUNTERS_COLLECTION);
    const seeded: string[] = [];

    for (const name of names) {
      const top = await database.collection(name).find().sort({ _id: -1 }).limit(1).toArray();
      const highestId = top.length > 0 ? top[0]._id : null;
      if (typeof highestId !== "number") {
        continue;
      }
      await counters.updateOne({ _id: name }, { $set: { seq: highestId } }, { upsert: true });
      seeded.push(`${name}=${highestId}`);
    }

    console.log(`Seeded ${seeded.length} numeric-id counters into "${dbName}".`);
    if (seeded.length > 0) {
      console.log(`  ${seeded.join("\n  ")}`);
    }
  } finally {
    await connection.close();
  }

  process.exit(0);
}

main().catch((error) => {
  console.error("Counter seeding failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
