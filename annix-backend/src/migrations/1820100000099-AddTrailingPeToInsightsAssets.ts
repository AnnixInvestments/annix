import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTrailingPeToInsightsAssets1820100000099 implements MigrationInterface {
  name = "AddTrailingPeToInsightsAssets1820100000099";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "insights_assets"
      ADD COLUMN IF NOT EXISTS "trailing_pe" numeric(12,4),
      ADD COLUMN IF NOT EXISTS "pe_updated_at" timestamptz
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "insights_assets"
      DROP COLUMN IF EXISTS "pe_updated_at",
      DROP COLUMN IF EXISTS "trailing_pe"
    `);
  }
}
