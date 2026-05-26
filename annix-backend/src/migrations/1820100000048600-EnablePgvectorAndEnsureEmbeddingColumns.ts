import { MigrationInterface, QueryRunner } from "typeorm";

const VECTOR_TABLES = ["cv_assistant_candidates", "cv_assistant_external_jobs"] as const;

// The original AddEmbeddingColumns migration skipped CREATE EXTENSION + the
// embedding columns whenever pgvector wasn't yet listed as available at run time,
// which left the `vector` type unusable in production — every embed failed with
// `type "vector" does not exist`, so no candidate/job embedding could ever be
// stored and CV->job matching never produced results. Enable pgvector
// unconditionally (Neon supports it) and idempotently re-assert the embedding
// columns + ivfflat indexes. All current embeddings are NULL, so recreating a
// column that somehow isn't a `vector` type loses no data.
export class EnablePgvectorAndEnsureEmbeddingColumns1820100000048600 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("CREATE EXTENSION IF NOT EXISTS vector");

    await VECTOR_TABLES.reduce(async (prev, table) => {
      await prev;
      await this.ensureVectorColumn(queryRunner, table);
    }, Promise.resolve());

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_candidates_embedding"
      ON "cv_assistant_candidates"
      USING ivfflat ("embedding" vector_cosine_ops)
      WITH (lists = 100)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_external_jobs_embedding"
      ON "cv_assistant_external_jobs"
      USING ivfflat ("embedding" vector_cosine_ops)
      WITH (lists = 100)
    `);
  }

  private async ensureVectorColumn(queryRunner: QueryRunner, table: string): Promise<void> {
    const rows: Array<{ udt_name: string }> = await queryRunner.query(
      `SELECT udt_name FROM information_schema.columns
       WHERE table_name = $1 AND column_name = 'embedding'`,
      [table],
    );

    if (rows.length === 0) {
      await queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN "embedding" vector(768)`);
    } else if (rows[0].udt_name !== "vector") {
      await queryRunner.query(`ALTER TABLE "${table}" DROP COLUMN "embedding"`);
      await queryRunner.query(`ALTER TABLE "${table}" ADD COLUMN "embedding" vector(768)`);
    }
  }

  public async down(): Promise<void> {
    // No-op: enabling pgvector and ensuring the embedding columns is not
    // meaningfully reversible without dropping the matching feature's storage.
  }
}
