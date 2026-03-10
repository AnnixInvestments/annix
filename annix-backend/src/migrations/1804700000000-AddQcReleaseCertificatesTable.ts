import type { MigrationInterface, QueryRunner } from "typeorm";

export class AddQcReleaseCertificatesTable1804700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS qc_release_certificates (
        id SERIAL PRIMARY KEY,
        company_id integer NOT NULL REFERENCES stock_control_companies(id) ON DELETE CASCADE,
        job_card_id integer NOT NULL REFERENCES job_cards(id) ON DELETE CASCADE,
        certificate_number varchar(100),
        blasting_check jsonb,
        solutions_used jsonb NOT NULL DEFAULT '[]',
        lining_check jsonb,
        cure_cycles jsonb NOT NULL DEFAULT '[]',
        painting_checks jsonb NOT NULL DEFAULT '[]',
        final_inspection jsonb,
        comments text,
        certificate_date date,
        final_approval_name varchar(255),
        final_approval_signature_url text,
        final_approval_date date,
        captured_by_name varchar(255) NOT NULL,
        captured_by_id integer,
        created_at timestamptz NOT NULL DEFAULT NOW(),
        updated_at timestamptz NOT NULL DEFAULT NOW()
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_qc_release_certs_company_id
        ON qc_release_certificates (company_id)
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_qc_release_certs_job_card_id
        ON qc_release_certificates (job_card_id)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("DROP TABLE IF EXISTS qc_release_certificates");
  }
}
