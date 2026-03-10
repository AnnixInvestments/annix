import type { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeQuantityColumnsToNumeric1804200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE delivery_note_items
      ALTER COLUMN quantity_received TYPE numeric(12,2)
      USING quantity_received::numeric(12,2)
    `);

    await queryRunner.query(`
      ALTER TABLE stock_movements
      ALTER COLUMN quantity TYPE numeric(12,2)
      USING quantity::numeric(12,2)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE delivery_note_items
      ALTER COLUMN quantity_received TYPE integer
      USING quantity_received::integer
    `);

    await queryRunner.query(`
      ALTER TABLE stock_movements
      ALTER COLUMN quantity TYPE integer
      USING quantity::integer
    `);
  }
}
