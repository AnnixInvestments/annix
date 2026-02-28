import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateSupplierInvoiceTables1772000000000 implements MigrationInterface {
  name = "CreateSupplierInvoiceTables1772000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE delivery_notes
      ADD COLUMN IF NOT EXISTS extraction_status VARCHAR(50) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS extracted_data JSONB DEFAULT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS supplier_invoices (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        delivery_note_id INTEGER NOT NULL REFERENCES delivery_notes(id) ON DELETE CASCADE,
        invoice_number VARCHAR(100) NOT NULL,
        supplier_name VARCHAR(255) NOT NULL,
        invoice_date DATE,
        total_amount NUMERIC(12, 2),
        vat_amount NUMERIC(12, 2),
        scan_url TEXT,
        extraction_status VARCHAR(50) DEFAULT 'pending',
        extracted_data JSONB,
        approved_by INTEGER REFERENCES stock_control_users(id),
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_supplier_invoices_company_id ON supplier_invoices(company_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_supplier_invoices_delivery_note_id ON supplier_invoices(delivery_note_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_supplier_invoices_extraction_status ON supplier_invoices(extraction_status)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS supplier_invoice_items (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER NOT NULL REFERENCES supplier_invoices(id) ON DELETE CASCADE,
        company_id INTEGER NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        line_number INTEGER NOT NULL,
        extracted_description TEXT,
        extracted_sku VARCHAR(255),
        quantity INTEGER DEFAULT 1,
        unit_price NUMERIC(12, 2),
        match_status VARCHAR(50) DEFAULT 'unmatched',
        match_confidence NUMERIC(5, 2),
        stock_item_id INTEGER REFERENCES stock_items(id) ON DELETE SET NULL,
        is_part_a BOOLEAN DEFAULT FALSE,
        is_part_b BOOLEAN DEFAULT FALSE,
        linked_item_id INTEGER REFERENCES supplier_invoice_items(id) ON DELETE SET NULL,
        price_updated BOOLEAN DEFAULT FALSE,
        previous_price NUMERIC(12, 2),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_supplier_invoice_items_invoice_id ON supplier_invoice_items(invoice_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_supplier_invoice_items_stock_item_id ON supplier_invoice_items(stock_item_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_supplier_invoice_items_match_status ON supplier_invoice_items(match_status)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS invoice_clarifications (
        id SERIAL PRIMARY KEY,
        invoice_id INTEGER NOT NULL REFERENCES supplier_invoices(id) ON DELETE CASCADE,
        invoice_item_id INTEGER REFERENCES supplier_invoice_items(id) ON DELETE CASCADE,
        company_id INTEGER NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        clarification_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        question TEXT NOT NULL,
        context JSONB,
        selected_stock_item_id INTEGER REFERENCES stock_items(id) ON DELETE SET NULL,
        response_data JSONB,
        answered_by INTEGER REFERENCES stock_control_users(id),
        answered_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_invoice_clarifications_invoice_id ON invoice_clarifications(invoice_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_invoice_clarifications_status ON invoice_clarifications(status)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS stock_price_history (
        id SERIAL PRIMARY KEY,
        stock_item_id INTEGER NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
        company_id INTEGER NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        old_price NUMERIC(12, 2),
        new_price NUMERIC(12, 2) NOT NULL,
        change_reason VARCHAR(50) NOT NULL,
        reference_type VARCHAR(50),
        reference_id INTEGER,
        supplier_name VARCHAR(255),
        changed_by INTEGER REFERENCES stock_control_users(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_price_history_stock_item_id ON stock_price_history(stock_item_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_stock_price_history_company_id ON stock_price_history(company_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS stock_price_history`);
    await queryRunner.query(`DROP TABLE IF EXISTS invoice_clarifications`);
    await queryRunner.query(`DROP TABLE IF EXISTS supplier_invoice_items`);
    await queryRunner.query(`DROP TABLE IF EXISTS supplier_invoices`);
    await queryRunner.query(`
      ALTER TABLE delivery_notes
      DROP COLUMN IF EXISTS extraction_status,
      DROP COLUMN IF EXISTS extracted_data
    `);
  }
}
