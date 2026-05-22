import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRequiresVettingToJobMarketSources1820100000203 implements MigrationInterface {
  name = "AddRequiresVettingToJobMarketSources1820100000203";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cv_assistant_job_market_sources"
      ADD COLUMN IF NOT EXISTS "requires_vetting" boolean NOT NULL DEFAULT true
    `);

    await queryRunner.query(`
      UPDATE "cv_assistant_job_market_sources"
      SET "requires_vetting" = false
      WHERE "provider" IN ('adzuna', 'jooble', 'dpsa')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cv_assistant_job_market_sources"
      DROP COLUMN IF EXISTS "requires_vetting"
    `);
  }
}
