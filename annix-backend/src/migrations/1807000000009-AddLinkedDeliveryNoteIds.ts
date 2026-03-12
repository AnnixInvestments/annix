import { MigrationInterface, QueryRunner } from "typeorm";

export class AddLinkedDeliveryNoteIds1807000000009 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE supplier_invoices
      ADD COLUMN IF NOT EXISTS linked_delivery_note_ids jsonb DEFAULT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE supplier_invoices
      DROP COLUMN IF EXISTS linked_delivery_note_ids
    `);
  }
}
