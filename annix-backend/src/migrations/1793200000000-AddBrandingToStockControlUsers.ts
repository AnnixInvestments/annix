import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBrandingToStockControlUsers1793200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "stock_control_users"
      ADD COLUMN "branding_type" varchar(20) NOT NULL DEFAULT 'annix',
      ADD COLUMN "website_url" varchar(500),
      ADD COLUMN "branding_authorized" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "stock_control_users"
      DROP COLUMN "branding_authorized",
      DROP COLUMN "website_url",
      DROP COLUMN "branding_type"
    `);
  }
}
