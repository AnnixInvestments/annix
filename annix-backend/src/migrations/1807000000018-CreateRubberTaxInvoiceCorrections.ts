import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateRubberTaxInvoiceCorrections1807000000018 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
			CREATE TABLE IF NOT EXISTS rubber_tax_invoice_corrections (
				id SERIAL PRIMARY KEY,
				tax_invoice_id INTEGER NOT NULL REFERENCES rubber_tax_invoices(id) ON DELETE CASCADE,
				supplier_name VARCHAR(255),
				field_name VARCHAR(50) NOT NULL,
				original_value TEXT,
				corrected_value TEXT NOT NULL,
				corrected_by VARCHAR(100),
				created_at TIMESTAMP NOT NULL DEFAULT NOW()
			)
		`);

    await queryRunner.query(`
			CREATE INDEX IF NOT EXISTS idx_rubber_tax_inv_corrections_supplier
			ON rubber_tax_invoice_corrections (supplier_name)
		`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS rubber_tax_invoice_corrections");
  }
}
