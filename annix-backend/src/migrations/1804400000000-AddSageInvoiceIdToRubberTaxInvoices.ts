import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddSageInvoiceIdToRubberTaxInvoices1804400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_tax_invoices
      ADD COLUMN IF NOT EXISTS sage_invoice_id INTEGER,
      ADD COLUMN IF NOT EXISTS posted_to_sage_at TIMESTAMP;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_tax_invoices
      DROP COLUMN IF EXISTS sage_invoice_id,
      DROP COLUMN IF EXISTS posted_to_sage_at;
    `);
  }
}
