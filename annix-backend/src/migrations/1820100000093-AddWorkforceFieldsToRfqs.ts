import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddWorkforceFieldsToRfqs1820100000093 implements MigrationInterface {
  name = "AddWorkforceFieldsToRfqs1820100000093";

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "rfqs"
        ADD COLUMN IF NOT EXISTS "required_trades" jsonb NULL,
        ADD COLUMN IF NOT EXISTS "estimated_headcount" int NULL,
        ADD COLUMN IF NOT EXISTS "radius_km" int NULL,
        ADD COLUMN IF NOT EXISTS "project_location" varchar(500) NULL,
        ADD COLUMN IF NOT EXISTS "project_location_lat" double precision NULL,
        ADD COLUMN IF NOT EXISTS "project_location_lon" double precision NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_rfqs_required_trades"
        ON "rfqs"
        USING GIN ("required_trades" jsonb_path_ops)
        WHERE "required_trades" IS NOT NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_rfqs_required_trades"`);
    await queryRunner.query(`
      ALTER TABLE "rfqs"
        DROP COLUMN IF EXISTS "project_location_lon",
        DROP COLUMN IF EXISTS "project_location_lat",
        DROP COLUMN IF EXISTS "project_location",
        DROP COLUMN IF EXISTS "radius_km",
        DROP COLUMN IF EXISTS "estimated_headcount",
        DROP COLUMN IF EXISTS "required_trades"
    `);
  }
}
