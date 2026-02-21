import { MigrationInterface, QueryRunner } from "typeorm";

export class AddBrandingColorsToStockControlCompanies1793500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "stock_control_companies" ADD COLUMN IF NOT EXISTS "primary_color" VARCHAR(20)`);
    await queryRunner.query(`ALTER TABLE "stock_control_companies" ADD COLUMN IF NOT EXISTS "accent_color" VARCHAR(20)`);
    await queryRunner.query(`ALTER TABLE "stock_control_companies" ADD COLUMN IF NOT EXISTS "logo_url" VARCHAR(500)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "stock_control_companies" DROP COLUMN IF EXISTS "logo_url"`);
    await queryRunner.query(`ALTER TABLE "stock_control_companies" DROP COLUMN IF EXISTS "accent_color"`);
    await queryRunner.query(`ALTER TABLE "stock_control_companies" DROP COLUMN IF EXISTS "primary_color"`);
  }
}
