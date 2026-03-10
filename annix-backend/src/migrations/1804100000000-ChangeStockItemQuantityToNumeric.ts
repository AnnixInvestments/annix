import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeStockItemQuantityToNumeric1804100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_items
      ALTER COLUMN quantity TYPE NUMERIC(12, 2) USING quantity::NUMERIC(12, 2);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE stock_items
      ALTER COLUMN quantity TYPE INTEGER USING quantity::INTEGER;
    `);
  }
}
