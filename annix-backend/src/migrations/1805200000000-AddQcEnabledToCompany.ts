import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddQcEnabledToCompany1805200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_control_companies
        ADD COLUMN IF NOT EXISTS qc_enabled boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_control_companies
        DROP COLUMN IF EXISTS qc_enabled
    `);
  }
}
