import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCreditNoteFields1810700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_tax_invoices
      ADD COLUMN IF NOT EXISTS is_credit_note BOOLEAN NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      ALTER TABLE rubber_tax_invoices
      ADD COLUMN IF NOT EXISTS original_invoice_id INT NULL
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE rubber_tax_invoices
        ADD CONSTRAINT fk_rubber_tax_invoices_original_invoice
        FOREIGN KEY (original_invoice_id) REFERENCES rubber_tax_invoices(id) ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      ALTER TABLE rubber_tax_invoices
      ADD COLUMN IF NOT EXISTS credit_note_roll_numbers JSONB NOT NULL DEFAULT '[]'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_tax_invoices DROP CONSTRAINT IF EXISTS fk_rubber_tax_invoices_original_invoice
    `);
    await queryRunner.query(`
      ALTER TABLE rubber_tax_invoices DROP COLUMN IF EXISTS credit_note_roll_numbers
    `);
    await queryRunner.query(`
      ALTER TABLE rubber_tax_invoices DROP COLUMN IF EXISTS original_invoice_id
    `);
    await queryRunner.query(`
      ALTER TABLE rubber_tax_invoices DROP COLUMN IF EXISTS is_credit_note
    `);
  }
}
