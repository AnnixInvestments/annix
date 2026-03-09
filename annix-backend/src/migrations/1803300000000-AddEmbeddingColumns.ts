import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEmbeddingColumns1803300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("CREATE EXTENSION IF NOT EXISTS vector");

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "cv_assistant_candidates" ADD COLUMN "embedding" vector(768);
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "cv_assistant_external_jobs" ADD COLUMN "embedding" vector(768);
      EXCEPTION WHEN duplicate_column THEN NULL;
      END $$
    `);

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

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_external_jobs_embedding"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_candidates_embedding"`);
    await queryRunner.query(
      `ALTER TABLE "cv_assistant_external_jobs" DROP COLUMN IF EXISTS "embedding"`,
    );
    await queryRunner.query(
      `ALTER TABLE "cv_assistant_candidates" DROP COLUMN IF EXISTS "embedding"`,
    );
  }
}
