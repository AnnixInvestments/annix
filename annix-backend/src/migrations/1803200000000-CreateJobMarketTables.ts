import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateJobMarketTables1803200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cv_assistant_job_market_sources" (
        "id" SERIAL PRIMARY KEY,
        "provider" VARCHAR(50) NOT NULL,
        "name" VARCHAR(255) NOT NULL,
        "api_id" VARCHAR(255),
        "api_key_encrypted" VARCHAR(500),
        "country_codes" JSONB NOT NULL DEFAULT '["za"]',
        "categories" JSONB NOT NULL DEFAULT '[]',
        "enabled" BOOLEAN NOT NULL DEFAULT true,
        "rate_limit_per_day" INT NOT NULL DEFAULT 250,
        "requests_today" INT NOT NULL DEFAULT 0,
        "requests_reset_at" TIMESTAMPTZ,
        "last_ingested_at" TIMESTAMPTZ,
        "ingestion_interval_hours" INT NOT NULL DEFAULT 6,
        "company_id" INT NOT NULL REFERENCES "cv_assistant_companies"("id") ON DELETE CASCADE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cv_assistant_external_jobs" (
        "id" SERIAL PRIMARY KEY,
        "title" VARCHAR(500) NOT NULL,
        "company" VARCHAR(500),
        "country" VARCHAR(10) NOT NULL DEFAULT 'za',
        "location_raw" VARCHAR(500),
        "location_area" VARCHAR(255),
        "salary_min" DECIMAL(12, 2),
        "salary_max" DECIMAL(12, 2),
        "salary_currency" VARCHAR(10),
        "description" TEXT,
        "extracted_skills" JSONB NOT NULL DEFAULT '[]',
        "category" VARCHAR(255),
        "source_external_id" VARCHAR(255) NOT NULL,
        "source_url" VARCHAR(1000),
        "posted_at" TIMESTAMPTZ,
        "expires_at" TIMESTAMPTZ,
        "source_id" INT NOT NULL REFERENCES "cv_assistant_job_market_sources"("id") ON DELETE CASCADE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_external_jobs_source_id"
      ON "cv_assistant_external_jobs" ("source_external_id", "source_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_external_jobs_location"
      ON "cv_assistant_external_jobs" ("country", "location_area")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_external_jobs_category"
      ON "cv_assistant_external_jobs" ("category")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "cv_assistant_external_jobs"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cv_assistant_job_market_sources"`);
  }
}
