import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRollNumbersJsonToStockItems1819200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_items
      ADD COLUMN IF NOT EXISTS roll_numbers jsonb DEFAULT NULL
    `);

    await queryRunner.query(`
      UPDATE stock_items
      SET roll_numbers = jsonb_build_array(roll_number)
      WHERE roll_number IS NOT NULL
        AND roll_numbers IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_items
      DROP COLUMN IF EXISTS roll_numbers
    `);
  }
}
