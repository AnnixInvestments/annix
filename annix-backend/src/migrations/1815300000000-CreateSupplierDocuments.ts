import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSupplierDocuments1815300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasCompanyTable = await queryRunner.query(`
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'stock_control_company'
    `);
    if (hasCompanyTable.length === 0) {
      return;
    }

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS sc_supplier_documents (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES stock_control_company(id) ON DELETE CASCADE,
        supplier_id INTEGER NOT NULL REFERENCES stock_control_supplier(id) ON DELETE CASCADE,
        doc_type VARCHAR(50) NOT NULL,
        doc_number VARCHAR(100),
        issued_at DATE,
        expires_at DATE,
        file_path VARCHAR(500) NOT NULL,
        original_filename VARCHAR(255) NOT NULL,
        file_size_bytes BIGINT NOT NULL,
        mime_type VARCHAR(100) NOT NULL,
        notes TEXT,
        uploaded_by_id INTEGER,
        uploaded_by_name VARCHAR(255),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sc_supplier_documents_company_supplier
        ON sc_supplier_documents(company_id, supplier_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_sc_supplier_documents_expires_at
        ON sc_supplier_documents(company_id, expires_at)
        WHERE expires_at IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP INDEX IF EXISTS idx_sc_supplier_documents_expires_at");
    await queryRunner.query("DROP INDEX IF EXISTS idx_sc_supplier_documents_company_supplier");
    await queryRunner.query("DROP TABLE IF EXISTS sc_supplier_documents");
  }
}
