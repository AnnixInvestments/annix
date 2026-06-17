import { MigrationInterface, QueryRunner } from "typeorm";

export class AddConsecutiveIngestFailuresToJobMarketSources1820100003900
  implements MigrationInterface
{
  name = "AddConsecutiveIngestFailuresToJobMarketSources1820100003900";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cv_assistant_job_market_sources"
      ADD COLUMN IF NOT EXISTS "consecutive_ingest_failures" integer NOT NULL DEFAULT 0
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cv_assistant_job_market_sources"
      DROP COLUMN IF EXISTS "consecutive_ingest_failures"
    `);
  }
}
