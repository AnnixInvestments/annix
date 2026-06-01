import { config as dotenvConfig } from "dotenv";
import mongoose from "mongoose";
import { cleanupEmptyCollections } from "../src/lib/persistence/empty-collection-cleanup";

dotenvConfig({ path: ".env" });

async function main(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  const databaseName = process.env.MONGO_DATABASE;
  if (!uri || !databaseName) {
    throw new Error("MONGODB_URI and MONGO_DATABASE are required");
  }

  const apply = process.argv.includes("--apply");
  const allowProduction =
    process.argv.includes("--allow-production") || process.env.ALLOW_PRODUCTION === "true";

  if (databaseName === "annix_production" && !allowProduction) {
    throw new Error(
      "Refusing to target annix_production without --allow-production (or ALLOW_PRODUCTION=true)",
    );
  }

  const connection = await mongoose.createConnection(uri, { dbName: databaseName }).asPromise();
  try {
    const result = await cleanupEmptyCollections(connection, {
      apply,
      onProgress: (dropped, total) => console.log(`Dropped ${dropped}/${total}...`),
    });

    const populated = result.scanned - result.empty;
    console.log(`Database: ${databaseName}`);
    console.log(`Total collections: ${result.scanned}`);
    console.log(`With data: ${populated}`);
    console.log(`Empty: ${result.empty}`);
    console.log(`Droppable (empty, no secondary indexes): ${result.droppable.length}`);
    if (result.keptWithIndexes.length > 0) {
      console.log(`Kept (empty but carry a secondary index): ${result.keptWithIndexes.length}`);
      result.keptWithIndexes.forEach((name) => console.log(`  keep ${name}`));
    }

    if (result.droppable.length === 0) {
      console.log("Nothing to drop.");
      return;
    }

    if (!apply) {
      console.log("\n--- DRY RUN (no changes). Re-run with --apply to drop these: ---");
      result.droppable.forEach((name) => console.log(`  ${name}`));
      console.log(
        `\nWould drop ${result.droppable.length} empty collections, leaving ${populated}.`,
      );
      return;
    }

    console.log(`\nDropped ${result.dropped.length} empty collections from ${databaseName}.`);
    if (result.failed.length > 0) {
      console.log(`Failed to drop ${result.failed.length}:`);
      result.failed.forEach((failure) => console.log(`  ${failure.name}: ${failure.reason}`));
    }
    console.log(`Remaining: ${populated} (collections that held data).`);
  } finally {
    await connection.close();
  }
}

void main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`);
  process.exit(1);
});
