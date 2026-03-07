import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRubberTaxInvoiceSageExport1801400000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_tax_invoices
      ADD COLUMN IF NOT EXISTS exported_to_sage_at timestamp NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE rubber_tax_invoices
      DROP COLUMN IF EXISTS exported_to_sage_at
    `);
  }
}
