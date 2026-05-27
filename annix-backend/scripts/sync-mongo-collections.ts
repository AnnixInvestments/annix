import { readFileSync } from "node:fs";
import { config as dotenvConfig } from "dotenv";
import mongoose from "mongoose";

dotenvConfig({ path: ".env" });

const permittedTargetDatabases = new Set(["annix_staging", "annix_test"]);
const batchSize = 500;

function collectionNames(filePath: string): string[] {
  return readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

async function main(): Promise<void> {
  const sourceUri = process.env.SOURCE_MONGODB_URI;
  const sourceDatabaseName = process.env.SOURCE_MONGO_DATABASE;
  const targetUri = process.env.MONGODB_URI;
  const targetDatabaseName = process.env.MONGO_DATABASE;
  const collectionsFile = process.env.MONGO_COLLECTIONS_FILE;
  if (!sourceUri || !sourceDatabaseName || !targetUri || !targetDatabaseName || !collectionsFile) {
    throw new Error(
      "SOURCE_MONGODB_URI, SOURCE_MONGO_DATABASE, MONGODB_URI, MONGO_DATABASE and MONGO_COLLECTIONS_FILE are required",
    );
  }
  if (!permittedTargetDatabases.has(targetDatabaseName)) {
    throw new Error(`Refusing to write to non-test target database "${targetDatabaseName}"`);
  }
  if (sourceUri === targetUri && sourceDatabaseName === targetDatabaseName) {
    throw new Error("Source and target databases must be different");
  }

  const names = collectionNames(collectionsFile);
  const source = await mongoose
    .createConnection(sourceUri, { dbName: sourceDatabaseName })
    .asPromise();
  const target = await mongoose
    .createConnection(targetUri, { dbName: targetDatabaseName })
    .asPromise();
  try {
    const sourceDatabase = source.db;
    const targetDatabase = target.db;
    if (!sourceDatabase || !targetDatabase) {
      throw new Error("Mongo connection has no database handle");
    }

    let copiedDocuments = 0;
    for (const name of names) {
      await targetDatabase.collection(name).deleteMany({});
      const cursor = sourceDatabase.collection(name).find({}).batchSize(batchSize);
      let batch: Record<string, unknown>[] = [];
      let collectionDocuments = 0;
      for await (const document of cursor) {
        batch.push(document);
        if (batch.length === batchSize) {
          await targetDatabase.collection(name).insertMany(batch);
          collectionDocuments += batch.length;
          batch = [];
        }
      }
      if (batch.length > 0) {
        await targetDatabase.collection(name).insertMany(batch);
        collectionDocuments += batch.length;
      }
      copiedDocuments += collectionDocuments;
      console.log(`${name}: ${collectionDocuments} document(s) copied`);
    }
    console.log(
      `Copied ${copiedDocuments} document(s) across ${names.length} collection(s) into "${targetDatabaseName}".`,
    );
  } finally {
    await source.close();
    await target.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
