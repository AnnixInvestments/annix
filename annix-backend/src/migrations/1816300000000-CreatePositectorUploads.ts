import type { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePositectorUploads1816300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS positector_uploads (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        original_filename VARCHAR(500) NOT NULL,
        s3_file_path VARCHAR(1000) NOT NULL,
        batch_name VARCHAR(500),
        probe_type VARCHAR(100),
        entity_type VARCHAR(50) NOT NULL,
        detected_format VARCHAR(50),
        header_data JSONB NOT NULL DEFAULT '{}',
        readings_data JSONB NOT NULL DEFAULT '[]',
        statistics_data JSONB,
        reading_count INTEGER NOT NULL DEFAULT 0,
        linked_job_card_id INTEGER,
        import_record_id INTEGER,
        imported_at TIMESTAMP WITH TIME ZONE,
        uploaded_by_name VARCHAR(255) NOT NULL,
        uploaded_by_id INTEGER,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_positector_uploads_company
      ON positector_uploads (company_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_positector_uploads_batch_name
      ON positector_uploads (company_id, batch_name)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_positector_uploads_linked_jc
      ON positector_uploads (company_id, linked_job_card_id)
      WHERE linked_job_card_id IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS positector_uploads");
  }
}
