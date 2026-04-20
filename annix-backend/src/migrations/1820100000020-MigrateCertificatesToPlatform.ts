import type { MigrationInterface, QueryRunner } from "typeorm";

export class MigrateCertificatesToPlatform1820100000020 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS platform_certificates (
        id SERIAL PRIMARY KEY,
        company_id INT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
        source_module VARCHAR(30) NOT NULL,
        certificate_category VARCHAR(30) NOT NULL,
        certificate_number VARCHAR(100),
        batch_number VARCHAR(255),
        supplier_name VARCHAR(255),
        supplier_contact_id INT REFERENCES contacts(id) ON DELETE SET NULL,
        file_path VARCHAR(500),
        graph_pdf_path VARCHAR(500),
        original_filename VARCHAR(255),
        file_size_bytes BIGINT,
        mime_type VARCHAR(100),
        description TEXT,
        compound_code VARCHAR(100),
        production_date DATE,
        expiry_date DATE,
        processing_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
        extracted_data JSONB,
        review_notes TEXT,
        approved_by VARCHAR(255),
        approved_at TIMESTAMPTZ,
        uploaded_by_name VARCHAR(255),
        exported_to_sage_at TIMESTAMPTZ,
        linked_delivery_note_id INT,
        linked_calender_roll_coc_id INT,
        stock_item_id INT,
        job_card_id INT,
        order_number VARCHAR(100),
        ticket_number VARCHAR(100),
        version INT NOT NULL DEFAULT 1,
        previous_version_id INT,
        version_status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
        firebase_uid VARCHAR(100),
        legacy_sc_certificate_id INT,
        legacy_sc_calibration_id INT,
        legacy_rubber_coc_id INT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_platform_cert_company ON platform_certificates(company_id)
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_platform_cert_legacy_sc ON platform_certificates(legacy_sc_certificate_id) WHERE legacy_sc_certificate_id IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_platform_cert_legacy_rubber ON platform_certificates(legacy_rubber_coc_id) WHERE legacy_rubber_coc_id IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_platform_cert_compound ON platform_certificates(company_id, compound_code) WHERE compound_code IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS platform_certificates");
  }
}
