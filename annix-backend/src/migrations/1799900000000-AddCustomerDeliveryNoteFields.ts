import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCustomerDeliveryNoteFields1799900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_delivery_notes
      ADD COLUMN IF NOT EXISTS customer_reference VARCHAR(200) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE rubber_delivery_note_items
      ADD COLUMN IF NOT EXISTS compound_type VARCHAR(100) NULL
    `);

    await queryRunner.query(`
      ALTER TABLE rubber_delivery_note_items
      ADD COLUMN IF NOT EXISTS quantity INT NULL
    `);

    await queryRunner.query(`
      ALTER TABLE rubber_delivery_note_items
      ADD COLUMN IF NOT EXISTS coc_batch_numbers JSONB NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_delivery_note_items
      DROP COLUMN IF EXISTS coc_batch_numbers
    `);

    await queryRunner.query(`
      ALTER TABLE rubber_delivery_note_items
      DROP COLUMN IF EXISTS quantity
    `);

    await queryRunner.query(`
      ALTER TABLE rubber_delivery_note_items
      DROP COLUMN IF EXISTS compound_type
    `);

    await queryRunner.query(`
      ALTER TABLE rubber_delivery_notes
      DROP COLUMN IF EXISTS customer_reference
    `);
  }
}
