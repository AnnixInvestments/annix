import { encodeEmbedding } from "./embedding-codec";
import { cosineSimilarity, rankEmbeddingBatches } from "./embedding-similarity";

describe("embedding similarity ranking", () => {
  it("keeps the top results across batches", async () => {
    async function* batches() {
      yield [
        { id: 1, embedding: encodeEmbedding([1, 0]) },
        { id: 2, embedding: encodeEmbedding([0, 1]) },
      ];
      yield [
        { id: 3, embedding: encodeEmbedding([0.9, 0.1]) },
        { id: 4, embedding: encodeEmbedding([0.5, 0.5]) },
      ];
    }

    const ranked = await rankEmbeddingBatches([1, 0], batches(), 2);

    expect(ranked.map((row) => row.id)).toEqual([1, 3]);
    expect(ranked[0].similarity).toBeGreaterThan(ranked[1].similarity);
  });

  it("skips invalid embeddings without dropping valid rows", async () => {
    async function* batches() {
      yield [
        { id: 1, embedding: null },
        { id: 2, embedding: encodeEmbedding([1, 0]) },
        { id: 3, embedding: encodeEmbedding([1, 0, 0]) },
      ];
    }

    const ranked = await rankEmbeddingBatches([1, 0], batches(), 5);

    expect(ranked).toEqual([{ id: 2, similarity: 1 }]);
  });

  it("returns null for mismatched cosine vectors", () => {
    expect(cosineSimilarity([1, 0], [1, 0, 0])).toBeNull();
  });
});
