import { config as dotenvConfig } from "dotenv";
import mongoose from "mongoose";

dotenvConfig({ path: ".env" });

const ENVIRONMENT_DATABASES = [
  "annix_production",
  "annix_staging",
  "annix_development",
  "annix_test",
];

const BOOTSTRAP_COLLECTION = "_annix_bootstrap";

async function bootstrapDatabase(uri: string, databaseName: string): Promise<void> {
  const connection = await mongoose.createConnection(uri, { dbName: databaseName }).asPromise();
  try {
    await connection.collection<{ _id: string; note?: string }>(BOOTSTRAP_COLLECTION).updateOne(
      { _id: "bootstrap" },
      {
        $setOnInsert: { note: "environment database created by mongo-bootstrap, see issue #298" },
      },
      { upsert: true },
    );
    const collections = await connection.listCollections();
    console.log(`  ${databaseName}: connected ok, ${collections.length} collection(s)`);
  } finally {
    await connection.close();
  }
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set in annix-backend/.env");
    process.exit(1);
  }

  console.log("Connecting to MongoDB Atlas and creating environment databases...");
  for (const databaseName of ENVIRONMENT_DATABASES) {
    await bootstrapDatabase(uri, databaseName);
  }
  console.log("Mongo bootstrap complete. All environment databases are ready.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Mongo bootstrap failed:");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
