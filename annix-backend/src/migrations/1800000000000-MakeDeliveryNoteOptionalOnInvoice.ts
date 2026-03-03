import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeDeliveryNoteOptionalOnInvoice1800000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE supplier_invoices
      ALTER COLUMN delivery_note_id DROP NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_supplier_invoices_unlinked
      ON supplier_invoices (company_id)
      WHERE delivery_note_id IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS idx_supplier_invoices_unlinked
    `);

    await queryRunner.query(`
      ALTER TABLE supplier_invoices
      ALTER COLUMN delivery_note_id SET NOT NULL
    `);
  }
}
