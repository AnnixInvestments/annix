import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCpoUnitPriceToOrderItem1816900000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_order_item
      ADD COLUMN IF NOT EXISTS cpo_unit_price DECIMAL(12,2) NULL
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE rubber_order_item DROP COLUMN IF EXISTS cpo_unit_price");
  }
}
