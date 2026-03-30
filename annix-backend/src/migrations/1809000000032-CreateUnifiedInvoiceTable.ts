import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUnifiedInvoiceTable1809000000032 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS platform_invoices (
        id SERIAL PRIMARY KEY,
        company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        source_module VARCHAR(30) NOT NULL,
        invoice_type VARCHAR(20) NOT NULL DEFAULT 'SUPPLIER',
        invoice_number VARCHAR(100) NOT NULL,
        invoice_date DATE,
        supplier_name VARCHAR(255),
        supplier_contact_id INT REFERENCES contacts(id) ON DELETE SET NULL,
        total_amount DECIMAL(12,2),
        vat_amount DECIMAL(12,2),
        document_path VARCHAR(500),
        extraction_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        extracted_data JSONB,
        approved_by VARCHAR(255),
        approved_at TIMESTAMPTZ,
        exported_to_sage_at TIMESTAMPTZ,
        sage_invoice_id INT,
        posted_to_sage_at TIMESTAMPTZ,
        created_by VARCHAR(100),
        linked_delivery_note_ids JSONB,
        version INT NOT NULL DEFAULT 1,
        previous_version_id INT REFERENCES platform_invoices(id),
        version_status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        firebase_uid VARCHAR(100),
        legacy_sc_invoice_id INT,
        legacy_rubber_invoice_id INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pinv_company ON platform_invoices (company_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pinv_source_module ON platform_invoices (source_module)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pinv_legacy_sc
        ON platform_invoices (legacy_sc_invoice_id)
        WHERE legacy_sc_invoice_id IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_pinv_legacy_rubber
        ON platform_invoices (legacy_rubber_invoice_id)
        WHERE legacy_rubber_invoice_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS platform_invoices");
  }
}
