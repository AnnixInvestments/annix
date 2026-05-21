import { MigrationInterface, QueryRunner } from "typeorm";

export class AddVettingToExternalJobs1820100000202 implements MigrationInterface {
  name = "AddVettingToExternalJobs1820100000202";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cv_assistant_external_jobs"
      ADD COLUMN IF NOT EXISTS "accepts_za" boolean,
      ADD COLUMN IF NOT EXISTS "vetting_notes" text,
      ADD COLUMN IF NOT EXISTS "vetted_at" timestamptz
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_external_jobs_accepts_za"
      ON "cv_assistant_external_jobs" ("accepts_za")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_external_jobs_accepts_za"
    `);
    await queryRunner.query(`
      ALTER TABLE "cv_assistant_external_jobs"
      DROP COLUMN IF EXISTS "vetted_at",
      DROP COLUMN IF EXISTS "vetting_notes",
      DROP COLUMN IF EXISTS "accepts_za"
    `);
  }
}
