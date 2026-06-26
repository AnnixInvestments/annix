import { config as dotenvConfig } from "dotenv";
import mongoose from "mongoose";
import { cleanupEmptyCollections } from "../src/lib/persistence/empty-collection-cleanup";

dotenvConfig({ path: ".env" });

async function main(): Promise<void> {
  const useOrbit = process.argv.includes("--orbit");
  const uri = useOrbit ? process.env.ORBIT_MONGODB_URI : process.env.MONGODB_URI;
  const databaseName = useOrbit ? process.env.ORBIT_MONGO_DATABASE : process.env.MONGO_DATABASE;
  if (!uri || !databaseName) {
    const required = useOrbit
      ? "ORBIT_MONGODB_URI and ORBIT_MONGO_DATABASE"
      : "MONGODB_URI and MONGO_DATABASE";
    throw new Error(`${required} are required`);
  }

  const apply = process.argv.includes("--apply");
  const allowProduction =
    process.argv.includes("--allow-production") || process.env.ALLOW_PRODUCTION === "true";
  const nearCapOnly = process.argv.includes("--near-cap-only");
  const collectionCap = 500;
  const nearCapThreshold = Number(process.env.EMPTY_SWEEP_THRESHOLD ?? 450);

  const protectedDatabaseName = useOrbit ? "orbit_production" : "annix_production";
  if (databaseName === protectedDatabaseName && !allowProduction) {
    throw new Error(
      `Refusing to target ${protectedDatabaseName} without --allow-production (or ALLOW_PRODUCTION=true)`,
    );
  }

  const connection = await mongoose.createConnection(uri, { dbName: databaseName }).asPromise();
  try {
    if (nearCapOnly && connection.db != null) {
      const existing = await connection.db.listCollections({}, { nameOnly: true }).toArray();
      if (existing.length < nearCapThreshold) {
        console.log(
          `Collection count ${existing.length} is below the near-cap threshold ${nearCapThreshold} (cap ${collectionCap}) in ${databaseName} — skipping deploy-time sweep (the nightly cron still sweeps fully).`,
        );
        return;
      }
      console.log(
        `Collection count ${existing.length} >= near-cap threshold ${nearCapThreshold} (cap ${collectionCap}) in ${databaseName} — running sweep.`,
      );
    }

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
