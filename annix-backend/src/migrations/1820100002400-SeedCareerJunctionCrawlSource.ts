import { MigrationInterface, QueryRunner } from "typeorm";

// Seeds the CareerJunction crawl source (#305). It was added to the provider
// enum + crawl-profile registry but never seeded. Seeded DISABLED (admin runs
// "Ingest Now" to verify extraction first), with the raised 200/day budget the
// other crawl sources use. Also adds its source-respect rank. Idempotent.
export class SeedCareerJunctionCrawlSource1820100002400 implements MigrationInterface {
  name = "SeedCareerJunctionCrawlSource1820100002400";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "cv_assistant_job_market_sources"
        ("provider", "name", "country_codes", "categories", "enabled",
         "rate_limit_per_day", "ingestion_interval_hours", "requires_vetting", "company_id")
      SELECT 'careerjunction', 'CareerJunction (ZA)', '["za"]'::jsonb, '[]'::jsonb, false, 200, 24, true, NULL
      WHERE NOT EXISTS (
        SELECT 1 FROM "cv_assistant_job_market_sources" s
        WHERE s.provider = 'careerjunction' AND s.company_id IS NULL
      )
    `);

    await queryRunner.query(`
      INSERT INTO "cv_assistant_source_respect_ranks" ("provider", "rank", "label", "rationale")
      VALUES ('careerjunction', 72, 'CareerJunction', 'Established SA mid/professional board; direct recruiter postings with rich detail. Crawled via HTML listing-page discovery (no sitemap).')
      ON CONFLICT ("provider") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "cv_assistant_job_market_sources"
      WHERE "provider" = 'careerjunction' AND "company_id" IS NULL
    `);
    await queryRunner.query(`
      DELETE FROM "cv_assistant_source_respect_ranks" WHERE "provider" = 'careerjunction'
    `);
  }
}
