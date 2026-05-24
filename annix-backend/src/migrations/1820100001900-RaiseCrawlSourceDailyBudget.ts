import { MigrationInterface, QueryRunner } from "typeorm";

// Raises the daily page budget for the sitemap-crawl sources so a single
// "Ingest Now" can backfill a full board (paired with CRAWL_MAX_PAGES_PER_RUN
// = 150). Idempotent. (#305)
export class RaiseCrawlSourceDailyBudget1820100001900 implements MigrationInterface {
  name = "RaiseCrawlSourceDailyBudget1820100001900";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "cv_assistant_job_market_sources"
      SET "rate_limit_per_day" = 200
      WHERE "provider" IN ('executiveplacements', 'jobplacements', 'jobmail')
        AND "company_id" IS NULL
        AND "rate_limit_per_day" < 200
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "cv_assistant_job_market_sources"
      SET "rate_limit_per_day" = 60
      WHERE "provider" IN ('executiveplacements', 'jobplacements', 'jobmail')
        AND "company_id" IS NULL
    `);
  }
}
