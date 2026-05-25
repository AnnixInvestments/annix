import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Bring prod's Orbit Job Market to the full 7-source, all-enabled state (ref
 * #305). The 4 crawl sources are seeded elsewhere (disabled); the 3 API sources
 * (Adzuna/Remotive/DPSA) were only ever created via the admin "Add Source" UI,
 * so they don't exist on a fresh DB. This seeds those 3 (idempotently) and
 * enables ALL platform-global sources so the hourly poll cron starts ingesting.
 *
 * NOTE: Adzuna/Remotive require their API keys present as runtime secrets to
 * actually fetch; without them those sources simply no-op.
 */
export class EnableOrbitJobMarketSources1820100002800 implements MigrationInterface {
  name = "EnableOrbitJobMarketSources1820100002800";

  private readonly API_PROVIDERS = ["adzuna", "remotive", "dpsa"];

  // Literal INSERTs (no bind params) to avoid Postgres param-type inference
  // issues on INSERT...SELECT; each is idempotent via WHERE NOT EXISTS.
  private readonly API_SEED_SQL = [
    `INSERT INTO "cv_assistant_job_market_sources"
       ("provider", "name", "country_codes", "categories", "enabled",
        "rate_limit_per_day", "ingestion_interval_hours", "requires_vetting", "company_id")
     SELECT 'adzuna', 'Adzuna (ZA)', '["za"]'::jsonb, '[]'::jsonb, true, 25, 24, false, NULL
     WHERE NOT EXISTS (SELECT 1 FROM "cv_assistant_job_market_sources" s WHERE s.provider = 'adzuna' AND s.company_id IS NULL)`,
    `INSERT INTO "cv_assistant_job_market_sources"
       ("provider", "name", "country_codes", "categories", "enabled",
        "rate_limit_per_day", "ingestion_interval_hours", "requires_vetting", "company_id")
     SELECT 'remotive', 'Remotive (remote tech jobs)', '["za"]'::jsonb, '[]'::jsonb, true, 250, 24, true, NULL
     WHERE NOT EXISTS (SELECT 1 FROM "cv_assistant_job_market_sources" s WHERE s.provider = 'remotive' AND s.company_id IS NULL)`,
    `INSERT INTO "cv_assistant_job_market_sources"
       ("provider", "name", "country_codes", "categories", "enabled",
        "rate_limit_per_day", "ingestion_interval_hours", "requires_vetting", "company_id")
     SELECT 'dpsa', 'DPSA Public Service Vacancy Circulars', '["za"]'::jsonb, '[]'::jsonb, true, 10, 168, false, NULL
     WHERE NOT EXISTS (SELECT 1 FROM "cv_assistant_job_market_sources" s WHERE s.provider = 'dpsa' AND s.company_id IS NULL)`,
  ];

  public async up(queryRunner: QueryRunner): Promise<void> {
    for (const sql of this.API_SEED_SQL) {
      await queryRunner.query(sql);
    }

    // Enable every platform-global source (the 4 crawl sources seed disabled).
    await queryRunner.query(
      `UPDATE "cv_assistant_job_market_sources" SET "enabled" = true WHERE "company_id" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Operational enable state is not reverted; only remove the API source rows this seeded.
    await queryRunner.query(
      `DELETE FROM "cv_assistant_job_market_sources"
       WHERE "company_id" IS NULL AND "provider" = ANY($1)`,
      [this.API_PROVIDERS],
    );
  }
}
