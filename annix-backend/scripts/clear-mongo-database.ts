import { readFileSync } from "node:fs";
import { config as dotenvConfig } from "dotenv";
import mongoose from "mongoose";

dotenvConfig({ path: ".env" });

const permittedTargetDatabases = new Set(["annix_staging", "annix_test"]);

function collectionNamesFromFile(filePath: string | undefined): Set<string> {
  if (!filePath) {
    return new Set();
  }
  return new Set(
    readFileSync(filePath, "utf8")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0),
  );
}

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  const databaseName = process.env.MONGO_DATABASE;
  if (!uri || !databaseName) {
    throw new Error("MONGODB_URI and MONGO_DATABASE are required");
  }
  if (!permittedTargetDatabases.has(databaseName)) {
    throw new Error(`Refusing to clear non-test target database "${databaseName}"`);
  }

  const preserved = collectionNamesFromFile(process.env.PRESERVE_COLLECTIONS_FILE);
  const connection = await mongoose.createConnection(uri, { dbName: databaseName }).asPromise();
  try {
    const database = connection.db;
    if (!database) {
      throw new Error("Mongo connection has no database handle");
    }
    const names = (await database.listCollections({}, { nameOnly: true }).toArray())
      .map((collection) => collection.name)
      .filter((name) => !name.startsWith("system.") && !preserved.has(name));

    let deletedDocuments = 0;
    for (const name of names) {
      const result = await database.collection(name).deleteMany({});
      deletedDocuments += result.deletedCount;
    }
    console.log(
      `Cleared ${deletedDocuments} document(s) from ${names.length} collection(s) in "${databaseName}", preserving ${preserved.size} configured collection(s).`,
    );
  } finally {
    await connection.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
