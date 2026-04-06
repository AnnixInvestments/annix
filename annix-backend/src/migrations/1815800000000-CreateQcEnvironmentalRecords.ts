import { type MigrationInterface, type QueryRunner } from "typeorm";

export class CreateQcEnvironmentalRecords1815800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS qc_environmental_records (
        id SERIAL PRIMARY KEY,
        company_id INTEGER NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        job_card_id INTEGER NOT NULL,
        record_date DATE NOT NULL,
        humidity NUMERIC(5,1) NOT NULL,
        temperature_c NUMERIC(5,1) NOT NULL,
        dew_point_c NUMERIC(5,1),
        notes TEXT,
        recorded_by_name VARCHAR(255) NOT NULL,
        recorded_by_id INTEGER,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT UQ_env_record_company_job_date UNIQUE (company_id, job_card_id, record_date)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS qc_environmental_records");
  }
}
