import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateRubberDeliveryNoteCorrections1820100000037 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS rubber_delivery_note_corrections (
        id SERIAL PRIMARY KEY,
        delivery_note_id INTEGER NOT NULL REFERENCES rubber_delivery_notes(id) ON DELETE CASCADE,
        supplier_name VARCHAR(255),
        field_name VARCHAR(100) NOT NULL,
        original_value TEXT,
        corrected_value TEXT NOT NULL,
        corrected_by VARCHAR(100),
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_rubber_dn_corrections_supplier
      ON rubber_delivery_note_corrections (supplier_name)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS rubber_delivery_note_corrections");
  }
}
