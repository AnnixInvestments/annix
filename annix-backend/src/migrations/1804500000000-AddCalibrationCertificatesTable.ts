import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddCalibrationCertificatesTable1804500000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS calibration_certificates (
        id SERIAL PRIMARY KEY,
        company_id integer NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        equipment_name varchar(255) NOT NULL,
        equipment_identifier varchar(255),
        certificate_number varchar(255),
        file_path varchar(500) NOT NULL,
        original_filename varchar(255) NOT NULL,
        file_size_bytes bigint NOT NULL,
        mime_type varchar(100) NOT NULL,
        description text,
        expiry_date date NOT NULL,
        expiry_warning_sent_at timestamptz,
        expiry_notification_sent_at timestamptz,
        is_active boolean NOT NULL DEFAULT true,
        uploaded_by_id integer,
        uploaded_by_name varchar(255),
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_calibration_certs_company
        ON calibration_certificates (company_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_calibration_certs_expiry
        ON calibration_certificates (company_id, expiry_date)
        WHERE is_active = true
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS calibration_certificates");
  }
}
