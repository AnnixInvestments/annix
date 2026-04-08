import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddPricePerKgToOrderItem1817000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_order_item
      ADD COLUMN IF NOT EXISTS price_per_kg DECIMAL(12,4) NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_order_item DROP COLUMN IF EXISTS price_per_kg
    `);
  }
}
