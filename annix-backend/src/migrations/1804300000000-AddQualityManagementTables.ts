import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddQualityManagementTables1804300000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS supplier_certificates (
        id SERIAL PRIMARY KEY,
        company_id integer NOT NULL REFERENCES stock_control_company(id) ON DELETE CASCADE,
        supplier_id integer NOT NULL REFERENCES stock_control_supplier(id) ON DELETE CASCADE,
        stock_item_id integer REFERENCES stock_items(id) ON DELETE SET NULL,
        job_card_id integer REFERENCES job_cards(id) ON DELETE SET NULL,
        certificate_type varchar(50) NOT NULL,
        batch_number varchar(255) NOT NULL,
        file_path varchar(500) NOT NULL,
        original_filename varchar(255) NOT NULL,
        file_size_bytes bigint NOT NULL,
        mime_type varchar(100) NOT NULL,
        description text,
        expiry_date date,
        uploaded_by_id integer,
        uploaded_by_name varchar(255),
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW(),
        UNIQUE(company_id, supplier_id, batch_number, certificate_type)
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_supplier_certificates_company_batch
      ON supplier_certificates(company_id, batch_number)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_supplier_certificates_company_supplier
      ON supplier_certificates(company_id, supplier_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_supplier_certificates_company_job_card
      ON supplier_certificates(company_id, job_card_id)
      WHERE job_card_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS issuance_batch_records (
        id SERIAL PRIMARY KEY,
        company_id integer NOT NULL REFERENCES stock_control_company(id) ON DELETE CASCADE,
        stock_issuance_id integer NOT NULL REFERENCES stock_issuances(id) ON DELETE CASCADE,
        stock_item_id integer NOT NULL REFERENCES stock_items(id) ON DELETE CASCADE,
        job_card_id integer REFERENCES job_cards(id) ON DELETE SET NULL,
        batch_number varchar(255) NOT NULL,
        quantity numeric(12,2) NOT NULL,
        supplier_certificate_id integer REFERENCES supplier_certificates(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_issuance_batch_records_company_job_card
      ON issuance_batch_records(company_id, job_card_id)
      WHERE job_card_id IS NOT NULL
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_issuance_batch_records_company_batch
      ON issuance_batch_records(company_id, batch_number)
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS job_card_data_books (
        id SERIAL PRIMARY KEY,
        company_id integer NOT NULL REFERENCES stock_control_company(id) ON DELETE CASCADE,
        job_card_id integer NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
        file_path varchar(500) NOT NULL,
        original_filename varchar(255) NOT NULL,
        file_size_bytes bigint NOT NULL,
        generated_at timestamptz NOT NULL,
        generated_by_name varchar(255),
        certificate_count integer NOT NULL,
        is_stale boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_job_card_data_books_company_job_card
      ON job_card_data_books(company_id, job_card_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS job_card_data_books");
    await queryRunner.query("DROP TABLE IF EXISTS issuance_batch_records");
    await queryRunner.query("DROP TABLE IF EXISTS supplier_certificates");
  }
}
