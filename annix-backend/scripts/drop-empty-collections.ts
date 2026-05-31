import { config as dotenvConfig } from "dotenv";
import mongoose from "mongoose";

dotenvConfig({ path: ".env" });

const dropBatchSize = 20;

function chunk<T>(items: T[], size: number): T[][] {
  return items.reduce<T[][]>((batches, item, index) => {
    const batchIndex = Math.floor(index / size);
    const current = batches[batchIndex] ?? [];
    return batchIndex < batches.length
      ? batches.map((b, i) => (i === batchIndex ? [...b, item] : b))
      : [...batches, [...current, item]];
  }, []);
}

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
    const collections = await connection.listCollections();
    const names = collections.map((c) => c.name).filter((name) => !name.startsWith("_"));

    const withCounts = await Promise.all(
      names.map(async (name) => ({
        name,
        count: await connection.collection(name).estimatedDocumentCount(),
      })),
    );

    const empty = withCounts
      .filter((entry) => entry.count === 0)
      .map((entry) => entry.name)
      .sort();
    const populated = withCounts.length - empty.length;

    console.log(`Database: ${databaseName}`);
    console.log(`Total collections: ${withCounts.length}`);
    console.log(`With data: ${populated}`);
    console.log(`Empty (drop candidates): ${empty.length}`);

    if (empty.length === 0) {
      console.log("Nothing to drop.");
      return;
    }

    if (!apply) {
      console.log("\n--- DRY RUN (no changes). Re-run with --apply to drop these: ---");
      empty.forEach((name) => console.log(`  ${name}`));
      console.log(`\nWould drop ${empty.length} empty collections, leaving ${populated}.`);
      return;
    }

    const batches = chunk(empty, dropBatchSize);
    const dropped = await batches.reduce<Promise<string[]>>(async (accPromise, batch) => {
      const acc = await accPromise;
      const results = await Promise.all(
        batch.map(async (name) => {
          await connection.dropCollection(name);
          return name;
        }),
      );
      console.log(`Dropped ${acc.length + results.length}/${empty.length}...`);
      return [...acc, ...results];
    }, Promise.resolve([]));

    console.log(`\nDropped ${dropped.length} empty collections from ${databaseName}.`);
    console.log(`Remaining: ${populated} (collections that held data).`);
  } finally {
    await connection.close();
  }
}

void main().catch((err) => {
  process.stderr.write(`${err instanceof Error ? (err.stack ?? err.message) : String(err)}\n`);
  process.exit(1);
});
