import { MigrationInterface, QueryRunner } from "typeorm";

// Seeds platform-global JobMarketSource rows for the open SA boards ingested via
// the shared sitemap-crawl engine (see #305). Seeded DISABLED so an admin can
// run "Ingest Now" to verify extraction before the source goes live in the feed.
export class SeedSitemapCrawlJobSources1820100001700 implements MigrationInterface {
  name = "SeedSitemapCrawlJobSources1820100001700";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "cv_assistant_job_market_sources"
        ("provider", "name", "country_codes", "categories", "enabled",
         "rate_limit_per_day", "ingestion_interval_hours", "requires_vetting", "company_id")
      SELECT v.provider, v.name, '["za"]'::jsonb, '[]'::jsonb, false, 60, 24, true, NULL
      FROM (VALUES
        ('executiveplacements', 'Executive Placements (ZA)'),
        ('jobplacements', 'Job Placements (ZA)'),
        ('jobmail', 'JobMail (ZA)')
      ) AS v(provider, name)
      WHERE NOT EXISTS (
        SELECT 1 FROM "cv_assistant_job_market_sources" s
        WHERE s.provider = v.provider AND s.company_id IS NULL
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "cv_assistant_job_market_sources"
      WHERE "provider" IN ('executiveplacements', 'jobplacements', 'jobmail')
        AND "company_id" IS NULL
    `);
  }
}
