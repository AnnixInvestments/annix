import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRubberCocBatchCorrections1807000000059 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rubber_coc_batch_corrections (
        id SERIAL PRIMARY KEY,
        supplier_coc_id INTEGER NOT NULL REFERENCES rubber_supplier_cocs(id) ON DELETE CASCADE,
        compound_batch_id INTEGER NOT NULL REFERENCES rubber_compound_batches(id) ON DELETE CASCADE,
        supplier_name VARCHAR(255),
        compound_code VARCHAR(100),
        batch_number VARCHAR(100) NOT NULL,
        field_name VARCHAR(50) NOT NULL,
        original_value TEXT,
        corrected_value TEXT NOT NULL,
        corrected_by VARCHAR(100),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rubber_coc_batch_corrections_coc_id
      ON rubber_coc_batch_corrections(supplier_coc_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rubber_coc_batch_corrections_supplier_compound
      ON rubber_coc_batch_corrections(supplier_name, compound_code)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS rubber_coc_batch_corrections`);
  }
}
