import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateRubberTaxInvoicesTable1800800000000 implements MigrationInterface {
  name = "CreateRubberTaxInvoicesTable1800800000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rubber_tax_invoices (
        id SERIAL PRIMARY KEY,
        firebase_uid VARCHAR(100) NOT NULL UNIQUE,
        invoice_number VARCHAR(100) NOT NULL,
        invoice_date DATE,
        invoice_type VARCHAR(20) NOT NULL,
        company_id INT NOT NULL REFERENCES rubber_company(id),
        document_path VARCHAR(500),
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        extracted_data JSONB,
        total_amount DECIMAL(12,2),
        vat_amount DECIMAL(12,2),
        created_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rubber_tax_invoices_type_company
      ON rubber_tax_invoices (invoice_type, company_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_rubber_tax_invoices_type_company");
    await queryRunner.query("DROP TABLE IF EXISTS rubber_tax_invoices");
  }
}
