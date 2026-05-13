import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddLocationCoordinatesAndGeocodeCache1820100000091 implements MigrationInterface {
  name = "AddLocationCoordinatesAndGeocodeCache1820100000091";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "cv_assistant_candidates"
        ADD COLUMN IF NOT EXISTS "location_lat" double precision NULL,
        ADD COLUMN IF NOT EXISTS "location_lon" double precision NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "cv_assistant_external_jobs"
        ADD COLUMN IF NOT EXISTS "location_lat" double precision NULL,
        ADD COLUMN IF NOT EXISTS "location_lon" double precision NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cv_assistant_geocode_cache" (
        "address" varchar(500) PRIMARY KEY,
        "lat" double precision NOT NULL,
        "lon" double precision NOT NULL,
        "provider" varchar(50) NOT NULL DEFAULT 'google',
        "geocoded_at" timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_candidates_location_latlon"
        ON "cv_assistant_candidates" ("location_lat", "location_lon")
        WHERE "location_lat" IS NOT NULL AND "location_lon" IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_external_jobs_location_latlon"
        ON "cv_assistant_external_jobs" ("location_lat", "location_lon")
        WHERE "location_lat" IS NOT NULL AND "location_lon" IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_external_jobs_location_latlon"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_candidates_location_latlon"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cv_assistant_geocode_cache"`);
    await queryRunner.query(`
      ALTER TABLE "cv_assistant_external_jobs"
        DROP COLUMN IF EXISTS "location_lon",
        DROP COLUMN IF EXISTS "location_lat"
    `);
    await queryRunner.query(`
      ALTER TABLE "cv_assistant_candidates"
        DROP COLUMN IF EXISTS "location_lon",
        DROP COLUMN IF EXISTS "location_lat"
    `);
  }
}
