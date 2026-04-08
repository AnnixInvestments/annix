import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreateQcBatchAssignments1816700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS qc_batch_assignments (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        batch_number VARCHAR(255) NOT NULL,
        field_key VARCHAR(50) NOT NULL,
        category VARCHAR(20) NOT NULL,
        label VARCHAR(100) NOT NULL,
        line_item_id INTEGER NOT NULL,
        job_card_id INTEGER NOT NULL,
        cpo_id INTEGER,
        positector_upload_id INTEGER,
        supplier_certificate_id INTEGER,
        not_applicable BOOLEAN NOT NULL DEFAULT false,
        captured_by_name VARCHAR(255) NOT NULL,
        captured_by_id INTEGER,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE qc_batch_assignments
          ADD CONSTRAINT uq_batch_assignment_item_field UNIQUE (line_item_id, field_key);
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_qc_batch_assignments_company
      ON qc_batch_assignments (company_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_qc_batch_assignments_job_card
      ON qc_batch_assignments (company_id, job_card_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_qc_batch_assignments_cpo
      ON qc_batch_assignments (company_id, cpo_id)
      WHERE cpo_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_qc_batch_assignments_batch
      ON qc_batch_assignments (company_id, batch_number)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS qc_environmental_batch_links (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        batch_assignment_id INTEGER NOT NULL REFERENCES qc_batch_assignments(id) ON DELETE CASCADE,
        environmental_record_id INTEGER NOT NULL REFERENCES qc_environmental_records(id) ON DELETE CASCADE,
        activity_date DATE NOT NULL,
        pull_rule VARCHAR(20) NOT NULL,
        resolved_date DATE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_qc_env_batch_links_assignment
      ON qc_environmental_batch_links (batch_assignment_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_qc_env_batch_links_env_record
      ON qc_environmental_batch_links (environmental_record_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS qc_environmental_batch_links");
    await queryRunner.query("DROP TABLE IF EXISTS qc_batch_assignments");
  }
}
