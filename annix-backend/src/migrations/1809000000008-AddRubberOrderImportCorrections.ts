import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddRubberOrderImportCorrections1809000000008 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rubber_order_import_corrections (
        id SERIAL PRIMARY KEY,
        company_id INTEGER REFERENCES rubber_companies(id) ON DELETE CASCADE,
        company_name VARCHAR(255),
        field_name VARCHAR(100) NOT NULL,
        original_value TEXT,
        corrected_value TEXT NOT NULL,
        corrected_by VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rubber_order_import_corrections_company_name
        ON rubber_order_import_corrections (company_name)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS rubber_order_import_corrections");
  }
}
