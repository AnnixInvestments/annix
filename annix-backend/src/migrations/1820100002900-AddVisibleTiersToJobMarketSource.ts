import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Per-source seeker match-tier visibility (#305): a source's jobs can be gated
 * to specific tiers (soft/medium/hard). NULL = visible to all tiers (default,
 * so existing sources are unchanged). Idempotent.
 */
export class AddVisibleTiersToJobMarketSource1820100002900 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cv_assistant_job_market_sources" ADD COLUMN IF NOT EXISTS "visible_tiers" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "cv_assistant_job_market_sources" DROP COLUMN IF EXISTS "visible_tiers"`,
    );
  }
}
