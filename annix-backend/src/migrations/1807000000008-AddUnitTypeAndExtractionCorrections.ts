import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUnitTypeAndExtractionCorrections1807000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE supplier_invoice_items
      ADD COLUMN IF NOT EXISTS unit_type varchar(50) DEFAULT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS invoice_extraction_corrections (
        id SERIAL PRIMARY KEY,
        company_id integer NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        supplier_name varchar(255) NOT NULL,
        invoice_item_id integer NOT NULL REFERENCES supplier_invoice_items(id) ON DELETE CASCADE,
        field_name varchar(50) NOT NULL,
        original_value text,
        corrected_value text NOT NULL,
        extracted_description text,
        corrected_by integer REFERENCES stock_control_users(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_extraction_corrections_supplier
      ON invoice_extraction_corrections (company_id, supplier_name)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS invoice_extraction_corrections");
    await queryRunner.query("ALTER TABLE supplier_invoice_items DROP COLUMN IF EXISTS unit_type");
  }
}
