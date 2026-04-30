import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDeliveryNoteIdsToRollStock1820100000040 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_roll_stock
      ADD COLUMN IF NOT EXISTS customer_delivery_note_id integer
    `);
    await queryRunner.query(`
      ALTER TABLE rubber_roll_stock
      ADD COLUMN IF NOT EXISTS supplier_delivery_note_id integer
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rubber_roll_stock_customer_delivery_note_id
      ON rubber_roll_stock (customer_delivery_note_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rubber_roll_stock_supplier_delivery_note_id
      ON rubber_roll_stock (supplier_delivery_note_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_rubber_roll_stock_supplier_delivery_note_id");
    await queryRunner.query("DROP INDEX IF EXISTS idx_rubber_roll_stock_customer_delivery_note_id");
    await queryRunner.query(
      "ALTER TABLE rubber_roll_stock DROP COLUMN IF EXISTS supplier_delivery_note_id",
    );
    await queryRunner.query(
      "ALTER TABLE rubber_roll_stock DROP COLUMN IF EXISTS customer_delivery_note_id",
    );
  }
}
