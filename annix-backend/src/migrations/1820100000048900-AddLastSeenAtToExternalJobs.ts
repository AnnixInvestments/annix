import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLastSeenAtToExternalJobs1820100000048900 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cv_assistant_external_jobs"
      ADD COLUMN IF NOT EXISTS "last_seen_at" TIMESTAMPTZ
    `);
    await queryRunner.query(`
      UPDATE "cv_assistant_external_jobs"
      SET "last_seen_at" = COALESCE("last_seen_at", "created_at")
      WHERE "last_seen_at" IS NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_external_jobs_last_seen"
      ON "cv_assistant_external_jobs" ("last_seen_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_external_jobs_last_seen"`);
    await queryRunner.query(`
      ALTER TABLE "cv_assistant_external_jobs"
      DROP COLUMN IF EXISTS "last_seen_at"
    `);
  }
}
