import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCostAndPriceToRubberRollStock1799620000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_roll_stock
      ADD COLUMN IF NOT EXISTS cost_zar DECIMAL(12, 2) NULL,
      ADD COLUMN IF NOT EXISTS price_zar DECIMAL(12, 2) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_roll_stock
      DROP COLUMN IF EXISTS cost_zar,
      DROP COLUMN IF EXISTS price_zar
    `);
  }
}
