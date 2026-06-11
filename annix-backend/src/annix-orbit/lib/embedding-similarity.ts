import { decodeEmbedding } from "./embedding-codec";

export interface EmbeddingSimilarityRow {
  id: number;
  embedding: unknown;
}

export type EmbeddingSimilarityBatch = EmbeddingSimilarityRow[];

export function parseEmbedding(raw: unknown): number[] | null {
  return decodeEmbedding(raw);
}

export function cosineSimilarity(a: number[], b: number[]): number | null {
  if (a.length === 0 || a.length !== b.length) {
    return null;
  }
  const dot = a.reduce((sum, value, index) => sum + value * b[index], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, value) => sum + value * value, 0));
  if (magnitudeA === 0 || magnitudeB === 0) {
    return null;
  }
  return dot / (magnitudeA * magnitudeB);
}

export async function rankEmbeddingBatches(
  queryVector: number[],
  batches: AsyncIterable<EmbeddingSimilarityBatch>,
  limit: number,
): Promise<Array<{ id: number; similarity: number }>> {
  if (limit <= 0) {
    return [];
  }

  const top: Array<{ id: number; similarity: number }> = [];

  for await (const batch of batches) {
    for (const row of batch) {
      const vector = parseEmbedding(row.embedding);
      if (vector === null) {
        continue;
      }
      const similarity = cosineSimilarity(queryVector, vector);
      if (similarity === null) {
        continue;
      }
      top.push({ id: row.id, similarity });
    }
    top.sort((left, right) => right.similarity - left.similarity);
    if (top.length > limit) {
      top.length = limit;
    }
  }

  return top;
}
