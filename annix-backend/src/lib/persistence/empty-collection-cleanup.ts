import type { Connection } from "mongoose";

export interface EmptyCollectionCleanupResult {
  scanned: number;
  empty: number;
  droppable: string[];
  dropped: string[];
  keptWithIndexes: string[];
  failed: { name: string; reason: string }[];
}

const dropBatchSize = 20;

function chunk<T>(items: T[], size: number): T[][] {
  return items.reduce<T[][]>((batches, item, index) => {
    const batchIndex = Math.floor(index / size);
    return batchIndex < batches.length
      ? batches.map((batch, i) => (i === batchIndex ? [...batch, item] : batch))
      : [...batches, [item]];
  }, []);
}

async function dropBatches(
  connection: Connection,
  droppable: string[],
  onProgress: ((dropped: number, total: number) => void) | null,
): Promise<{ dropped: string[]; failed: { name: string; reason: string }[] }> {
  return chunk(droppable, dropBatchSize).reduce<
    Promise<{ dropped: string[]; failed: { name: string; reason: string }[] }>
  >(
    async (accPromise, batch) => {
      const acc = await accPromise;
      const results = await Promise.all(
        batch.map(async (name): Promise<{ name: string; reason: string | null }> => {
          try {
            await connection.dropCollection(name);
            return { name, reason: null };
          } catch (error) {
            return { name, reason: error instanceof Error ? error.message : String(error) };
          }
        }),
      );
      const dropped = [
        ...acc.dropped,
        ...results.filter((result) => result.reason === null).map((result) => result.name),
      ];
      const failed = [
        ...acc.failed,
        ...results
          .filter((result) => result.reason !== null)
          .map((result) => ({ name: result.name, reason: result.reason as string })),
      ];
      if (onProgress) {
        onProgress(dropped.length, droppable.length);
      }
      return { dropped, failed };
    },
    Promise.resolve({ dropped: [], failed: [] }),
  );
}

export async function cleanupEmptyCollections(
  connection: Connection,
  options: { apply: boolean; onProgress?: ((dropped: number, total: number) => void) | null },
): Promise<EmptyCollectionCleanupResult> {
  const collections = await connection.listCollections();
  const names = collections
    .map((collection) => collection.name)
    .filter((name) => !name.startsWith("_"));

  const withCounts = await Promise.all(
    names.map(async (name) => ({
      name,
      count: await connection.collection(name).estimatedDocumentCount(),
    })),
  );

  const emptyNames = withCounts.filter((entry) => entry.count === 0).map((entry) => entry.name);

  const withIndexInfo = await Promise.all(
    emptyNames.map(async (name) => ({
      name,
      secondaryIndexes: (await connection.collection(name).indexes()).filter(
        (index) => index.name !== "_id_",
      ).length,
    })),
  );

  const droppable = withIndexInfo
    .filter((entry) => entry.secondaryIndexes === 0)
    .map((entry) => entry.name)
    .sort();
  const keptWithIndexes = withIndexInfo
    .filter((entry) => entry.secondaryIndexes > 0)
    .map((entry) => entry.name)
    .sort();

  if (!options.apply) {
    return {
      scanned: names.length,
      empty: emptyNames.length,
      droppable,
      dropped: [],
      keptWithIndexes,
      failed: [],
    };
  }

  const outcomes = await dropBatches(connection, droppable, options.onProgress ?? null);

  return {
    scanned: names.length,
    empty: emptyNames.length,
    droppable,
    dropped: outcomes.dropped,
    keptWithIndexes,
    failed: outcomes.failed,
  };
}
