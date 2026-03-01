import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCostAndPriceToRubberRollStock1772000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_roll_stock
      ADD COLUMN cost_zar DECIMAL(12, 2) NULL,
      ADD COLUMN price_zar DECIMAL(12, 2) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_roll_stock
      DROP COLUMN cost_zar,
      DROP COLUMN price_zar
    `);
  }
}
