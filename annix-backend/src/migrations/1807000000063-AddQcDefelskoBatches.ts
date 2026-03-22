import { MigrationInterface, QueryRunner } from "typeorm";

export class AddQcDefelskoBatches1807000000063 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS qc_defelsko_batches (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        job_card_id INTEGER NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
        category VARCHAR(20) NOT NULL,
        field_key VARCHAR(50) NOT NULL,
        label VARCHAR(100) NOT NULL,
        batch_number VARCHAR(255),
        not_applicable BOOLEAN DEFAULT FALSE,
        captured_by_name VARCHAR(255) NOT NULL,
        captured_by_id INTEGER,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now(),
        UNIQUE(job_card_id, field_key)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS qc_defelsko_batches");
  }
}
