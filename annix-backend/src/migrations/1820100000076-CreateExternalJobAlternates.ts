import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateExternalJobAlternates1820100000076 implements MigrationInterface {
  name = "CreateExternalJobAlternates1820100000076";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("CREATE EXTENSION IF NOT EXISTS pg_trgm");

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cv_assistant_external_job_alternates" (
        "id" SERIAL PRIMARY KEY,
        "canonical_external_job_id" int NOT NULL,
        "source_id" int NOT NULL,
        "source_external_id" varchar(255) NOT NULL,
        "source_url" varchar(1000) NULL,
        "title" varchar(500) NOT NULL,
        "company" varchar(500) NULL,
        "location_area" varchar(255) NULL,
        "created_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "cv_assistant_external_job_alternates"
          ADD CONSTRAINT "fk_alt_canonical_job"
          FOREIGN KEY ("canonical_external_job_id")
          REFERENCES "cv_assistant_external_jobs"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "cv_assistant_external_job_alternates"
          ADD CONSTRAINT "fk_alt_source"
          FOREIGN KEY ("source_id")
          REFERENCES "cv_assistant_job_market_sources"("id") ON DELETE CASCADE;
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "ux_alt_source_external"
        ON "cv_assistant_external_job_alternates" ("source_id", "source_external_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_alt_canonical_job"
        ON "cv_assistant_external_job_alternates" ("canonical_external_job_id")
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_external_jobs_title_trgm"
        ON "cv_assistant_external_jobs"
        USING gin ("title" gin_trgm_ops)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_external_jobs_title_trgm"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cv_assistant_external_job_alternates"`);
  }
}
